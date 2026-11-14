"""Fit a research surrogate for an SME2 soil-moisture retrieval, not field yield."""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import h5py
import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

BASE = "science/LSAR/SME2/grids/"
FEATURES = ["hh_db", "hv_db", "hh_minus_hv_db", "incidence_angle_degrees"]


def score(y, p):
    return {
        "mae_m3_m3": float(mean_absolute_error(y, p)),
        "rmse_m3_m3": float(root_mean_squared_error(y, p)),
        "r2": float(r2_score(y, p)),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError(args.output)
    attributes = {}
    with h5py.File(args.input, "r") as f:

        def read(key):
            ds = f[BASE + key]
            attributes[key] = {k: str(v) for k, v in ds.attrs.items() if k != "DIMENSION_LIST"}
            a = ds[:]
            valid = np.isfinite(a)
            if "_FillValue" in ds.attrs:
                valid &= a != ds.attrs["_FillValue"]
            return a, valid

        y, valid = read("soilMoisture")
        hh, ok = read("radarData/frequencyA/sigma0HH")
        valid &= ok & (hh > 0)
        hv, ok = read("radarData/frequencyA/sigma0HV")
        valid &= ok & (hv > 0)
        angle, ok = read("ancillaryData/localIncidenceAngle")
        valid &= ok
        flag, ok = read("retrievalQualityFlag")
        valid &= ok & ((flag & 1) == 0)
        water, ok = read("ancillaryData/waterbodyFraction")
        valid &= ok & (water == 0)
        valid &= (y >= 0) & (y <= 1) & (angle > 0) & (angle < 90)
        shape = y.shape
        rr, cc = np.nonzero(valid)
        hh_db = 10 * np.log10(hh[valid])
        hv_db = 10 * np.log10(hv[valid])
        frame = pd.DataFrame(
            {
                "row": rr,
                "col": cc,
                "hh_db": hh_db,
                "hv_db": hv_db,
                "hh_minus_hv_db": hh_db - hv_db,
                "incidence_angle_degrees": angle[valid],
                "soil_moisture_m3_m3": y[valid],
            }
        )
        coordinates = {}
        for name in [
            "xCoordinates",
            "yCoordinates",
            "xCoordinateSpacing",
            "yCoordinateSpacing",
            "projection",
        ]:
            if BASE + name in f:
                d = f[BASE + name]
                coordinates[name] = {
                    "shape": list(d.shape),
                    "attributes": {k: str(v) for k, v in d.attrs.items()},
                }
                if d.ndim == 0:
                    coordinates[name]["value"] = str(d[()])
    boundary, buffer = int(shape[1] * 0.7), 32
    train = frame[frame.col < boundary - buffer].copy()
    test = frame[frame.col >= boundary + buffer].copy()
    assert len(train) >= 100 and len(test) >= 100, "Insufficient valid spatial holdout pixels"
    assert train.col.max() < test.col.min()
    assert not frame.duplicated(["row", "col"]).any()
    model = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
    model.fit(train[FEATURES], train.soil_moisture_m3_m3)
    mean = DummyRegressor(strategy="mean").fit(train[FEATURES], train.soil_moisture_m3_m3)
    predictions = model.predict(test[FEATURES])
    naive = mean.predict(test[FEATURES])
    report = {
        "status": "research_only",
        "promotion_allowed": False,
        "task": "same-acquisition satellite soil-moisture retrieval surrogate",
        "target": BASE + "soilMoisture",
        "target_units": "m3/m3",
        "features": FEATURES,
        "model": "StandardScaler + Ridge(alpha=1.0)",
        "input": str(args.input.resolve()),
        "input_sha256": hashlib.sha256(args.input.read_bytes()).hexdigest(),
        "raster_shape": list(shape),
        "valid_pixels": len(frame),
        "train_n": len(train),
        "test_n": len(test),
        "buffer_excluded_n": len(frame) - len(train) - len(test),
        "split": {
            "axis": "raster columns",
            "boundary_column": boundary,
            "buffer_each_side_pixels": buffer,
            "selection": (
                "first 70% for training, last 30% for test, with buffer; selected before fitting"
            ),
        },
        "quality_screen": [
            "All selected datasets finite and nonfill",
            (
                "retrievalQualityFlag least significant bit = 0 (recommended), per "
                "embedded description"
            ),
            "waterbodyFraction = 0",
            "positive linear HH/HV",
            "0 < incidence angle < 90",
            "0 <= soil moisture <= 1",
        ],
        "model_metrics": score(test.soil_moisture_m3_m3, predictions),
        "mean_baseline_metrics": score(test.soil_moisture_m3_m3, naive),
        "dataset_attributes": attributes,
        "coordinates": coordinates,
        "limitations": [
            (
                "Target is a satellite retrieval derived from radar, not "
                "independent measured ground truth; radar inputs overlap retrieval "
                "inputs."
            ),
            "One acquisition only: no temporal holdout or future forecasting validation.",
            "Spatial buffer reduces proximity overlap but does not guarantee independent pixels.",
            (
                "Surface quality flag meanings were not assumed; screening uses "
                "the product recommendation bit plus water/physical checks."
            ),
            "No crop yield, damage or planting-plan predictions; not deployed.",
            (
                "L2 file excluded because it is a different acquisition date; L3 "
                "contains aligned radar and target grids."
            ),
            "No calibrated intervals or external validation.",
        ],
        "created_at_utc": datetime.now(UTC).isoformat(),
    }
    args.output.mkdir(parents=True, exist_ok=False)
    test["predicted_soil_moisture_m3_m3"] = predictions
    test["mean_baseline_m3_m3"] = naive
    test.to_csv(args.output / "predictions.csv", index=False)
    frame.to_csv(args.output / "features.csv", index=False)
    joblib.dump(
        {"model": model, "features": FEATURES, "target_units": "m3/m3"},
        args.output / "research-model.joblib",
    )
    np.testing.assert_allclose(
        joblib.load(args.output / "research-model.joblib")["model"].predict(test[FEATURES]),
        predictions,
    )
    (args.output / "model-card.json").write_text(json.dumps(report, indent=2) + "\n")
    (args.output / "README.md").write_text(
        "# HDF5 soil-moisture research model\n\nTrained on aligned radar "
        "predictors and recommended non-water soil-moisture retrievals in "
        "the L3 SME2 file. See model-card.json for quality masks, spatial "
        "holdout, metrics and limitations. This reproduces a satellite "
        "retrieval and does not validate ground soil moisture or crop "
        "yields. The L2 file was not joined across acquisition dates. "
        "Saved-model predictions were verified after reload.\n"
    )
    print(
        json.dumps(
            {
                k: report[k]
                for k in [
                    "train_n",
                    "test_n",
                    "valid_pixels",
                    "model_metrics",
                    "mean_baseline_metrics",
                ]
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
