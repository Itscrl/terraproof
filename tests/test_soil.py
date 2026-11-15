"""Synthetic rasters verify plumbing; they are not evidence of field accuracy."""

import json
from datetime import date, timedelta

import httpx
import numpy as np
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from rasterio.io import MemoryFile
from rasterio.transform import from_bounds

from terraproof import soil
from terraproof.api import create_app


def region(**kwargs):
    return soil.SoilRegion(west=10, south=10, east=10.001, north=10.001, **kwargs)


def raster_bytes(bounds, value=54, all_missing=False):
    width, height = bounds.grid()
    pixels = np.full((height, width), -32768 if all_missing else value, dtype="int16")
    with MemoryFile() as memory:
        with memory.open(
            driver="GTiff",
            width=width,
            height=height,
            count=1,
            dtype="int16",
            crs="EPSG:4326",
            nodata=-32768,
            transform=from_bounds(
                bounds.west, bounds.south, bounds.east, bounds.north, width, height
            ),
        ) as dataset:
            dataset.write(pixels, 1)
        return memory.read()


def test_global_selection_validation_and_bounded_sampling():
    assert region().grid() == (1, 1)
    assert soil.SoilRegion(west=-100, south=-20, east=-80, north=0).grid() == (64, 64)
    for values in (
        dict(west=179, east=-179, south=0, north=1),
        dict(west=0, east=31, south=0, north=1),
        dict(west=0, east=1, south=1, north=0),
        dict(west=0, east=1, south=85, north=86),
    ):
        with pytest.raises(ValidationError):
            soil.SoilRegion(**values)
    with pytest.raises(ValidationError):
        region(end_date=date.today() + timedelta(days=1))


def test_raster_units_bounds_mask_and_cache(tmp_path):
    bounds = region()
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(
            200, content=raster_bytes(bounds), headers={"Content-Type": "image/tiff"}
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        result = soil.map_property(client, bounds, "phh2o", tmp_path)
        assert result["status"] == "available"
        assert result["median"] == result["p10"] == result["p90"] == 5.4
        assert result["sampled_coverage_fraction"] == 1
        assert result["valid_samples"] == 1
        soil.map_property(client, bounds, "phh2o", tmp_path)
        assert len(calls) == 1
        assert calls[0].url.params["COVERAGE"] == "phh2o_0-5cm_mean"
        # A corrupted cache is fetched again, not trusted silently.
        next(tmp_path.glob("*.bin")).write_bytes(b"broken")
        assert soil.map_property(client, bounds, "phh2o", tmp_path)["median"] == 5.4
        assert len(calls) == 2


def test_missing_raster_and_xml_service_error(tmp_path):
    bounds = region()
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(200, content=raster_bytes(bounds, all_missing=True))
        )
    ) as client:
        result = soil.map_property(client, bounds, "soc", tmp_path / "missing")
        assert result["median"] is None and result["status"] == "unavailable"
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(
                200, content=b"<ServiceException>Unavailable</ServiceException>"
            )
        )
    ) as client:
        result = soil.map_property(client, bounds, "soc", tmp_path / "error")
        assert result["status"] == "unavailable"
        assert not (tmp_path / "error").exists()


def test_source_response_size_is_limited(tmp_path):
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(200, content=b"x" * (2 * 1024 * 1024 + 1))
        )
    ) as client:
        result = soil.map_property(client, region(), "soc", tmp_path)
        assert "2 MiB" in result["reason"]


def test_expired_provider_budget_uses_cache_but_does_not_start_network(monkeypatch, tmp_path):
    calls = []
    monkeypatch.setattr(soil, "monotonic", lambda: 100)
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda request: calls.append(request) or httpx.Response(200, json={"ok": True})
        )
    ) as client:
        url = "https://example.test/soil"
        body, _ = soil.acquire(client, url, {}, tmp_path)
        assert soil.acquire(client, url, {}, tmp_path, deadline=99)[0] == body
        with pytest.raises(soil.ClimateError, match="time limit"):
            soil.acquire(client, url, {"uncached": 1}, tmp_path, deadline=99)
    assert len(calls) == 1


