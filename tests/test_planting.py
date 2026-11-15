"""Synthetic tests establish contracts and arithmetic, not agricultural accuracy."""

import calendar
import json
from datetime import date, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from terraproof import planting, soil
from terraproof.api import create_app
from terraproof.climate import ClimateError


def request(**values):
    return planting.PlantingRequest(west=123.7, south=13.1, east=123.8, north=13.2, **values)


def weather(first=2023, last=2024, temperature=26, rain=3):
    rows, day = {}, date(first, 1, 1)
    while day <= date(last, 12, 31):
        rows[str(day)] = {
            "date": str(day),
            "T2M": temperature,
            "PRECTOTCORR": rain,
            "GWETROOT": 0.4,
        }
        day += timedelta(days=1)
    return rows


def test_crop_screen_unknowns_boundaries_and_no_yield_forecast():
    profile = planting.crop_catalog()["profiles"][0]
    history = {"rows": weather(), "first_year": 2023, "last_year": 2024}
    bounds = request(planting_month=12, planning_year=2027)
    result = planting.crop_screen(profile, {"median": 5}, history, bounds)
    assert result["checks"]["ph"] == "within_reference"  # inclusive documented boundary
    assert result["status"] == "reference_match"
    assert result["climate"]["complete_seasons"] == 1
    assert result["climate"]["seasons"][0]["end"].startswith("2024-")
    assert result["harvest_yield_prediction"] is None
    assert result["water_adequacy"] == "not_assessed"
    assert (
        planting.crop_screen(profile, {"median": None}, history, bounds)["status"] == "needs_data"
    )
    assert (
        planting.crop_screen(profile, {"median": 9}, history, bounds)["status"]
        == "outside_reference"
    )
    assert planting.range_check(4.7, profile["ph"]) == "local_review"


def test_incomplete_seasons_are_excluded_and_zero_rain_is_retained():
    profile = planting.crop_catalog()["profiles"][0]
    rows = weather(rain=0)
    complete = planting.season_summaries(rows, profile, 12, 2023, 2024)
    assert complete["rainfall_mm"]["median"] == 0
    assert complete["longest_dry_run_days"]["median"] == complete["reference_days"]
    rows["2024-01-15"]["PRECTOTCORR"] = None
    missing = planting.season_summaries(rows, profile, 12, 2023, 2024)
    assert missing["complete_seasons"] == 0 and missing["excluded_years"] == [2023]
    assert missing["rainfall_mm"]["median"] is None


def test_monthly_aggregation_uses_complete_months_and_correct_leap_days():
    rows = weather(rain=1)
    rows["2023-02-10"]["T2M"] = None
    february = planting.monthly_summary(rows, 2023, 2024)[1]
    assert february["complete_years"] == 1
    assert february["rainfall_mm"]["median"] == 29
    assert february["temperature_c"]["median"] == 26


def ncss_csv(year, variable="tas", value=300, latitude=13.125, unit=None, omit_last=False):
    units = unit or ("K" if variable == "tas" else "kg m-2 s-1")
    header = (
        'time,station,latitude[unit="degrees_north"],longitude[unit="degrees_east"],'
        f'{variable}[unit="{units}"]\n'
    )
    count = 366 if calendar.isleap(year) else 365
    if omit_last:
        count -= 1
    return (
        header
        + "\n".join(
            f"{date(year, 1, 1) + timedelta(days=i)}T12:00:00Z,point,{latitude},123.875,{value}"
            for i in range(count)
        )
    ).encode()


