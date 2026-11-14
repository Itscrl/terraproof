"""Research-only annual province yield forecasting from archived PSA aggregates."""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path

import joblib
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ["yield_lag1_t_ha", "yield_trailing3_t_ha", "year"]
HOLDOUTS = ["Albay", "Sorsogon"]
CUTOFF = 2020


def metrics(actual, predicted):
    return {
        "mae_t_ha": float(mean_absolute_error(actual, predicted)),
        "rmse_t_ha": float(root_mean_squared_error(actual, predicted)),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    source = ROOT / "data/external/psa-rice/palay-yield-bicol.csv"
    raw = pd.read_csv(source)
    annual = raw[(raw.ecosystem == "Palay") & (raw.period == "Annual") & (raw.year <= 2025)].copy()
    assert not annual.duplicated(["location", "year"]).any()
    rows = []
    for location, group in annual.groupby("location"):
        indexed = group.set_index("year").sort_index()
        for year, record in indexed.iterrows():
            prior = indexed.reindex([year - 3, year - 2, year - 1]).derived_yield_t_ha
            if prior.isna().any() or pd.isna(record.derived_yield_t_ha):
                continue
            rows.append(
                {
                    "location": location,
                    "year": int(year),
                    "yield_t_ha": float(record.derived_yield_t_ha),
                    "yield_lag1_t_ha": float(prior.iloc[-1]),
                    "yield_trailing3_t_ha": float(prior.mean()),
                    "features_through_year": int(year - 1),
                }
            )
    frame = pd.DataFrame(rows)
    train = frame[(frame.year < CUTOFF) & ~frame.location.isin(HOLDOUTS)]
    test = frame[(frame.year >= CUTOFF) & frame.location.isin(HOLDOUTS)]
    assert len(train) >= 10 and len(test) >= 5
    assert set(train.location).isdisjoint(test.location)
    assert train.year.max() < test.year.min()
    assert (frame.features_through_year < frame.year).all()
    model = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
    model.fit(train[FEATURES], train.yield_t_ha)
    baseline = DummyRegressor(strategy="mean").fit(train[FEATURES], train.yield_t_ha)
    scored = test.copy()
    scored["predicted_yield_t_ha"] = model.predict(test[FEATURES])
    scored["mean_baseline_t_ha"] = baseline.predict(test[FEATURES])
    scored["persistence_baseline_t_ha"] = test.yield_lag1_t_ha
    report = {
        "status": "research_only",
        "promotion_allowed": False,
        "target": "PSA aggregate annual palay yield, t/ha, at province level",
        "features": FEATURES,
        "model": "StandardScaler + Ridge(alpha=1.0)",
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "split": {
            "test_from_year": CUTOFF,
            "held_out_provinces": HOLDOUTS,
            "train_provinces": sorted(train.location.unique().tolist()),
            "train_years": [int(train.year.min()), int(train.year.max())],
            "test_years": [int(test.year.min()), int(test.year.max())],
        },
        "train_n": len(train),
        "test_n": len(test),
        "unused_feature_rows": len(frame) - len(train) - len(test),
        "model_metrics": metrics(scored.yield_t_ha, scored.predicted_yield_t_ha),
        "mean_baseline_metrics": metrics(scored.yield_t_ha, scored.mean_baseline_t_ha),
        "persistence_baseline_metrics": metrics(
            scored.yield_t_ha, scored.persistence_baseline_t_ha
        ),
        "province_metrics": {
            name: {"n": len(g), **metrics(g.yield_t_ha, g.predicted_yield_t_ha)}
            for name, g in scored.groupby("location")
        },
        "limitations": [
            "Retrospective aggregate estimates, not measured field yields or crop damage.",
            (
                "Six provinces only; geographic holdouts share regional weather "
                "and are not fully independent."
            ),
            (
                "Historical PSA revisions/publication lags are not reconstructed; "
                "operational as-of availability is unverified."
            ),
            (
                "Rolling one-year forecasts use each preceding year's observed "
                "yield, including prior test years; not a fixed multi-year "
                "forecast."
            ),
            (
                "No climate, management, planting-date or HDF5 predictors; this "
                "model cannot rank planting plans."
            ),
            "No calibrated intervals, prospective validation or agronomic review.",
            (
                "Holdout chosen before this run, after data acquisition; no "
                "hyperparameter tuning on test scores."
            ),
        ],
        "dependencies": {n: version(n) for n in ["scikit-learn", "numpy", "pandas", "joblib"]},
        "created_at_utc": datetime.now(UTC).isoformat(),
    }
    args.output.mkdir(parents=True, exist_ok=False)
    frame.to_csv(args.output / "features.csv", index=False)
    scored.to_csv(args.output / "predictions.csv", index=False)
    joblib.dump(
        {"model": model, "features": FEATURES, "target": report["target"]},
        args.output / "research-model.joblib",
    )
    (args.output / "model-card.json").write_text(json.dumps(report, indent=2) + "\n")
    (args.output / "README.md").write_text(
        "# Province-level rice-yield research model\n\n"
        "See model-card.json for the split, baseline comparisons and limitations. "
        "predictions.csv contains the held-out observations and predictions. "
        "This is a historical annual yield baseline, not a field or planting-plan model. "
        "The model has not been connected to the application. "
        "Only load trusted local joblib files.\n\n"
        "Reproduce in a new directory with `.h5-viewer-runtime/bin/python "
        "scripts/train_psa_rice.py --output artifacts/psa-rice-new-run`.\n"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
