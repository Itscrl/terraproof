"""Traceable crop screening, historical seasons and bounded NASA climate scenarios.

This is an explicit reference-range screen, not a calibrated suitability/yield model.
Climate scenarios are free-running simulations, never a forecast of a future season.
"""

import calendar
import csv
import hashlib
import io
import json
import math
import statistics
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from threading import BoundedSemaphore
from typing import Literal

import httpx
from pydantic import Field

from .climate import DATA, ENDPOINT, ROOT, ClimateError
from .soil import SoilRegion, acquire, map_property

CATALOG_PATH = ROOT / "data/reference/crop-requirements-v1.json"
NEX = "https://ds.nccs.nasa.gov/thredds/ncss/grid/AMES/NEX/GDDP-CMIP6"
NEX_MODELS = ("ACCESS-CM2", "MRI-ESM2-0")
FUTURE_SLOTS = BoundedSemaphore(1)


class PlantingRequest(SoilRegion):
    planting_month: int = Field(default=6, ge=1, le=12)
    planning_year: int = Field(default_factory=lambda: datetime.now(UTC).year + 1, ge=2026, le=2090)
    water_supply: Literal["unknown", "rainfed", "irrigation"] = "unknown"
    priority: Literal["reference_fit", "shorter_season", "legume_options"] = "reference_fit"


class FutureRequest(PlantingRequest):
    planning_year: int = Field(default_factory=lambda: datetime.now(UTC).year + 1, ge=2027, le=2090)
    scenario: Literal["ssp245", "ssp585"] = "ssp245"


def crop_catalog():
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def finite_value(value, fill=-999, *, minimum=None, maximum=None):
    if value is None or value == fill:
        return None
    number = float(value)
    if not math.isfinite(number):
        return None
    if minimum is not None and number < minimum:
        return None
    if maximum is not None and number > maximum:
        return None
    return number


def power_history(client, region, cache):
    """Ten complete prior years, split into five-year requests; missing days stay missing."""
    last = datetime.now(UTC).year - 1
    first = last - 9
    rows, sources, failures = {}, [], []
    for start_year in (first, first + 5):
        end_year = start_year + 4
        try:
            body, provenance = acquire(
                client,
                ENDPOINT,
                {
                    "parameters": "T2M,T2M_MIN,T2M_MAX,PRECTOTCORR,GWETROOT",
                    "community": "AG",
                    "latitude": (region.north + region.south) / 2,
                    "longitude": (region.west + region.east) / 2,
                    "start": f"{start_year}0101",
                    "end": f"{end_year}1231",
                    "format": "JSON",
                    "time-standard": "LST",
                },
                cache,
            )
            payload = json.loads(body)
            if payload["header"].get("time_standard") != "LST":
                raise ClimateError("Expected NASA local-solar-time dates")
            expected = {
                "T2M": {"C"},
                "T2M_MIN": {"C"},
                "T2M_MAX": {"C"},
                "PRECTOTCORR": {"mm/day"},
                "GWETROOT": {"1", "fraction"},
            }
            for key, units in expected.items():
                if payload["parameters"][key]["units"] not in units:
                    raise ClimateError(f"Unexpected NASA history units for {key}")
            parameters = payload["properties"]["parameter"]
            fill = payload["header"].get("fill_value", -999)
            day = date(start_year, 1, 1)
            while day <= date(end_year, 12, 31):
                stamp = day.strftime("%Y%m%d")
                row = {"date": str(day)}
                for key in expected:
                    row[key] = finite_value(
                        parameters[key].get(stamp),
                        fill,
                        minimum=0 if key in {"PRECTOTCORR", "GWETROOT"} else None,
                        maximum=1 if key == "GWETROOT" else None,
                    )
                rows[str(day)] = row
                day += timedelta(days=1)
            sources.append({**provenance, "header": payload["header"]})
        except (httpx.HTTPError, ValueError, KeyError, TypeError, OSError) as exc:
            failures.append({"years": [start_year, end_year], "reason": str(exc)})
    return {
        "status": "available" if not failures else ("partial" if rows else "unavailable"),
        "first_year": first,
        "last_year": last,
        "rows": rows,
        "provenance": sources,
        "failures": failures,
        "spatial_support": "One centroid cell, about 0.5° × 0.625°; not a farm weather station",
    }


def numeric_summary(values):
    return (
        {"median": statistics.median(values), "min": min(values), "max": max(values)}
        if values
        else {"median": None, "min": None, "max": None}
    )


