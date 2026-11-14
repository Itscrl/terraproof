from fastapi.testclient import TestClient

from terraproof.api import create_app
from terraproof.climate import ClimateError


def test_full_real_data_save_reopen_export_and_delete(tmp_path):
    path = tmp_path / "test.sqlite3"
    with TestClient(create_app(path)) as client:
        config = client.get("/api/config").json()
        request = config["defaults"]
        response = client.post("/api/compare", json=request)
        assert response.status_code == 200
        result = response.json()
        assert result["common_complete_years"] == list(range(2015, 2025))
        assert result["quality"]["flagged_days"] == 0
        assert result["provenance"]["header"]["sources"] == ["MERRA2", "POWER"]
        assert len(result["provenance"]["sha256"]) == 64
        request["plans"][0]["name"] = "=1+1"
        record = client.post("/api/comparisons", json=request).json()
        assert client.get("/api/comparisons").json()[0]["id"] == record["id"]
    # New connection/application instance proves disk persistence.
    with TestClient(create_app(path)) as client:
        record_id = record["id"]
        stored = client.get(f"/api/comparisons/{record_id}").json()
        assert stored["result"]["provenance"] == result["provenance"]
        csv = client.get(f"/api/comparisons/{record_id}/daily.csv")
        assert "'=1+1" in csv.text
        assert len(csv.text.splitlines()) == 2301
        assert client.delete(f"/api/comparisons/{record_id}").status_code == 204
        assert client.get(f"/api/comparisons/{record_id}").status_code == 404


def test_invalid_scope_dates_host_and_cross_origin(tmp_path):
    with TestClient(create_app(tmp_path / "db")) as client:
        request = client.get("/api/config").json()["defaults"]
        request["latitude"] = 14
        assert client.post("/api/compare", json=request).status_code == 422
        request["latitude"] = 13.1391
        request["plans"][0]["planting_month"] = 2
        request["plans"][0]["planting_day"] = 30
        assert client.post("/api/compare", json=request).status_code == 422
        assert (
            client.post(
                "/api/compare", json={}, headers={"Origin": "https://evil.example"}
            ).status_code
            == 403
        )
        assert client.get("/api/health", headers={"Host": "evil.example"}).status_code == 400


def test_upstream_failure_is_actionable(tmp_path, monkeypatch):
    def fail(_):
        raise ClimateError("NASA POWER request failed; use bundled data or retry later")

    monkeypatch.setattr("terraproof.api.load_climate", fail)
    with TestClient(create_app(tmp_path / "db")) as client:
        request = client.get("/api/config").json()["defaults"]
        response = client.post("/api/compare", json=request)
        assert response.status_code == 503
        assert "bundled" in response.json()["detail"]