def test_stream_crossing_provider_deadline_is_not_cached(monkeypatch, tmp_path):
    clock = [100]
    monkeypatch.setattr(soil, "monotonic", lambda: clock[0])

    class SlowStream(httpx.SyncByteStream):
        def __iter__(self):
            yield b'{"ok":'
            clock[0] = 126
            yield b"true}"

    with httpx.Client(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, stream=SlowStream()))
    ) as client:
        with pytest.raises(soil.ClimateError, match="time limit"):
            soil.acquire(client, "https://example.test/slow", {}, tmp_path, deadline=125)
    assert not list(tmp_path.glob("*.bin"))


def test_public_assessment_shares_one_deadline_across_all_sources(monkeypatch, tmp_path):
    deadlines = []
    monkeypatch.setenv("TERRAPROOF_PUBLIC_MODE", "1")
    monkeypatch.setattr(soil, "monotonic", lambda: 100)

    def missing(*args, deadline=None):
        deadlines.append(deadline)
        return {"status": "unavailable", "median": None, "reason": "Synthetic outage"}

    for name in ("map_property", "wetness_context", "laboratory_reference"):
        monkeypatch.setattr(soil, name, missing)
    result = soil.assess_region(region(), cache=tmp_path)
    assert deadlines == [135] * 13
    assert result["status"] == "unavailable"
    assert result["assessment"]["overall_quality_score"] is None


def test_nasa_missing_values_and_unit_contract(tmp_path):
    bounds = region(end_date=date(2025, 1, 20))
    payload = {
        "header": {"fill_value": -999, "time_standard": "LST"},
        "parameters": {
            key: {"units": unit}
            for key, unit in (
                ("GWETTOP", "1"),
                ("GWETROOT", "1"),
                ("TS", "C"),
                ("PRECTOTCORR", "mm/day"),
            )
        },
        "properties": {
            "parameter": {
                "GWETTOP": {"20250119": 1.2, "20250120": 0.4},
                "GWETROOT": {"20250120": -999},
                "TS": {"20250120": 27},
                "PRECTOTCORR": {"20250119": -1, "20250120": 0},
            }
        },
    }
    with httpx.Client(
        transport=httpx.MockTransport(lambda r: httpx.Response(200, json=payload))
    ) as client:
        result = soil.wetness_context(client, bounds, tmp_path / "valid")
        assert result["daily"][-1]["GWETTOP"] == 0.4
        assert result["daily"][-1]["GWETROOT"] is None
        assert result["daily"][-1]["PRECTOTCORR"] == 0
        assert result["daily"][-2]["GWETTOP"] is None
        assert result["daily"][-2]["PRECTOTCORR"] is None
        assert result["daily"][0]["GWETTOP"] is None
        payload["parameters"]["GWETTOP"]["units"] = "m^3/m^3"
        result = soil.wetness_context(client, bounds, tmp_path / "invalid")
        assert result["status"] == "unavailable"
        assert "Unexpected NASA unit" in result["reason"]


def test_api_partial_results_never_fabricate_score(monkeypatch, tmp_path):
    monkeypatch.setattr(
        soil,
        "map_property",
        lambda client, region, prop, cache, **kwargs: {
            "id": prop,
            "status": "available" if prop == "phh2o" else "unavailable",
            "median": 5.4 if prop == "phh2o" else None,
        },
    )
    monkeypatch.setattr(soil, "wetness_context", lambda *args, **kwargs: {"status": "unavailable"})
    monkeypatch.setattr(
        soil,
        "laboratory_reference",
        lambda *args, **kwargs: {"status": "no_compatible_observations", "observations": []},
    )
    with TestClient(create_app(tmp_path / "test.sqlite3")) as client:
        response = client.post("/api/soil/assess", json=region().model_dump(mode="json"))
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "partial"
        assert body["assessment"]["overall_quality_score"] is None
        assert body["wetness"]["status"] == "unavailable"
        assert client.post("/api/soil/assess", json={"west": 181}).status_code == 422
        assert "model confidence" not in json.dumps(body["properties"])


