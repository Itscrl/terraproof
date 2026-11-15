"""Bounded regional soil-map extracts and NASA wetness context.

SoilGrids is an existing published prediction model, not a model trained here.
Regional map variation, model uncertainty and recent moisture are distinct evidence.
"""

import hashlib
import json
import math
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import httpx
import numpy as np
from pydantic import Field, model_validator
from rasterio.io import MemoryFile

from .climate import DATA, ENDPOINT, ClimateError
from .models import Contract

WCS = "https://maps.isric.org/mapserv"
PROPERTIES = {
    "phh2o": ("Soil pH in water", "pH", 10),
    "soc": ("Soil organic carbon", "g/kg", 10),
    "clay": ("Clay", "%", 10),
    "sand": ("Sand", "%", 10),
    "silt": ("Silt", "%", 10),
    "cec": ("Cation exchange capacity", "cmol(c)/kg", 10),
    "bdod": ("Bulk density", "kg/dm³", 100),
    "nitrogen": ("Total nitrogen", "g/kg", 100),
}
OBSERVATIONS = {
    "phetol": ("Extractable phosphorus — Olsen", "mg/kg"),
    "phetb1": ("Extractable phosphorus — Bray I", "mg/kg"),
    "phetm3": ("Extractable phosphorus — Mehlich 3", "mg/kg"),
    "elcosp": ("Electrical conductivity — saturated paste", "dS/m"),
}


class SoilRegion(Contract):
    west: float = Field(ge=-180, le=180)
    south: float = Field(ge=-85, le=85)
    east: float = Field(ge=-180, le=180)
    north: float = Field(ge=-85, le=85)
    depth: str = Field(default="0-5cm", pattern=r"^(0-5cm|5-15cm|15-30cm)$")
    end_date: date = Field(default_factory=lambda: datetime.now(UTC).date() - timedelta(days=7))

    @model_validator(mode="after")
    def valid_region(self):
        if self.west >= self.east or self.south >= self.north:
            raise ValueError("West must precede east and south must precede north")
        if self.east - self.west > 30 or self.north - self.south > 30:
            raise ValueError(
                "Select a region within 30° per side; split larger or dateline selections"
            )
        if not date(1981, 1, 14) <= self.end_date <= datetime.now(UTC).date() - timedelta(days=3):
            raise ValueError("End date must be from 1981-01-14 through at least 3 days ago")
        return self

    def grid(self):
        middle = math.radians((self.south + self.north) / 2)
        width = (self.east - self.west) * 111.32 * math.cos(middle)
        height = (self.north - self.south) * 111.32
        return max(1, min(64, math.floor(width / 0.25))), max(1, min(64, math.floor(height / 0.25)))


