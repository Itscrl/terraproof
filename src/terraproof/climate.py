"""NASA POWER ingestion with immutable raw payloads and explicit missing values."""

import hashlib
import json
import os
import time
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import httpx

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(os.environ.get("TERRAPROOF_DATA_DIR", ROOT / "data"))
ENDPOINT = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = ("T2M_MAX", "T2M_MIN", "PRECTOTCORR")


class ClimateError(ValueError):
    """A source is unavailable or cannot safely be used."""


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ClimateError(f"Duplicate source key: {key}")
        result[key] = value
    return result


def read_snapshot(path: Path) -> dict:
    try:
        snapshot = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_keys)
        for key in ("payload", "retrieved_at", "request_url", "request"):
            if key not in snapshot:
                raise ClimateError(f"Snapshot lacks {key}")
        if snapshot["payload"]["header"].get("time_standard") != "LST":
            raise ClimateError("Snapshot must use local solar time (LST)")
        return snapshot
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ClimateError(
            "Climate snapshot is invalid; restore or reacquire the source file"
        ) from exc


def days_between(start: date, end: date):
    for offset in range((end - start).days + 1):
        yield start + timedelta(days=offset)


def normalize(payload: dict, start: date, end: date) -> tuple[list[dict], dict]:
    try:
        parameters = payload["properties"]["parameter"]
        fill = payload["header"].get("fill_value", -999)
        units = payload["parameters"]
        for key in PARAMETERS:
            expected = {"C"} if key != "PRECTOTCORR" else {"mm/day"}
            if units[key]["units"] not in expected:
                raise ClimateError(f"Unexpected source unit for {key}: {units[key]['units']}")
        rows = []
        issues = []
        for day in days_between(start, end):
            values = {}
            flags = []
            for key in PARAMETERS:
                raw = parameters[key].get(day.strftime("%Y%m%d"))
                value = None if raw is None or raw == fill else float(raw)
                if value is not None:
                    bounds = (0, 2000) if key == "PRECTOTCORR" else (-90, 65)
                    if not bounds[0] <= value <= bounds[1]:
                        flags.append(f"{key}:outside_validation_range")
                        value = None
                if value is None:
                    flags.append(f"{key}:missing")
                values[key] = value
            if (
                values["T2M_MIN"] is not None
                and values["T2M_MAX"] is not None
                and values["T2M_MIN"] > values["T2M_MAX"]
            ):
                flags.append("temperature:inconsistent_min_max")
                values["T2M_MIN"] = values["T2M_MAX"] = None
            row = {
                "date": day.isoformat(),
                "tmax_c": values["T2M_MAX"],
                "tmin_c": values["T2M_MIN"],
                "rain_mm": values["PRECTOTCORR"],
                "quality_flags": flags,
            }
            rows.append(row)
            if flags:
                issues.append({"date": row["date"], "flags": flags})
    except (KeyError, TypeError, ValueError) as exc:
        raise ClimateError(f"Invalid NASA POWER payload: {exc}") from exc
    return rows, {
        "expected_days": len(rows),
        "flagged_days": len(issues),
        "issues": issues,
        "imputation": "none",
        "range_checks": "engineering plausibility, not crop limits",
    }


def fetch_power(latitude: float, longitude: float, start: date, end: date) -> dict:
    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "latitude": latitude,
        "longitude": longitude,
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "format": "JSON",
        "time-standard": "LST",
    }
    for attempt in range(3):
        try:
            response = httpx.get(ENDPOINT, params=params, timeout=90, follow_redirects=True)
            response.raise_for_status()
            payload = json.loads(response.text, object_pairs_hook=unique_keys)
            if payload["header"].get("time_standard") != "LST":
                raise ClimateError("NASA response does not use the requested LST day boundary")
            normalize(payload, start, end)
            return {
                "payload": payload,
                "retrieved_at": datetime.now(UTC).isoformat(),
                "request_url": str(response.url),
                "request": params,
            }
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            if attempt == 2:
                raise ClimateError(
                    "NASA POWER request failed; use bundled data or retry later"
                ) from exc
            time.sleep(2**attempt)
    raise AssertionError("unreachable")


def save_snapshot(snapshot: dict, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, indent=2)
    temporary = path.with_suffix(f".{uuid4().hex}.tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def load_climate(request) -> tuple[list[dict], dict, dict]:
    start, end = date(request.start_year, 1, 1), date(request.end_year + 1, 12, 31)
    if request.source == "bundled":
        path = ROOT / "data" / "reference" / "albay-power-2015-2025.json"
        if not path.exists():
            raise ClimateError("Bundled snapshot missing. Run terraproof fetch-pilot first.")
        snapshot = read_snapshot(path)
    else:
        key = hashlib.sha256(
            f"{request.latitude},{request.longitude},{start},{end},LST,v1".encode()
        ).hexdigest()
        path = DATA / "cache" / f"{key}.json"
        if path.exists():
            snapshot = read_snapshot(path)
        else:
            snapshot = fetch_power(request.latitude, request.longitude, start, end)
            save_snapshot(snapshot, path)
    payload = snapshot["payload"]
    rows, quality = normalize(payload, start, end)
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    provenance = {
        "dataset": "NASA POWER daily meteorology",
        "sha256": digest,
        "retrieved_at": snapshot["retrieved_at"],
        "request_url": snapshot["request_url"],
        "header": payload["header"],
        "geometry": payload.get("geometry"),
        "parameters": payload["parameters"],
        "time_standard": "LST",
        "source_mode": request.source,
        "spatial_resolution": "0.5° × 0.625° meteorology",
        "spatial_method": "POWER point lookup; gridded estimate, not a field measurement",
    }
    return rows, quality, provenance
