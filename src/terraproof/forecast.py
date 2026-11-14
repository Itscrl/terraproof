"""Retrospective rainfall research baseline; never an operational weather forecast."""

import hashlib
import json
from datetime import UTC, date, datetime, timedelta
from importlib.metadata import version
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .climate import ClimateError, normalize, read_snapshot

FEATURES = ["rain_1d", "rain_7d", "rain_30d", "tmax_7d", "tmin_7d", "sin_doy", "cos_doy"]
SCHEMA = "power-rainfall-research-v1"
LIMITATION = (
    "Retrospective NASA POWER grid estimate, not an operational forecast or field measurement. "
    "No crop-yield, damage, irrigation or planting recommendation. "
    "Publication latency and revisions are not simulated; uncertainty is not calibrated."
)


def load_daily(path: Path):
    source = read_snapshot(path)
    try:
        keys = source["payload"]["properties"]["parameter"]["PRECTOTCORR"]
        first = datetime.strptime(min(keys), "%Y%m%d").date()
        last = datetime.strptime(max(keys), "%Y%m%d").date()
        rows, quality = normalize(source["payload"], first, last)
        coordinates = source["payload"]["geometry"]["coordinates"][:2]
        if len(coordinates) != 2 or not np.isfinite(coordinates).all():
            raise ValueError("Invalid source coordinates")
    except (KeyError, TypeError, ValueError) as exc:
        raise ClimateError(
            "Snapshot needs dated daily values and finite point coordinates"
        ) from exc
    frame = pd.DataFrame(rows).set_index("date")
    frame.index = pd.to_datetime(frame.index)
    return frame, quality, coordinates, source


def features_at(frame: pd.DataFrame, issue: date) -> dict:
    window = frame.loc[str(issue - timedelta(days=29)) : str(issue)]
    values = window[["rain_mm", "tmax_c", "tmin_c"]].to_numpy(dtype=float)
    if len(window) != 30 or not np.isfinite(values).all():
        raise ClimateError("Prediction requires 30 complete daily observations through issue date")
    phase = 2 * np.pi * (issue.timetuple().tm_yday - 1) / 365.25
    return dict(
        zip(
            FEATURES,
            [
                float(values[-1, 0]),
                float(values[-7:, 0].sum()),
                float(values[:, 0].sum()),
                float(values[-7:, 1].mean()),
                float(values[-7:, 2].mean()),
                float(np.sin(phase)),
                float(np.cos(phase)),
            ],
            strict=True,
        )
    )


