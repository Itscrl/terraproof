import json
from datetime import date

import pandas as pd
import pytest

from terraproof.climate import days_between
from terraproof.training import ReadinessError, prepare, train_research


@pytest.fixture
def research_inputs(tmp_path):
    """Synthetic fixtures exercise wiring only; never evidence of crop-model accuracy."""
    parameters = {k: {} for k in ("T2M_MAX", "T2M_MIN", "PRECTOTCORR")}
    for d in days_between(date(2017, 1, 1), date(2022, 12, 31)):
        for key, value in zip(parameters, (30, 23, 5), strict=True):
            parameters[key][d.strftime("%Y%m%d")] = value
    snapshot = {
        "payload": {
            "header": {"fill_value": -999},
            "parameters": {
                k: {"units": "mm/day" if k == "PRECTOTCORR" else "C"} for k in parameters
            },
            "properties": {"parameter": parameters},
        }
    }
    (tmp_path / "synthetic.json").write_text(json.dumps(snapshot))
    manifest = {
        group: {
            "snapshot": "synthetic.json",
            "coordinates_verified": True,
            "spatial_linkage": "Synthetic test fixture, not a field dataset",
            "grid_id": f"synthetic-{group}",
        }
        for group in ("north", "south", "holdout")
    }
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest))
    labels = []
    for group, year in [("north", 2018), ("south", 2019), ("holdout", 2021)]:
        for i in range(6):
            labels.append(
                {
                    "field_id": f"{group}-{i}",
                    "location_group": group,
                    "planting_date": f"{year}-06-01",
                    "harvest_date": f"{year}-09-24",
                    "crop": "rice",
                    "variety": "TEST ONLY",
                    "area_ha": 1,
                    "yield_t_ha": 4 + i / 10,
                    "measurement_method": "measured",
                    "consent": True,
                    "outcome_source": "synthetic unit-test fixture",
                }
            )
    outcomes = tmp_path / "outcomes.csv"
    pd.DataFrame(labels).to_csv(outcomes, index=False)
    return outcomes, manifest_path


def test_connected_pipeline_and_holdouts(research_inputs, tmp_path):
    outcomes, manifest = research_inputs
    frame, audit = prepare(outcomes, manifest)
    assert len(frame) == 18
    assert all(frame.feature_available_through < frame.planting_date)
    assert audit["feature_version"] == "preplant-v1"
    output = tmp_path / "run"
    result = train_research(outcomes, manifest, output, ["holdout"], 2021)
    assert result["train_n"] == 12 and result["test_n"] == 6
    assert result["status"] == "research_only" and not result["promotion_allowed"]
    assert (output / "research-model.joblib").exists()
    scored = pd.read_csv(output / "predictions.csv")
    assert set(scored.location_group) == {"holdout"}
    assert set(scored.year) == {2021}
    with pytest.raises(FileExistsError):
        train_research(outcomes, manifest, output, ["holdout"], 2021)


def test_future_weather_does_not_change_preplant_features(research_inputs):
    outcomes, manifest = research_inputs
    original, _ = prepare(outcomes, manifest)
    path = manifest.parent / "synthetic.json"
    snapshot = json.loads(path.read_text())
    snapshot["payload"]["properties"]["parameter"]["T2M_MAX"]["20180602"] = 60
    path.write_text(json.dumps(snapshot))
    after, _ = prepare(outcomes, manifest)
    assert list(original.preplant_tmax_mean_c) == list(after.preplant_tmax_mean_c)


def test_duplicate_and_field_leakage_rejected(research_inputs):
    outcomes, manifest = research_inputs
    frame = pd.read_csv(outcomes)
    frame.loc[12, "field_id"] = frame.loc[0, "field_id"]
    frame.to_csv(outcomes, index=False)
    with pytest.raises(ReadinessError, match="one spatial"):
        prepare(outcomes, manifest)
    frame.loc[12] = frame.loc[0]
    frame.to_csv(outcomes, index=False)
    with pytest.raises(ReadinessError, match="Duplicate"):
        prepare(outcomes, manifest)


def test_no_consent_no_training_and_explicit_readiness_report(research_inputs, tmp_path):
    outcomes, manifest = research_inputs
    frame = pd.read_csv(outcomes)
    frame["consent"] = False
    frame.to_csv(outcomes, index=False)
    output = tmp_path / "blocked"
    with pytest.raises(ReadinessError, match="No eligible"):
        train_research(outcomes, manifest, output, ["holdout"], 2021)
    assert json.loads((output / "readiness.json").read_text())["status"] == "blocked"
    assert not (output / "research-model.joblib").exists()


def test_insufficient_spatial_sample_rejected(research_inputs, tmp_path):
    outcomes, manifest = research_inputs
    with pytest.raises(ReadinessError, match="Execution floor"):
        train_research(outcomes, manifest, tmp_path / "small", ["south", "holdout"], 2021)


def test_shared_grid_cannot_masquerade_as_independent_location(research_inputs, tmp_path):
    outcomes, manifest_path = research_inputs
    manifest = json.loads(manifest_path.read_text())
    manifest["holdout"]["grid_id"] = manifest["north"]["grid_id"]
    manifest_path.write_text(json.dumps(manifest))
    with pytest.raises(ReadinessError, match="Climate grid leakage"):
        train_research(outcomes, manifest_path, tmp_path / "leaked-grid", ["holdout"], 2021)