def acquire(client: httpx.Client, url: str, params: dict, cache: Path, *, allow_ncss_csv=False):
    """Archive small responses only. Fixed requests reuse the same source snapshot."""
    key = hashlib.sha256(json.dumps([url, params], sort_keys=True).encode()).hexdigest()
    body_path, meta_path = cache / f"{key}.bin", cache / f"{key}.json"
    if body_path.exists() and meta_path.exists():
        try:
            if body_path.stat().st_size <= 2 * 1024 * 1024:
                body, meta = body_path.read_bytes(), json.loads(meta_path.read_text())
                retrieved = datetime.fromisoformat(meta["retrieved_at"])
                age_hours = (datetime.now(UTC) - retrieved).total_seconds() / 3600
                ttl_hours = float(os.getenv("TERRAPROOF_CACHE_TTL_HOURS", "720"))
                valid_hash = hashlib.sha256(body).hexdigest() == meta["sha256"]
                if 0 <= age_hours < ttl_hours and valid_hash:
                    return body, meta
        except (OSError, ValueError, KeyError, TypeError):
            pass  # Reacquire a damaged cache; never serve it as a valid snapshot.
    with client.stream("GET", url, params=params) as response:
        response.raise_for_status()
        chunks, size = [], 0
        for block in response.iter_bytes():
            size += len(block)
            if size > 2 * 1024 * 1024:
                raise ClimateError(
                    "Source exceeds the 2 MiB response limit; select a smaller region"
                )
            chunks.append(block)
        body = b"".join(chunks)
        meta = {
            "url": str(response.url),
            "sha256": hashlib.sha256(body).hexdigest(),
            "bytes": len(body),
            "retrieved_at": datetime.now(UTC).isoformat(),
        }
    # Cache only actual TIFF/JSON responses, never an XML service error returned with HTTP 200.
    ncss_csv = allow_ncss_csv and body.startswith(b'time,station,latitude[unit="degrees_north"]')
    if body[:4] not in (b"II*\x00", b"MM\x00*") and not ncss_csv:
        json.loads(body)
    cache.mkdir(parents=True, exist_ok=True)
    # Content-addressed snapshots keep an older scientific source auditable after refresh.
    snapshots = cache / "snapshots"
    snapshots.mkdir(exist_ok=True)
    archive = snapshots / f"{key}-{meta['sha256']}"
    if not archive.with_suffix(".bin").exists():
        archive.with_suffix(".bin").write_bytes(body)
        archive.with_suffix(".json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    temporary_body = cache / f"{key}-{uuid4().hex}.tmp"
    temporary_meta = cache / f"{key}-{uuid4().hex}.tmp"
    temporary_body.write_bytes(body)
    temporary_meta.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    temporary_body.replace(body_path)
    temporary_meta.replace(meta_path)
    return body, meta


def weighted_quantile(values, weights, quantile):
    order = np.argsort(values)
    cumulative = np.cumsum(weights[order])
    index = np.searchsorted(cumulative, quantile * cumulative[-1])
    return float(values[order[min(index, len(order) - 1)]])


def map_property(client, region, prop, cache):
    label, unit, divisor = PROPERTIES[prop]
    width, height = region.grid()
    result = {"id": prop, "label": label, "unit": unit, "depth": region.depth}
    try:
        body, provenance = acquire(
            client,
            WCS,
            {
                "map": f"/map/{prop}.map",
                "SERVICE": "WCS",
                "VERSION": "1.0.0",
                "REQUEST": "GetCoverage",
                "COVERAGE": f"{prop}_{region.depth}_mean",
                "CRS": "EPSG:4326",
                "BBOX": f"{region.west},{region.south},{region.east},{region.north}",
                "WIDTH": width,
                "HEIGHT": height,
                "FORMAT": "GEOTIFF_INT16",
            },
            cache,
        )
        with MemoryFile(body) as memory, memory.open() as source:
            if source.count != 1 or source.width != width or source.height != height:
                raise ClimateError("Unexpected raster dimensions")
            if source.crs is None or source.crs.to_epsg() != 4326:
                raise ClimateError("Unexpected raster coordinate system")
            if not np.allclose(
                list(source.bounds),
                [region.west, region.south, region.east, region.north],
                atol=1e-5,
            ):
                raise ClimateError("Source raster does not match selected bounds")
            raw = source.read(1, masked=True)
            mask = ~np.ma.getmaskarray(raw) & np.isfinite(raw.data) & (raw.data >= 0)
            values = raw.data.astype(float) / divisor
            if not mask.any():
                raise ClimateError("No mapped soil values in this selection")
            latitude = (
                region.north - (np.arange(height) + 0.5) * (region.north - region.south) / height
            )
            weights = np.broadcast_to(np.cos(np.deg2rad(latitude))[:, None], values.shape)
            result.update(
                status="available",
                median=weighted_quantile(values[mask], weights[mask], 0.5),
                p10=weighted_quantile(values[mask], weights[mask], 0.1),
                p90=weighted_quantile(values[mask], weights[mask], 0.9),
                valid_samples=int(mask.sum()),
                total_samples=width * height,
                sampled_coverage_fraction=float(weights[mask].sum() / weights.sum()),
                grid={"width": width, "height": height},
                provenance=provenance,
            )
    except (httpx.HTTPError, ValueError, OSError, RuntimeError) as exc:
        result.update(status="unavailable", reason=str(exc), median=None, p10=None, p90=None)
    return result


def wetness_context(client, region, cache):
    start = region.end_date - timedelta(days=13)
    lat, lon = (region.south + region.north) / 2, (region.west + region.east) / 2
    try:
        body, provenance = acquire(
            client,
            ENDPOINT,
            {
                "parameters": "GWETTOP,GWETROOT,TS,PRECTOTCORR",
                "community": "AG",
                "latitude": lat,
                "longitude": lon,
                "start": start.strftime("%Y%m%d"),
                "end": region.end_date.strftime("%Y%m%d"),
                "format": "JSON",
                "time-standard": "LST",
            },
            cache,
        )
        payload = json.loads(body)
        if payload["header"].get("time_standard") != "LST":
            raise ClimateError("NASA wetness dates must use requested local solar time")
        parameters = payload["properties"]["parameter"]
        fill = payload["header"].get("fill_value", -999)
        units = payload["parameters"]
        expected = {
            "GWETTOP": {"1", "fraction"},
            "GWETROOT": {"1", "fraction"},
            "TS": {"C"},
            "PRECTOTCORR": {"mm/day"},
        }
        for name, allowed in expected.items():
            if units[name]["units"] not in allowed:
                raise ClimateError(f"Unexpected NASA unit for {name}: {units[name]['units']}")
        rows = []
        for i in range(14):
            day = start + timedelta(days=i)
            row = {"date": str(day)}
            for name in expected:
                value = parameters[name].get(day.strftime("%Y%m%d"))
                value = None if value is None or value == fill else float(value)
                # Enforce parameter definitions, not uncited agronomic/extreme-event cutoffs.
                if value is not None and (
                    not math.isfinite(value)
                    or (name.startswith("GWET") and not 0 <= value <= 1)
                    or (name == "PRECTOTCORR" and value < 0)
                ):
                    value = None
                row[name] = value
            rows.append(row)
        return {
            "status": "available",
            "start": str(start),
            "end": str(region.end_date),
            "requested_point": {"latitude": lat, "longitude": lon},
            "returned_geometry": payload.get("geometry"),
            "header": payload["header"],
            "parameters": units,
            "daily": rows,
            "provenance": provenance,
            "spatial_support": "Centroid context only; 0.5° × 0.625° grid, not a regional average",
        }
    except (httpx.HTTPError, ValueError, KeyError, TypeError, OSError) as exc:
        return {"status": "unavailable", "reason": str(exc)}


def laboratory_reference(client, region, method, cache):
    """Return compatible historical point observations, never fill regional raster gaps.

    Only explicitly CC-BY-licensed records are returned. Provider coverage is sparse;
    overlapping horizons are disclosed rather than converted into exact-depth tests.
    """
    label, unit = OBSERVATIONS[method]
    result = {"id": method, "label": label, "unit": unit, "observations": []}
    try:
        body, provenance = acquire(
            client,
            "https://maps.isric.org/mapserv/wosis_latest",
            {
                "SERVICE": "WFS",
                "VERSION": "1.0.0",
                "REQUEST": "GetFeature",
                "TYPENAME": f"ms:wosis_latest_{method}",
                "MAXFEATURES": 64,
                "OUTPUTFORMAT": "geojson",
                "SRSNAME": "EPSG:4326",
                "BBOX": f"{region.west},{region.south},{region.east},{region.north}",
            },
            cache,
        )
        payload = json.loads(body)
        if payload.get("type") != "FeatureCollection" or not isinstance(
            payload.get("features"), list
        ):
            raise ClimateError("Expected a WoSIS point FeatureCollection")
        features = payload["features"]
        if len(features) > 64:
            raise ClimateError("WoSIS response exceeds the bounded observation request")
        top, bottom = (int(v) for v in region.depth.replace("cm", "").split("-"))
        seen, accepted = set(), []
        for feature in features:
            try:
                props, geometry = feature["properties"], feature["geometry"]
                if geometry["type"] != "Point":
                    continue
                lon, lat = geometry["coordinates"][:2]
                if not region.west <= lon <= region.east or not region.south <= lat <= region.north:
                    continue
                licence = str(props.get("licence", ""))
                if "/licenses/by/" not in licence.lower() or "by-nc" in licence.lower():
                    continue
                upper, lower = float(props["upper_depth"]), float(props["lower_depth"])
                value = float(props["value_avg"])
                if not all(math.isfinite(v) for v in (upper, lower, value, lon, lat)):
                    continue
                if value < 0 or upper >= bottom or lower <= top or upper >= lower:
                    continue
                identity = (props["profile_id"], props["layer_id"])
                if identity in seen:
                    continue
                seen.add(identity)
                accepted.append(
                    {
                        "profile_id": props["profile_id"],
                        "layer_id": props["layer_id"],
                        "source_dataset": props.get("dataset_id"),
                        "value": value,
                        "unit": unit,
                        "method": method,
                        "longitude": lon,
                        "latitude": lat,
                        "upper_depth_cm": upper,
                        "lower_depth_cm": lower,
                        "sample_date": props.get("date"),
                        "licence": licence,
                        "positional_uncertainty": props.get("positional_uncertainty"),
                        "depth_relation": "Overlapping horizon; not converted to map depth",
                    }
                )
            except (KeyError, TypeError, ValueError):
                continue
        result.update(
            status="available" if accepted else "no_compatible_observations",
            observations=accepted,
            returned_candidates=len(features),
            possibly_truncated=len(features) == 64,
            provenance=provenance,
            limitation=(
                "Historical point samples, not regional current conditions; methods are separate. "
                "WoSIS may overlap SoilGrids training data and is not independent validation."
            ),
        )
    except (httpx.HTTPError, ValueError, KeyError, TypeError, OSError) as exc:
        result.update(status="unavailable", reason=str(exc))
    return result


def assess_region(region: SoilRegion, cache: Path | None = None):
    cache = cache or DATA / "cache" / "soil"
    with httpx.Client(timeout=45, follow_redirects=True) as client:
        with ThreadPoolExecutor(max_workers=3) as executor:
            jobs = [
                executor.submit(map_property, client, region, prop, cache) for prop in PROPERTIES
            ]
            moisture = executor.submit(wetness_context, client, region, cache)
            observations = [
                executor.submit(laboratory_reference, client, region, method, cache)
                for method in OBSERVATIONS
            ]
            properties = [job.result() for job in jobs]
            context = moisture.result()
            references = [job.result() for job in observations]
    available = sum(prop["status"] == "available" for prop in properties)
    return {
        "schema": "regional-soil-v1",
        "region": region.model_dump(mode="json"),
        "created_at": datetime.now(UTC).isoformat(),
        "status": "available"
        if available == len(properties)
        else ("partial" if available else "unavailable"),
        "properties": properties,
        "wetness": context,
        "laboratory_references": references,
        "assessment": {
            "title": "Mapped soil profile and recent wetness context",
            "model": "ISRIC SoilGrids 2.0 published soil-property predictions",
            "source": "https://doi.org/10.5194/soil-7-217-2021",
            "native_soil_grid_m": 250,
            "statistics": (
                "Latitude-area-weighted median and spatial 10th–90th percentiles of samples"
            ),
            "uncertainty": "Spatial range is not model confidence; model quantiles not retrieved",
            "overall_quality_score": None,
            "limitations": [
                "Mapped estimates are not laboratory tests; soil chemistry is not live imagery.",
                "Up to 64 × 64 samples per layer; wide selections use coarse sampling.",
                "Coverage is a sampled valid-value fraction, not verified land area coverage.",
                "POWER supplies centroid relative wetness, not volumetric moisture or fertility.",
                "Quality grades and fertilizer prescriptions require validated local criteria.",
                "Available N/P/K, salinity, contaminants and biology need additional measurements.",
            ],
        },
    }