def examples(frame: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Monday issue dates yield disjoint Tuesday-to-Monday seven-day targets."""
    records, excluded = [], 0
    for stamp in frame.index[29:]:
        issue = stamp.date()
        if issue.weekday() != 0 or stamp + pd.Timedelta(days=7) > frame.index[-1]:
            continue
        target = frame.loc[str(issue + timedelta(days=1)) : str(issue + timedelta(days=7))]
        try:
            features = features_at(frame, issue)
            rain = target.rain_mm.to_numpy(dtype=float)
            if len(rain) != 7 or not np.isfinite(rain).all():
                raise ClimateError("Incomplete target")
        except ClimateError:
            excluded += 1
            continue
        records.append(
            {
                "issue_date": str(issue),
                "target_end": str(issue + timedelta(days=7)),
                "month": issue.month,
                **features,
                "target_rain_mm": float(rain.sum()),
            }
        )
    if not records:
        raise ClimateError("No complete weekly examples in snapshot")
    return pd.DataFrame(records), excluded


def evaluate(truth, prediction) -> dict:
    return {
        "mae_mm": float(mean_absolute_error(truth, prediction)),
        "rmse_mm": float(np.sqrt(mean_squared_error(truth, prediction))),
    }


def train_rainfall(snapshot: Path, output: Path, validation_year=2021, test_year=2023) -> dict:
    if output.exists():
        raise ClimateError("Output already exists; choose a new experiment directory")
    if not 1901 <= validation_year < test_year <= 2100:
        raise ClimateError("Require ordered validation and test years between 1901 and 2100")
    frame, quality, coordinates, source = load_daily(snapshot)
    samples, excluded = examples(frame)
    validation_start, test_start = f"{validation_year}-01-01", f"{test_year}-01-01"
    train = samples[samples.target_end < validation_start].copy()
    validation = samples[
        (samples.issue_date >= validation_start) & (samples.target_end < test_start)
    ].copy()
    test = samples[samples.issue_date >= test_start].copy()
    if len(train) < 100 or len(validation) < 20 or len(test) < 20:
        raise ClimateError("Need at least 100 train, 20 validation and 20 test weeks (code floors)")
    # These fixed settings are declared before looking at validation or test outcomes.
    pipeline = make_pipeline(StandardScaler(), Ridge(alpha=10.0))
    pipeline.fit(train[FEATURES], train.target_rain_mm)
    seasonal = train.groupby("month").target_rain_mm.mean().to_dict()
    train_mean = float(train.target_rain_mm.mean())
    reports, predictions = {}, []
    for name, split in (("validation", validation), ("test", test)):
        split["ridge_mm"] = np.maximum(0, pipeline.predict(split[FEATURES]))
        split["seasonal_mean_mm"] = split.month.map(seasonal).fillna(train_mean)
        split["persistence_mm"] = split.rain_7d
        split["split"] = name
        reports[name] = {
            "weeks": len(split),
            "issue_start": split.issue_date.min(),
            "target_end": split.target_end.max(),
            "metrics": {
                model: evaluate(split.target_rain_mm, split[column])
                for model, column in (
                    ("ridge", "ridge_mm"),
                    ("seasonal_mean", "seasonal_mean_mm"),
                    ("persistence", "persistence_mm"),
                )
            },
            "by_year": {
                year: evaluate(group.target_rain_mm, group.ridge_mm)
                for year, group in split.groupby(split.issue_date.str[:4])
            },
        }
        predictions.append(split)
    scaler, ridge = pipeline.steps[0][1], pipeline.steps[1][1]
    model = {
        "schema": SCHEMA,
        "features": FEATURES,
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "coefficients": ridge.coef_.tolist(),
        "intercept": float(ridge.intercept_),
        "coordinates_lon_lat": coordinates,
        "training_target_end": train.target_end.max(),
        "source_sha256": hashlib.sha256(snapshot.read_bytes()).hexdigest(),
        "research_only": True,
        "operational_use_allowed": False,
    }
    card = {
        **{
            key: model[key]
            for key in (
                "schema",
                "coordinates_lon_lat",
                "source_sha256",
                "research_only",
                "operational_use_allowed",
                "training_target_end",
            )
        },
        "created_at": datetime.now(UTC).isoformat(),
        "target": "Total NASA POWER PRECTOTCORR for issue+1 through issue+7 (mm)",
        "source": {
            "file": snapshot.name,
            "request_url": source["request_url"],
            "retrieved_at": source["retrieved_at"],
        },
        "satellite_inputs_used": False,
        "model": "StandardScaler + Ridge(alpha=10); negative outputs clipped to zero",
        "features": FEATURES,
        "split_design": "Fixed chronological blocks; targets crossing cutoffs excluded; no refit",
        "training_weeks": len(train),
        "training_issue_start": train.issue_date.min(),
        "excluded_incomplete_weeks": excluded,
        "excluded_boundary_weeks": len(samples) - len(train) - len(validation) - len(test),
        "quality": quality,
        "evaluation": reports,
        "limitations": LIMITATION,
        "uncertainty": "No prediction intervals; weekly errors can remain serially correlated",
        "promotion_allowed": False,
        "dependency_versions": {
            name: version(name) for name in ("numpy", "pandas", "scikit-learn")
        },
    }
    output.mkdir(parents=True)
    for filename, content in (("model.json", model), ("model-card.json", card)):
        (output / filename).write_text(
            json.dumps(content, indent=2, allow_nan=False), encoding="utf-8"
        )
    samples.to_csv(output / "features.csv", index=False)
    pd.concat(predictions).to_csv(output / "predictions.csv", index=False)
    return card


def predict_rainfall(model_path: Path, snapshot: Path, issue: date) -> dict:
    """Portable JSON coefficients avoid loading pickle or executing HDF5 model code."""
    try:
        model = json.loads(model_path.read_text(encoding="utf-8"))
        if model["schema"] != SCHEMA or model["features"] != FEATURES:
            raise ValueError("Unknown model schema or feature order")
        arrays = [np.asarray(model[key], dtype=float) for key in ("mean", "scale", "coefficients")]
        if any(a.shape != (len(FEATURES),) or not np.isfinite(a).all() for a in arrays):
            raise ValueError("Invalid model coefficients")
        mean, scale, coefficients = arrays
        intercept = float(model["intercept"])
        if (scale <= 0).any() or not np.isfinite(intercept):
            raise ValueError("Invalid scale or intercept")
        if issue <= date.fromisoformat(model["training_target_end"]):
            raise ValueError("Prediction date must follow the last training target")
        frame, _, coordinates, source = load_daily(snapshot)
        if not np.allclose(coordinates, model["coordinates_lon_lat"], rtol=0, atol=1e-6):
            raise ValueError("Model is limited to its training point; spatial transfer unvalidated")
        features = features_at(frame, issue)
        prediction = float(
            (np.asarray(list(features.values())) - mean) / scale @ coefficients + intercept
        )
        if not np.isfinite(prediction):
            raise ValueError("Non-finite prediction")
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ClimateError(f"Research prediction unavailable: {exc}") from exc
    return {
        "schema": SCHEMA,
        "issue_date": str(issue),
        "target_start": str(issue + timedelta(days=1)),
        "target_end": str(issue + timedelta(days=7)),
        "predicted_rain_mm": max(0, prediction),
        "features": features,
        "coordinates_lon_lat": coordinates,
        "source_retrieved_at": source["retrieved_at"],
        "model_sha256": hashlib.sha256(model_path.read_bytes()).hexdigest(),
        "input_sha256": hashlib.sha256(snapshot.read_bytes()).hexdigest(),
        "research_only": True,
        "operational_use_allowed": False,
        "prediction_interval": None,
        "limitations": LIMITATION,
    }