def test_nex_point_units_geometry_dates_and_small_csv_cache(tmp_path):
    bounds = request()
    with httpx.Client(
        transport=httpx.MockTransport(lambda r: httpx.Response(200, content=ncss_csv(2028)))
    ) as client:
        result = planting.nex_year(client, bounds, "ACCESS-CM2", "ssp245", 2028, "tas", tmp_path)
        assert len(result["values"]) == 366
        assert result["values"]["2028-02-29"] == pytest.approx(26.85)
        assert result["source_coordinate"] == [13.125, 123.875]
        assert result["provenance"]["bytes"] < 100000
        assert list((tmp_path / "snapshots").glob("*.bin"))
    for name, raw in (
        ("units", ncss_csv(2028, unit="C")),
        ("wrong-cell", ncss_csv(2028, latitude=30)),
        ("incomplete", ncss_csv(2028, omit_last=True)),
    ):
        with httpx.Client(
            transport=httpx.MockTransport(lambda r, raw=raw: httpx.Response(200, content=raw))
        ) as client:
            with pytest.raises(ClimateError):
                planting.nex_year(
                    client, bounds, "ACCESS-CM2", "ssp245", 2028, "tas", tmp_path / name
                )
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(200, content=ncss_csv(2027, "pr", 0.00001))
        )
    ) as client:
        result = planting.nex_year(
            client, bounds, "ACCESS-CM2", "ssp245", 2027, "pr", tmp_path / "rain"
        )
        assert result["values"]["2027-01-01"] == pytest.approx(0.864)


def test_future_models_remain_separate_and_fail_early(monkeypatch, tmp_path):
    calls = []

    def extract(client, region, model, scenario, year, variable, cache):
        calls.append((model, year, variable))
        if model == "ACCESS-CM2":
            raise ClimateError("Fixture source unavailable")
        count = 366 if calendar.isleap(year) else 365
        return {
            "model": model,
            "year": year,
            "variable": variable,
            "values": {
                str(date(year, 1, 1) + timedelta(days=i)): 26 if variable == "tas" else 3
                for i in range(count)
            },
            "provenance": {"url": "fixture", "bytes": 100},
            "source_coordinate": [13.125, 123.875],
        }

    monkeypatch.setattr(planting, "nex_year", extract)
    report = planting.assess_future(
        planting.FutureRequest(**request(planning_year=2027).model_dump()), tmp_path
    )
    first, second = report["models"]
    assert first["status"] == "unavailable" and second["status"] == "available"
    assert sum(model == "ACCESS-CM2" for model, _, _ in calls) == 2
    assert len(second["provenance"]) == 20
    assert second["crops"][0]["climate"]["complete_seasons"] == 9
    assert report["soil_health_forecast"] is None
    assert "probability" in report["limitations"][0]


def test_cache_expiry_refreshes_but_preserves_old_snapshot(monkeypatch, tmp_path):
    calls = []

    def handle(r):
        calls.append(r)
        return httpx.Response(200, json={"version": len(calls)})

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        first, _ = soil.acquire(client, "https://example.org/data", {}, tmp_path)
        monkeypatch.setenv("TERRAPROOF_CACHE_TTL_HOURS", "0")
        second, _ = soil.acquire(client, "https://example.org/data", {}, tmp_path)
    assert first != second
    assert len(list((tmp_path / "snapshots").glob("*.bin"))) == 2


def test_planting_api_validation_and_reference_versions(monkeypatch, tmp_path):
    monkeypatch.setattr(
        planting, "assess_planting", lambda request: {"scope": "fixture", "forecast": None}
    )
    with TestClient(create_app(tmp_path / "test.sqlite3")) as client:
        assert len(client.get("/api/planting/crops").json()["profiles"]) == 7
        assert (
            client.post("/api/planting/assess", json=request().model_dump(mode="json")).json()[
                "forecast"
            ]
            is None
        )
        values = request().model_dump(mode="json")
        values["planting_month"] = 13
        assert client.post("/api/planting/assess", json=values).status_code == 422
        assert client.get("/api/places/search?q=a").status_code == 422
    with pytest.raises(ValidationError):
        planting.FutureRequest(**request(planning_year=2091).model_dump())


def test_place_lookup_filters_invalid_coordinates_and_identifies_app(monkeypatch):
    from terraproof import places

    def acquire(client, url, params, cache):
        assert "TerraProof" in client.headers["User-Agent"]
        assert params["limit"] == 5 and params["q"] == "Albay"
        return json.dumps(
            [
                {"lat": "13.1", "lon": "123.7", "display_name": "Albay"},
                {"lat": "NaN", "lon": "123.7", "display_name": "Invalid"},
            ]
        ).encode(), {"sha256": "fixture"}

    monkeypatch.setattr(places, "acquire", acquire)
    monkeypatch.setattr(places, "_last_request", 0)
    report = places.search_places(" Albay ")
    assert len(report["places"]) == 1 and report["places"][0]["label"] == "Albay"