def monthly_summary(rows, first_year, last_year):
    result = []
    for month in range(1, 13):
        temperatures, rainfall = [], []
        for year in range(first_year, last_year + 1):
            count = calendar.monthrange(year, month)[1]
            days = [rows.get(str(date(year, month, day))) for day in range(1, count + 1)]
            if any(row is None or row.get("T2M") is None for row in days):
                continue
            if any(row.get("PRECTOTCORR") is None for row in days):
                continue
            temperatures.append(statistics.mean(row["T2M"] for row in days))
            rainfall.append(sum(row["PRECTOTCORR"] for row in days))
        result.append(
            {
                "month": month,
                "complete_years": len(temperatures),
                "temperature_c": numeric_summary(temperatures),
                "rainfall_mm": numeric_summary(rainfall),
            }
        )
    return result


def season_summaries(rows, profile, month, first_year, last_year):
    # An explicitly disclosed reference window, not estimated thermal-time maturity.
    duration = round(statistics.mean(profile["indicative_days"]))
    seasons, excluded = [], []
    for year in range(first_year, last_year):
        start = date(year, month, 1)
        days = [rows.get(str(start + timedelta(days=i))) for i in range(duration)]
        if any(
            row is None or row.get("T2M") is None or row.get("PRECTOTCORR") is None for row in days
        ):
            excluded.append(year)
            continue
        wetness = [row.get("GWETROOT") for row in days]
        run = longest = 0
        for row in days:
            run = run + 1 if row["PRECTOTCORR"] < 1 else 0
            longest = max(longest, run)
        temperature = statistics.mean(row["T2M"] for row in days)
        low, high = profile["temperature_c"]["optimal"]
        seasons.append(
            {
                "year": year,
                "start": str(start),
                "end": str(start + timedelta(days=duration - 1)),
                "temperature_c": temperature,
                "rainfall_mm": sum(row["PRECTOTCORR"] for row in days),
                "longest_dry_run_days": longest,
                "root_wetness": statistics.mean(wetness)
                if all(value is not None for value in wetness)
                else None,
                "temperature_in_reference_range": low <= temperature <= high,
            }
        )
    return {
        "reference_days": duration,
        "complete_seasons": len(seasons),
        "excluded_years": excluded,
        "temperature_c": numeric_summary([row["temperature_c"] for row in seasons]),
        "rainfall_mm": numeric_summary([row["rainfall_mm"] for row in seasons]),
        "root_wetness": numeric_summary(
            [row["root_wetness"] for row in seasons if row["root_wetness"] is not None]
        ),
        "longest_dry_run_days": numeric_summary([row["longest_dry_run_days"] for row in seasons]),
        "temperature_matching_seasons": sum(
            row["temperature_in_reference_range"] for row in seasons
        ),
        "seasons": seasons,
    }


def range_check(value, thresholds):
    if value is None:
        return "unknown"
    if thresholds["optimal"][0] <= value <= thresholds["optimal"][1]:
        return "within_reference"
    if thresholds["absolute"][0] <= value <= thresholds["absolute"][1]:
        return "local_review"
    return "outside_reference"


def crop_screen(profile, soil, history, request):
    climate = season_summaries(
        history["rows"],
        profile,
        request.planting_month,
        history["first_year"],
        history["last_year"],
    )
    ph = soil.get("median")
    checks = {
        "ph": range_check(ph, profile["ph"]),
        "temperature": range_check(climate["temperature_c"]["median"], profile["temperature_c"]),
    }
    states = set(checks.values())
    status = (
        "needs_data"
        if "unknown" in states
        else (
            "outside_reference"
            if "outside_reference" in states
            else ("local_review" if "local_review" in states else "reference_match")
        )
    )
    planting = date(request.planning_year, request.planting_month, 1)
    harvest = [str(planting + timedelta(days=days - 1)) for days in profile["indicative_days"]]
    return {
        "id": profile["id"],
        "name": profile["name"],
        "family": profile["family"],
        "species": profile["species"],
        "status": status,
        "checks": checks,
        "soil_ph": ph,
        "ph_spatial_range": [soil.get("p10"), soil.get("p90")],
        "reference": profile,
        "climate": climate,
        "planting_reference": str(planting),
        "indicative_harvest_window": harvest,
        "harvest_yield_prediction": None,
        "water_adequacy": "not_assessed",
        "needs_checking": [
            "Plant-available nutrients, salinity and drainage need field/laboratory checks.",
            "Rainfall is not effective rainfall or irrigation supply; a water balance is needed.",
            "Ecocrop does not specify the pH lab method; this map comparison is approximate.",
            profile["local_checks"],
        ],
    }


