import csv
import json

from fastapi.testclient import TestClient

from terraproof.api import create_app
from terraproof.research import albay_data, model_reports


def test_albay_excludes_unadvertised_invalid_and_provincial_records(tmp_path, monkeypatch):
    context = tmp_path / "context"
    context.mkdir()
    (tmp_path / "manifest.json").write_text(
        json.dumps(
            {
                "advertised_years": [2025],
                "unverified_year_rows": 38,
                "landing_page": "https://example.org/source",
                "scraped_at_utc": "2026-11-15",
            }
        )
    )
    base = {
        "location": "Libon",
        "psgc": "0500507000",
        "year": "2025",
        "source_yield_value": "4.23",
        "geographic_level": "municipality_or_city",
        "year_advertised": "True",
        "requested_reporting_period": "Annual",
    }
    rows = [
        base,
        {**base, "year": "2026"},
        {**base, "source_yield_value": "nan"},
        {**base, "geographic_level": "province"},
        {**base, "psgc": "OTHER"},
    ]
    with (context / "municipal-yield-history.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(base))
        writer.writeheader()
        writer.writerows(rows)
    (tmp_path / "unverified-2026-responses.csv").write_text("must not be read")
    monkeypatch.setattr("terraproof.api.albay_data", lambda: albay_data(tmp_path))
    with TestClient(create_app(tmp_path / "db")) as client:
        response = client.get("/api/research/albay")
        assert response.status_code == 200
        result = response.json()
    assert result["available"] and not result["training_eligible"]
    assert result["role"] == "context_only"
    assert len(result["records"]) == 1
    assert result["records"][0]["yield_t_ha"] == 4.23
    assert result["excluded_rows"] == 4
    assert result["unverified_rows_excluded"] == 38
    assert result["geometry"] is None


def test_missing_local_data_is_explicit_and_reports_stay_read_only(tmp_path):
    assert albay_data(tmp_path)["available"] is False
    assert model_reports(tmp_path) == []
    with TestClient(create_app(tmp_path / "db")) as client:
        reports = client.get("/api/research/models").json()
    assert len(reports) == 3
    assert all(report["research_only"] for report in reports)
    soil = next(r for r in reports if r["id"] == "h5-soil-moisture-002")
    assert soil["unit"] == "percentage points"
    assert 3.7 < soil["average_error"] < 3.8
