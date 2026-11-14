import json
from datetime import date

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from terraproof.api import create_app
from terraproof.climate import ROOT, ClimateError
from terraproof.forecast import FEATURES, examples, features_at, predict_rainfall, train_rainfall

SNAPSHOT = ROOT / "data/reference/albay-power-2015-2025.json"


@pytest.fixture(scope="module")
def rainfall_run(tmp_path_factory):
    directory = tmp_path_factory.mktemp("rainfall") / "run"
    card = train_rainfall(SNAPSHOT, directory)
    return directory, card


def test_features_cannot_see_future_and_missing_is_excluded():
    frame = pd.DataFrame(
        {"rain_mm": 2.0, "tmax_c": 30.0, "tmin_c": 20.0},
        index=pd.date_range("2020-01-01", periods=100),
    )
    issue = date(2020, 2, 3)
    before = features_at(frame, issue)
    frame.loc["2020-02-04":, "rain_mm"] = 900
    assert features_at(frame, issue) == before
    records, _ = examples(frame)
    row = records[records.issue_date == str(issue)].iloc[0]
    assert row.target_rain_mm == 6300
    assert row.rain_7d == 14
    frame.loc["2020-02-03", "rain_mm"] = np.nan
    with pytest.raises(ClimateError, match="30 complete"):
        features_at(frame, issue)
    records, excluded = examples(frame)
    assert excluded > 0
    assert str(issue) not in records.issue_date.to_list()


def test_real_pipeline_disjoint_targets_and_prediction_round_trip(rainfall_run):
    directory, card = rainfall_run
    assert card["training_target_end"] < card["evaluation"]["validation"]["issue_start"]
    assert (
        card["evaluation"]["validation"]["target_end"] < card["evaluation"]["test"]["issue_start"]
    )
    assert not card["promotion_allowed"]
    assert not card["satellite_inputs_used"]
    predictions = pd.read_csv(directory / "predictions.csv")
    row = predictions.iloc[-1]
    result = predict_rainfall(
        directory / "model.json", SNAPSHOT, date.fromisoformat(row.issue_date)
    )
    assert result["predicted_rain_mm"] == pytest.approx(row.ridge_mm)
    assert result["research_only"] and not result["operational_use_allowed"]
    # JSON scaler statistics must be derived exclusively from training examples.
    samples = pd.read_csv(directory / "features.csv")
    training = samples[samples.target_end < "2021-01-01"]
    model = json.loads((directory / "model.json").read_text())
    np.testing.assert_allclose(model["mean"], training[FEATURES].mean())
    bundled = json.loads((ROOT / "data/reference/rainfall-research-v1/model.json").read_text())
    for key in ("mean", "scale", "coefficients", "intercept"):
        np.testing.assert_allclose(model[key], bundled[key], rtol=1e-10, atol=1e-10)
    assert predictions.issue_date.is_unique
    targets = pd.to_datetime(predictions.issue_date).sort_values()
    assert (targets.diff().dropna().dt.days >= 7).all()


def test_inference_and_output_gates(rainfall_run, tmp_path):
    directory, _ = rainfall_run
    for issue in (date(2020, 12, 1), date(2026, 1, 5)):
        with pytest.raises(ClimateError):
            predict_rainfall(directory / "model.json", SNAPSHOT, issue)
    with pytest.raises(ClimateError, match="already exists"):
        train_rainfall(SNAPSHOT, directory)
    with pytest.raises(ClimateError, match="at least"):
        train_rainfall(SNAPSHOT, tmp_path / "short", 2025, 2026)
    model = json.loads((directory / "model.json").read_text())
    model["coordinates_lon_lat"] = [120, 10]
    changed = tmp_path / "changed.json"
    changed.write_text(json.dumps(model))
    with pytest.raises(ClimateError, match="training point"):
        predict_rainfall(changed, SNAPSHOT, date(2025, 12, 22))
    model["scale"][0] = 0
    changed.write_text(json.dumps(model))
    with pytest.raises(ClimateError, match="scale"):
        predict_rainfall(changed, SNAPSHOT, date(2025, 12, 22))


def test_research_api_is_explicit_and_rejects_out_of_range(tmp_path):
    with TestClient(create_app(tmp_path / "test.sqlite3")) as client:
        card = client.get("/api/research/rainfall")
        assert card.status_code == 200
        assert card.json()["promotion_allowed"] is False
        result = client.post("/api/research/rainfall/predict", json={"issue_date": "2025-12-22"})
        assert result.status_code == 200
        assert result.json()["operational_use_allowed"] is False
        assert (
            client.post(
                "/api/research/rainfall/predict", json={"issue_date": "2026-11-15"}
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/api/research/rainfall/predict", json={"issue_date": "bad", "yield": 4}
            ).status_code
            == 422
        )
