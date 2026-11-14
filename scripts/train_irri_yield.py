"""Exploratory within-site yield experiment; not the gated Albay deployment pipeline."""

import hashlib
import json
from importlib.metadata import version
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/external/rice-alternatives"
OUTPUT = ROOT / "artifacts/irri-yield-001"
FILES = {
    1987: "doi_10.7910_DVN_75MPJJ.csv",
    1988: "doi_10.7910_DVN_WYCUMH.csv",
    1989: "doi_10.7910_DVN_ECKKQO.csv",
}
FEATURES = ["N_fertilizer", "season", "variety"]


def metrics(y, p):
    return {
        "mae_t_ha": float(mean_absolute_error(y, p)),
        "rmse_t_ha": float(root_mean_squared_error(y, p)),
    }


def main():
    if OUTPUT.exists():
        raise FileExistsError(OUTPUT)
    frames = []
    for year, filename in FILES.items():
        f = pd.read_csv(SOURCE / filename)
        f["year"] = year
        # Carob IRRI conversion assigns yield from GYkgha; /1000 gives tonnes/ha.
        f["yield_t_ha"] = pd.to_numeric(f["yield"], errors="coerce") / 1000
        frames.append(f)
    frame = pd.concat(frames, ignore_index=True)
    assert not frame.duplicated(["dataset_id", "record_id"]).any()
    valid = frame.yield_t_ha.between(0, 30) & frame.N_fertilizer.notna()
    clean = frame[valid].copy()
    train, val, test = [clean[clean.year == y].copy() for y in [1987, 1988, 1989]]
    assert train.harvest_date.max() < val.planting_date.min()
    assert val.harvest_date.max() < test.planting_date.min()
    numeric = make_pipeline(SimpleImputer(strategy="median"), StandardScaler())
    categorical = make_pipeline(
        SimpleImputer(strategy="most_frequent"),
        OneHotEncoder(handle_unknown="ignore", sparse_output=False),
    )

    def preprocess():
        return ColumnTransformer(
            [
                ("numeric", numeric, ["N_fertilizer"]),
                ("category", categorical, ["season", "variety"]),
            ]
        )

    models = {
        "mean": DummyRegressor(),
        "ridge": make_pipeline(preprocess(), Ridge(alpha=10)),
        "random_forest": make_pipeline(
            preprocess(),
            RandomForestRegressor(
                n_estimators=200, min_samples_leaf=8, max_depth=6, random_state=42, n_jobs=2
            ),
        ),
    }
    scores = {}
    for name, model in models.items():
        x = train[["N_fertilizer"]] if name == "mean" else train[FEATURES]
        v = val[["N_fertilizer"]] if name == "mean" else val[FEATURES]
        model.fit(x, train.yield_t_ha)
        scores[name] = metrics(val.yield_t_ha, model.predict(v))
    selected = min(scores, key=lambda name: scores[name]["rmse_t_ha"])
    x_test = test[["N_fertilizer"]] if selected == "mean" else test[FEATURES]
    pred = models[selected].predict(x_test)
    naive = models["mean"].predict(test[["N_fertilizer"]])
    report = {
        "status": "exploratory_within_site_only",
        "promotion_allowed": False,
        "task": "experimental rice grain yield, tonnes/ha",
        "features": FEATURES,
        "train_n": len(train),
        "validation_n": len(val),
        "test_n": len(test),
        "excluded_n": int((~valid).sum()),
        "split": {"train_year": 1987, "validation_year": 1988, "test_year": 1989},
        "validation_scores": scores,
        "selected_model": selected,
        "selection_rule": "Lowest validation RMSE among fixed candidates; test scored once",
        "test_metrics": metrics(test.yield_t_ha, pred),
        "test_mean_baseline": metrics(test.yield_t_ha, naive),
        "source_hashes": {
            filename: hashlib.sha256((SOURCE / filename).read_bytes()).hexdigest()
            for filename in FILES.values()
        },
        "unit_conversion": (
            "Carob standardized yield = GYkgha, divided by 1000 for t/ha; "
            "source agronomy-functions.R"
        ),
        "dependencies": {n: version(n) for n in ["scikit-learn", "pandas", "numpy", "joblib"]},
        "limitations": [
            "Single IRRI station in Laguna, 1987–1989; not Albay farm validation.",
            (
                "Long-term plots and treatment groups can recur across years; no "
                "independent spatial holdout is possible."
            ),
            (
                "Experimental nitrogen regimen is a management input, not a "
                "recommendation or causal effect estimate."
            ),
            (
                "Standardizer documents fertilizer discrepancies and inferred "
                "month dates/coordinates; inspect source records."
            ),
            (
                "Current original metadata lists CC BY-NC-SA 4.0/restricted "
                "historical files; standardized copy lists CC0. License "
                "discrepancy unresolved; raw archives remain local and are not "
                "redistributed by this commit."
            ),
            "No linkage to 2026 HDF5 observations; no climate features or calibrated uncertainty.",
            (
                "Cannot pass the existing measured-field spatial-validation "
                "deployment gate; not connected to application."
            ),
        ],
    }
    OUTPUT.mkdir(parents=True, exist_ok=False)
    test["prediction_t_ha"] = pred
    test["mean_baseline_t_ha"] = naive
    test.to_csv(OUTPUT / "predictions.csv", index=False)
    joblib.dump(
        {
            "model": models[selected],
            "features": ["N_fertilizer"] if selected == "mean" else FEATURES,
        },
        OUTPUT / "research-model.joblib",
    )
    stored = joblib.load(OUTPUT / "research-model.joblib")
    np.testing.assert_allclose(stored["model"].predict(test[stored["features"]]), pred)
    (OUTPUT / "model-card.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
