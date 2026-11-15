"""Synthetic evidence tests decision boundaries, not agronomic accuracy."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_planting import weather

from terraproof import rotations
from terraproof.api import create_app


def request(**kwargs):
    return rotations.RotationRequest(
        west=123.7, east=123.8, south=13.1, north=13.2, planning_year=2027, **kwargs
    )


def history():
    return {
        "rows": weather(),
        "first_year": 2023,
        "last_year": 2024,
        "status": "available",
        "provenance": [{"source": "synthetic test fixture"}],
    }


def test_comparison_dates_sources_water_and_missing_evidence():
    report = rotations.compare_rotations(request(), {"median": 6}, history())
    assert len(report["options"]) == 3
    baseline, legume, maize = report["options"]
    assert baseline["baseline"] and not legume["baseline"]
    assert baseline["seasons"][0]["planting_reference"] == "2027-06-01"
    assert baseline["seasons"][1]["planting_reference"] == "2027-12-01"
    assert "Nitrogen contribution depends" in legume["soil_note"]
    assert "overlap" in legume["water_note"]  # soybean/rice reference ranges overlap
    assert "not irrigation liters" in report["method"]["water"]
    assert "not simulated" in report["method"]["sequence"]
    missing = rotations.compare_rotations(request(), {"median": None}, history())
    assert all(o["status"] == "Needs checking" for o in missing["options"])
    assert "evidence is missing" in missing["options"][0]["next_steps"][0]
    assert maize["seasons"][1]["reference"]["source"].startswith("https://")


def test_overlap_and_year_rollover_are_explicit():
    overlap = rotations.compare_rotations(request(next_month=7), {"median": 6}, history())
    assert all(o["status"] == "Potential conflict" for o in overlap["options"])
    assert all(o["overlap"] for o in overlap["options"])
    rollover = rotations.compare_rotations(request(next_month=2), {"median": 6}, history())
    assert rollover["options"][0]["seasons"][1]["planting_reference"] == "2028-02-01"
    assert not rollover["options"][0]["overlap"]


def test_invalid_duplicates_and_api_contract(monkeypatch, tmp_path):
    with pytest.raises(ValidationError):
        request(alternatives=["rice_indica", "maize"])
    with pytest.raises(ValidationError):
        request(first_crop="invented")
    monkeypatch.setattr(rotations, "map_property", lambda *a: {"median": 6})
    monkeypatch.setattr(rotations, "power_history", lambda *a: history())
    with TestClient(create_app(tmp_path / "test.sqlite3")) as client:
        result = client.post("/api/rotations/assess", json=request().model_dump(mode="json"))
        assert result.status_code == 200
        assert len(result.json()["options"]) == 3
        assert "rows" not in result.json()["history"]
        invalid = request().model_dump(mode="json")
        invalid["next_month"] = 13
        assert client.post("/api/rotations/assess", json=invalid).status_code == 422
