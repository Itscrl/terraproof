"""Read-only views of archived context and experiment reports; no model loading."""

import csv
import json
import math
from pathlib import Path

from .climate import ROOT

ALBAY = ROOT / "data/external/albay-public"
REPORTS = ROOT / "docs/research-runs"


def albay_data(directory: Path = ALBAY) -> dict:
    manifest_path = directory / "manifest.json"
    table_path = directory / "context/municipal-yield-history.csv"
    if not manifest_path.exists() or not table_path.exists():
        return {
            "available": False,
            "message": "Albay data has not been downloaded on this computer.",
        }
    manifest = json.loads(manifest_path.read_text())
    allowed_years = set(manifest["advertised_years"])
    records, excluded = [], 0
    with table_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            try:
                year, value = int(row["year"]), float(row["source_yield_value"])
            except (ValueError, TypeError):
                excluded += 1
                continue
            if (
                row["geographic_level"] != "municipality_or_city"
                or year not in allowed_years
                or row["year_advertised"].lower() != "true"
                or row["requested_reporting_period"] not in {"Annual", "Semester 1", "Semester 2"}
                or not math.isfinite(value)
                or not 0 <= value <= 30
                or not row["psgc"].startswith("05005")
            ):
                excluded += 1
                continue
            records.append(
                {
                    "location": row["location"],
                    "psgc": row["psgc"],
                    "year": year,
                    "period": row["requested_reporting_period"],
                    "yield_t_ha": value,
                }
            )
    geometry_path = directory / "context/albay-municipal-boundaries.geojson"
    geometry = json.loads(geometry_path.read_text()) if geometry_path.exists() else None
    return {
        "available": True,
        "role": "context_only",
        "training_eligible": False,
        "records": records,
        "geometry": geometry,
        "excluded_rows": excluded,
        "unverified_rows_excluded": manifest.get("unverified_year_rows", 0),
        "source_url": manifest["landing_page"],
        "downloaded_at": manifest["scraped_at_utc"],
        "message": "Municipal estimates, not measured harvests from individual fields.",
    }


def model_reports(directory: Path = REPORTS) -> list[dict]:
    definitions = [
        (
            "h5-soil-moisture-002",
            "Satellite soil moisture",
            "One satellite scene; 105 test pixels.",
            "Estimates the satellite product, not independently measured ground moisture.",
        ),
        (
            "irri-yield-001",
            "Rice trial harvest",
            "IRRI station, Laguna; 1989 test harvests.",
            "Historical trials at one station; not validated for Albay farms.",
        ),
        (
            "psa-rice-001",
            "Provincial harvest",
            "Albay and Sorsogon; 2020–2025.",
            "Only marginal improvement over repeating last year's yield; squared error was worse.",
        ),
    ]
    results = []
    for identifier, title, coverage, limitation in definitions:
        path = directory / f"{identifier}.json"
        if not path.exists():
            continue
        report = json.loads(path.read_text())
        metric = report.get("test_metrics", report.get("model_metrics", {}))
        baseline = report.get("test_mean_baseline", report.get("mean_baseline_metrics", {}))
        soil = identifier.startswith("h5")
        scale = 100 if soil else 1
        mae_key, rmse_key = ("mae_m3_m3", "rmse_m3_m3") if soil else ("mae_t_ha", "rmse_t_ha")
        results.append(
            {
                "id": identifier,
                "title": title,
                "coverage": coverage,
                "limitation": limitation,
                "research_only": True,
                "average_error": metric[mae_key] * scale,
                "baseline_average_error": baseline[mae_key] * scale,
                "rmse": metric[rmse_key] * scale,
                "baseline_rmse": baseline[rmse_key] * scale,
                "unit": "percentage points" if soil else "tonnes per hectare",
                "test_n": report["test_n"],
                "model": report.get("selected_model", report.get("model", "Ridge")),
                "persistence_rmse": report.get("persistence_baseline_metrics", {}).get("rmse_t_ha"),
            }
        )
    return results