def test_hosted_mode_origin_and_private_record_boundaries(monkeypatch, tmp_path):
    monkeypatch.setenv("TERRAPROOF_ALLOWED_HOSTS", "soil.example.org,testserver")
    monkeypatch.setattr(
        soil,
        "map_property",
        lambda client, region, prop, cache, **kwargs: {
            "id": prop,
            "status": "unavailable",
            "median": None,
        },
    )
    monkeypatch.setattr(soil, "wetness_context", lambda *args, **kwargs: {"status": "unavailable"})
    monkeypatch.setattr(
        soil,
        "laboratory_reference",
        lambda *args, **kwargs: {"status": "no_compatible_observations", "observations": []},
    )
    with TestClient(create_app(tmp_path / "public.sqlite3", public_mode=True)) as client:
        assert client.get("/api/health").json()["public_mode"] is True
        assert client.get("/api/comparisons").status_code == 403
        assert client.post("/api/comparisons", json={}).status_code == 403
        assert client.delete("/api/comparisons/any").status_code == 403
        response = client.post(
            "https://soil.example.org/api/soil/assess",
            headers={"Origin": "https://soil.example.org"},
            json=region().model_dump(mode="json"),
        )
        assert response.status_code == 200
        assert (
            client.post(
                "/api/soil/assess",
                headers={"Origin": "https://untrusted.example"},
                json=region().model_dump(mode="json"),
            ).status_code
            == 403
        )
        assert client.get("https://untrusted.example/api/health").status_code == 400


def test_published_observations_preserve_methods_depth_and_licence(tmp_path):
    bounds = region()
    base = {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [10.0005, 10.0005]},
        "properties": {
            "profile_id": 1,
            "layer_id": 2,
            "value_avg": 3.0,
            "upper_depth": 0,
            "lower_depth": 12,
            "date": "2002-3-1",
            "dataset_id": "SYNTHETIC-TEST",
            "positional_uncertainty": "Circa 100 m",
            "licence": "CC BY 4.0 https://creativecommons.org/licenses/by/4.0/",
        },
    }
    import copy

    restricted, deep, outside = [copy.deepcopy(base) for _ in range(3)]
    restricted["properties"]["licence"] = "https://creativecommons.org/licenses/by-nc/4.0/"
    deep["properties"].update(upper_depth=30, lower_depth=60)
    outside["geometry"]["coordinates"] = [20, 20]
    payload = {"type": "FeatureCollection", "features": [base, base, restricted, deep, outside]}
    with httpx.Client(
        transport=httpx.MockTransport(lambda r: httpx.Response(200, json=payload))
    ) as client:
        result = soil.laboratory_reference(client, bounds, "phetol", tmp_path)
    assert result["status"] == "available"
    assert len(result["observations"]) == 1
    observation = result["observations"][0]
    assert observation["method"] == "phetol"
    assert observation["unit"] == "mg/kg" and observation["value"] == 3
    assert observation["sample_date"] == "2002-3-1"
    assert observation["lower_depth_cm"] == 12
    assert "not converted" in observation["depth_relation"]
    assert not result["possibly_truncated"]


def test_bulk_density_and_nitrogen_have_separate_scaling(tmp_path):
    bounds = region()
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda request: httpx.Response(200, content=raster_bytes(bounds, value=123))
        )
    ) as client:
        density = soil.map_property(client, bounds, "bdod", tmp_path)
        nitrogen = soil.map_property(client, bounds, "nitrogen", tmp_path)
    assert density["median"] == nitrogen["median"] == 1.23
    assert density["unit"] == "kg/dm³"
    assert nitrogen["unit"] == "g/kg"