def assess_planting(request: PlantingRequest, cache: Path | None = None):
    cache = cache or DATA / "cache" / "soil"
    with httpx.Client(timeout=45, follow_redirects=True) as client:
        with ThreadPoolExecutor(max_workers=2) as executor:
            soil_job = executor.submit(map_property, client, request, "phh2o", cache)
            history_job = executor.submit(power_history, client, request, cache)
            soil, history = soil_job.result(), history_job.result()
    catalog = crop_catalog()
    candidates = [crop_screen(profile, soil, history, request) for profile in catalog["profiles"]]
    order = {"reference_match": 0, "local_review": 1, "outside_reference": 2, "needs_data": 3}
    candidates.sort(
        key=lambda crop: (
            order[crop["status"]],
            crop["reference"]["indicative_days"][1] if request.priority == "shorter_season" else 0,
            crop["family"] != "legume" if request.priority == "legume_options" else False,
            crop["name"],
        )
    )
    return {
        "schema": "planting-screen-v1",
        "created_at": datetime.now(UTC).isoformat(),
        "request": request.model_dump(mode="json"),
        "status": history["status"],
        "rule_version": catalog["version"],
        "catalog_sha256": hashlib.sha256(CATALOG_PATH.read_bytes()).hexdigest(),
        "soil": soil,
        "history": {
            **{key: value for key, value in history.items() if key != "rows"},
            "monthly": monthly_summary(
                history["rows"], history["first_year"], history["last_year"]
            ),
        },
        "crops": candidates,
        "method": {
            "title": "pH and seasonal-temperature reference screen",
            "scope": "Seven crops only. Other local crops may be more appropriate.",
            "cycle_source": catalog["cycle_water_source"],
            "duration_assumption": catalog["cycle_note"],
            "water_note": catalog["water_note"],
            "dry_day_source": "https://www.climdex.org/learn/indices/",
            "dry_day_definition": "Rain below 1 mm/day; seasonal adaptation, not measured drought",
            "future": "Historical matching counts are not probabilities for the planning year.",
            "accuracy": "No locally validated suitability, maturity, yield or harvest-rate model.",
            "soil_scale": "250 m predictions; smaller selections do not add fine-scale evidence.",
            "root_zone": "Selected soil horizon only, not a full root-zone assessment.",
        },
    }


def nex_year(client, region, model, scenario, year, variable, cache):
    """NCSS performs server-side point extraction. Never download a global NetCDF file."""
    lat, lon = (region.north + region.south) / 2, (region.west + region.east) / 2
    url = (
        f"{NEX}/{model}/{scenario}/r1i1p1f1/{variable}/"
        f"{variable}_day_{model}_{scenario}_r1i1p1f1_gn_{year}_v2.0.nc"
    )
    params = {
        "var": variable,
        "latitude": lat,
        "longitude": lon,
        "time_start": f"{year}-01-01T12:00:00Z",
        "time_end": f"{year}-12-31T12:00:00Z",
        "accept": "csv",
    }
    for attempt in range(2):
        try:
            body, provenance = acquire(client, url, params, cache, allow_ncss_csv=True)
            break
        except httpx.TransportError:
            if attempt:
                raise
    # acquire recognises CSV explicitly; every parsed value also gets a unit/date check here.
    reader = csv.DictReader(io.StringIO(body.decode("utf-8-sig")))
    unit = "K" if variable == "tas" else "kg m-2 s-1"
    expected_key = f'{variable}[unit="{unit}"]'
    if expected_key not in (reader.fieldnames or []):
        raise ClimateError(f"Unexpected NEX {variable} units or CSV schema")
    values, coordinates = {}, set()
    for record in reader:
        day = date.fromisoformat(record["time"][:10])
        if day.year != year or str(day) in values:
            raise ClimateError("Unexpected or duplicate NEX dates")
        source_lat = float(record['latitude[unit="degrees_north"]'])
        source_lon = float(record['longitude[unit="degrees_east"]'])
        delta_lon = abs((source_lon - lon + 180) % 360 - 180)
        if not math.isfinite(source_lat) or not math.isfinite(source_lon):
            raise ClimateError("Invalid NEX grid coordinates")
        if abs(source_lat - lat) > 0.251 or delta_lon > 0.251:
            raise ClimateError("NEX returned a grid cell outside the requested neighbourhood")
        coordinates.add((source_lat, source_lon))
        value = finite_value(record[expected_key], minimum=0)
        if value is None or value > 1e10:
            raise ClimateError("Missing/fill NEX value; no imputation is allowed")
        values[str(day)] = value - 273.15 if variable == "tas" else value * 86400
    expected_days = 366 if calendar.isleap(year) else 365
    if len(values) != expected_days or len(coordinates) != 1:
        raise ClimateError("NEX year/grid is incomplete; no calendar conversion is assumed")
    return {
        "model": model,
        "variable": variable,
        "year": year,
        "values": values,
        "source_coordinate": list(next(iter(coordinates))),
        "provenance": provenance,
    }


