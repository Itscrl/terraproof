"""Compare fixed candidates on spatial validation, evaluate winner once on a new split.

This scene has already been explored; the final split is not independent external evidence.
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

SOURCE = Path("artifacts/h5-soil-moisture-001")
OUTPUT = Path("artifacts/h5-soil-moisture-002")
FEATURES = ["hh_db", "hv_db", "hh_minus_hv_db", "incidence_angle_degrees"]


def metrics(y, p):
    return {
        "mae_m3_m3": float(mean_absolute_error(y, p)),
        "rmse_m3_m3": float(root_mean_squared_error(y, p)),
    }


def main():
    if OUTPUT.exists():
        raise FileExistsError(OUTPUT)
    frame = pd.read_csv(SOURCE / "features.csv")
    shape = json.loads((SOURCE / "model-card.json").read_text())["raster_shape"]
    first, second, gap = int(shape[0] * 0.6), int(shape[0] * 0.8), 24
    train = frame[frame.row < first - gap]
    val = frame[(frame.row >= first + gap) & (frame.row < second - gap)]
    test = frame[frame.row >= second + gap].copy()
    assert min(len(train), len(val), len(test)) >= 100
    candidates = {
        "mean": DummyRegressor(),
        "ridge": make_pipeline(StandardScaler(), Ridge(alpha=1)),
        "random_forest": RandomForestRegressor(
            n_estimators=160, min_samples_leaf=15, max_features=1.0, n_jobs=2, random_state=42
        ),
        "gradient_boosting": HistGradientBoostingRegressor(
            max_iter=150,
            max_leaf_nodes=15,
            l2_regularization=10,
            early_stopping=False,
            random_state=42,
        ),
    }
    scores = {}
    for name, model in candidates.items():
        model.fit(train[FEATURES], train.soil_moisture_m3_m3)
        scores[name] = metrics(val.soil_moisture_m3_m3, model.predict(val[FEATURES]))
        print(name, scores[name], flush=True)
    winner = min(scores, key=lambda name: scores[name]["rmse_m3_m3"])
    predictions = candidates[winner].predict(test[FEATURES])
    baseline = candidates["mean"].predict(test[FEATURES])
    report = {
        "status": "research_only",
        "promotion_allowed": False,
        "task": "satellite soil-moisture retrieval surrogate, m3/m3",
        "preprocessing_source": str(SOURCE / "model-card.json"),
        "features": FEATURES,
        "train_n": len(train),
        "validation_n": len(val),
        "test_n": len(test),
        "split": {"axis": "rows", "boundaries": [first, second], "buffer_each_side_pixels": gap},
        "selection": "Lowest validation RMSE among four fixed candidates, including mean baseline",
        "validation_scores": scores,
        "selected_model": winner,
        "test_metrics": metrics(test.soil_moisture_m3_m3, predictions),
        "test_mean_baseline": metrics(test.soil_moisture_m3_m3, baseline),
        "limitations": [
            (
                "Same scene already explored in experiment 001; this is "
                "exploratory spatial validation, not independent confirmation."
            ),
            "Satellite-derived targets, no field truth or future-date validation.",
            "No test-driven retuning, no deployment, no rice yield claims.",
        ],
    }
    OUTPUT.mkdir(parents=True, exist_ok=False)
    joblib.dump(
        {"model": candidates[winner], "features": FEATURES}, OUTPUT / "research-model.joblib"
    )
    test["prediction_m3_m3"] = predictions
    test["baseline_m3_m3"] = baseline
    test.to_csv(OUTPUT / "predictions.csv", index=False)
    np.testing.assert_allclose(
        joblib.load(OUTPUT / "research-model.joblib")["model"].predict(test[FEATURES]), predictions
    )
    (OUTPUT / "model-card.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
