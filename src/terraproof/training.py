"""Offline research workflow: audited labels -> preplant features -> held-out evaluation.

There is deliberately no prediction-serving or automatic promotion path.
"""

import hashlib
import json
from datetime import date, timedelta
from importlib.metadata import version
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .climate import normalize

FEATURES = ["preplant_tmax_mean_c", "preplant_rain_total_mm", "planting_month", "area_ha"]
REQUIRED = {
    "field_id",
    "location_group",
    "planting_date",
    "harvest_date",
    "crop",
    "variety",
    "area_ha",
    "yield_t_ha",
    "measurement_method",
    "consent",
    "outcome_source",
}


class ReadinessError(ValueError):
    pass


def prepare(outcomes: Path, manifest_path: Path) -> tuple[pd.DataFrame, dict]:
    labels = pd.read_csv(
        outcomes, dtype={"field_id": str, "location_group": str}, keep_default_na=False
    )
    if not REQUIRED.issubset(labels.columns):
        raise ReadinessError(f"Missing outcome columns: {sorted(REQUIRED - set(labels.columns))}")
    if labels.empty:
        raise ReadinessError("No observed outcome labels were supplied")
    for column in ("field_id", "location_group", "variety", "outcome_source"):
        if labels[column].astype(str).str.strip().eq("").any():
            raise ReadinessError(f"Missing required identity or provenance: {column}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    rows, excluded = [], []
    if labels.duplicated(["field_id", "planting_date"]).any():
        raise ReadinessError("Duplicate field/season outcomes; resolve before training")
    if labels.groupby("field_id")["location_group"].nunique().max() > 1:
        raise ReadinessError("A field must belong to exactly one spatial holdout group")
    for index, row in labels.iterrows():
        if str(row["consent"]).lower() != "true" or row["measurement_method"] != "measured":
            excluded.append({"row": int(index), "reason": "consent or measured-label gate"})
            continue
        if row["crop"] != "rice" or not str(row["outcome_source"]).strip() or not row["variety"]:
            raise ReadinessError(
                "Only rice labels with variety and outcome provenance are supported"
            )
        planting, harvest = (
            date.fromisoformat(row["planting_date"]),
            date.fromisoformat(row["harvest_date"]),
        )
        if not 1 <= (harvest - planting).days <= 240:
            raise ReadinessError("Invalid planting/harvest linkage")
        area, target = float(row["area_ha"]), float(row["yield_t_ha"])
        if not (0 < area <= 10000 and 0 <= target <= 30):
            raise ReadinessError("Invalid area or measured yield units/range")
        group = row["location_group"]
        if group not in manifest:
            raise ReadinessError(f"No climate snapshot mapped to location group {group}")
        entry = manifest[group]
        if (
            not entry.get("spatial_linkage")
            or entry.get("coordinates_verified") is not True
            or not entry.get("grid_id")
        ):
            raise ReadinessError("Document verified field/grid linkage in every manifest entry")
        snapshot_path = manifest_path.parent / entry["snapshot"]
        snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
        # Pre-decision features only; actual growing-season weather is excluded by construction.
        end = planting - timedelta(days=1)
        climate, quality = normalize(snapshot["payload"], planting - timedelta(days=30), end)
        if quality["flagged_days"]:
            excluded.append({"row": int(index), "reason": "incomplete preplant climate"})
            continue
        rows.append(
            {
                **row.to_dict(),
                "area_ha": area,
                "yield_t_ha": target,
                "year": planting.year,
                "feature_available_through": end.isoformat(),
                "preplant_tmax_mean_c": np.mean([d["tmax_c"] for d in climate]),
                "preplant_rain_total_mm": sum(d["rain_mm"] for d in climate),
                "planting_month": planting.month,
                "climate_sha256": hashlib.sha256(snapshot_path.read_bytes()).hexdigest(),
                "climate_grid_id": entry["grid_id"],
            }
        )
    audit = {
        "input_rows": len(labels),
        "accepted_rows": len(rows),
        "excluded": excluded,
        "outcomes_sha256": hashlib.sha256(outcomes.read_bytes()).hexdigest(),
        "manifest_sha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        "feature_version": "preplant-v1",
        "features": FEATURES,
        "lookback_days": 30,
        "lookback_basis": "engineering baseline, not an agronomic cutoff",
    }
    return pd.DataFrame(rows), audit


def train_research(
    outcomes: Path, manifest: Path, output: Path, holdout_groups: list[str], test_from_year: int
) -> dict:
    output.mkdir(parents=True, exist_ok=False)  # Never overwrite a previous experiment.
    try:
        frame, audit = prepare(outcomes, manifest)
        (output / "quality.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")
        if frame.empty:
            raise ReadinessError("No eligible measured outcomes remain")
        if not holdout_groups or not set(holdout_groups).issubset(set(frame.location_group)):
            raise ReadinessError("Choose explicit, represented spatial holdout groups")
        train = frame[(frame.year < test_from_year) & ~frame.location_group.isin(holdout_groups)]
        test = frame[(frame.year >= test_from_year) & frame.location_group.isin(holdout_groups)]
        # These are execution floors, not claims of statistically adequate sample size.
        if len(train) < 10 or len(test) < 5 or train.location_group.nunique() < 2:
            raise ReadinessError(
                "Execution floor: 10 training rows across 2 groups and 5 test rows"
            )
        if set(train.field_id) & set(test.field_id):
            raise ReadinessError("Field leakage across train/test split")
        if set(train.climate_grid_id) & set(test.climate_grid_id):
            raise ReadinessError("Climate grid leakage across spatial holdouts")
        # Training labels must themselves have been observed before the test decision window.
        if max(train.harvest_date) >= min(test.planting_date):
            raise ReadinessError("Training harvest labels overlap the held-out decision window")
        frame.to_csv(output / "features.csv", index=False)
        x_train, y_train = train[FEATURES], train.yield_t_ha
        x_test, y_test = test[FEATURES], test.yield_t_ha
        model = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), Ridge(alpha=1.0))
        model.fit(x_train, y_train)
        baseline = DummyRegressor(strategy="mean").fit(x_train, y_train)
        predictions, naive = model.predict(x_test), baseline.predict(x_test)
        scored = test[["field_id", "location_group", "year", "variety", "yield_t_ha"]].copy()
        scored["predicted_yield_t_ha"] = predictions
        scored["baseline_yield_t_ha"] = naive
        scored.to_csv(output / "predictions.csv", index=False)
        subgroups = {}
        for group, part in scored.groupby(["location_group", "variety"]):
            subgroups[" / ".join(group)] = {
                "n": len(part),
                "mae_t_ha": mean_absolute_error(part.yield_t_ha, part.predicted_yield_t_ha),
            }
        report = {
            "status": "research_only",
            "target": "measured rice yield, t/ha",
            "train_n": len(train),
            "test_n": len(test),
            "excluded_from_split_n": len(frame) - len(train) - len(test),
            "test_from_year": test_from_year,
            "holdout_groups": holdout_groups,
            "mae_t_ha": mean_absolute_error(y_test, predictions),
            "rmse_t_ha": root_mean_squared_error(y_test, predictions),
            "baseline_mae_t_ha": mean_absolute_error(y_test, naive),
            "subgroups": subgroups,
            "feature_version": "preplant-v1",
            "dependencies": {name: version(name) for name in ("scikit-learn", "pandas", "numpy")},
            "descriptive_absolute_error_t_ha": {
                "median": float(np.median(np.abs(y_test - predictions))),
                "p90": float(np.quantile(np.abs(y_test - predictions), 0.9)),
                "meaning": "Held-out error spread only; not calibrated prediction intervals",
            },
            "uncertainty": "No calibrated prediction intervals; deployment gate remains closed",
            "promotion_allowed": False,
            "remaining_gates": [
                "representative independent validation",
                "calibrated uncertainty",
                "qualified regional agronomic review",
                "prospective decision study",
            ],
        }
        joblib.dump(model, output / "research-model.joblib")
        (output / "model-card.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        return report
    except (ReadinessError, FileNotFoundError, KeyError, ValueError) as exc:
        report = {"status": "blocked", "promotion_allowed": False, "reason": str(exc)}
        (output / "readiness.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        raise ReadinessError(str(exc)) from exc