def assess_future(request: FutureRequest, cache: Path | None = None):
    if request.south < -60:
        raise ClimateError(
            "NASA NEX projections cover land from 60°S; this selection is outside it"
        )
    if not FUTURE_SLOTS.acquire(blocking=False):
        raise ClimateError("Another climate-scenario request is running. Please retry shortly.")
    try:
        return _future(request, cache or DATA / "cache" / "soil")
    finally:
        FUTURE_SLOTS.release()


def _future(request, cache):
    first, last = request.planning_year, request.planning_year + 9
    snapshots, failures = [], []
    with httpx.Client(
        timeout=httpx.Timeout(90, connect=15, pool=15), follow_redirects=True
    ) as client:
        with ThreadPoolExecutor(max_workers=4) as executor:

            def fetch_years(years, models):
                jobs = {
                    executor.submit(
                        nex_year, client, request, model, request.scenario, year, variable, cache
                    ): (model, year, variable)
                    for model in models
                    for year in years
                    for variable in ("tas", "pr")
                }
                for job, (model, year, variable) in jobs.items():
                    try:
                        snapshots.append(job.result())
                    except (httpx.HTTPError, ValueError, KeyError, TypeError, OSError) as exc:
                        failures.append(
                            {"model": model, "year": year, "variable": variable, "reason": str(exc)}
                        )

            # Fail early per model when its first-year service path/units are unavailable.
            fetch_years([first], NEX_MODELS)
            working = [
                model
                for model in NEX_MODELS
                if sum(item["model"] == model for item in snapshots) == 2
            ]
            if working:
                fetch_years(range(first + 1, last + 1), working)
    models = []
    for model in NEX_MODELS:
        rows, provenance, coordinates = {}, [], []
        for snapshot in snapshots:
            if snapshot["model"] != model:
                continue
            key = "T2M" if snapshot["variable"] == "tas" else "PRECTOTCORR"
            for day, value in snapshot["values"].items():
                rows.setdefault(day, {"date": day})[key] = value
            provenance.append(snapshot["provenance"])
            coordinates.append(snapshot["source_coordinate"])
        model_failures = [item for item in failures if item["model"] == model]
        models.append(
            {
                "id": model,
                "status": "available"
                if len(provenance) == 20
                else ("partial" if provenance else "unavailable"),
                "source_coordinates": sorted({tuple(point) for point in coordinates}),
                "monthly": monthly_summary(rows, first, last),
                "crops": [
                    {
                        "id": profile["id"],
                        "name": profile["name"],
                        "climate": season_summaries(
                            rows, profile, request.planting_month, first, last
                        ),
                    }
                    for profile in crop_catalog()["profiles"]
                ],
                "provenance": provenance,
                "failures": model_failures,
            }
        )
    return {
        "schema": "climate-scenario-v1",
        "created_at": datetime.now(UTC).isoformat(),
        "request": request.model_dump(mode="json"),
        "first_year": first,
        "last_year": last,
        "scenario": request.scenario,
        "models": models,
        "soil_health_forecast": None,
        "source": "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
        "paper": "https://doi.org/10.1038/s41597-022-01393-4",
        "limitations": [
            "Two illustrative climate models, not the full ensemble or a calibrated probability.",
            "Ten-year exploratory window; not a 30-year climate normal or exact-year forecast.",
            "Scenario simulations do not predict the actual weather of a named planting year.",
            "Daily 0.25° grid (~25 km); source cells, scenario and v2.0 files are preserved.",
            "Soil is held unchanged; future degradation, pests and management are not modeled.",
            "Separate models; no difference against POWER or invented consensus score.",
        ],
    }
