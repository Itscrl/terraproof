"""Exercise the packaged Vercel function in an isolated, fresh Python process."""

import shutil
import subprocess
import sys
from pathlib import Path

import pytest


def test_vercel_bundle_serves_api_without_local_state(tmp_path):
    node = shutil.which("node")
    if not node:
        pytest.skip("Node is required for the deployment packaging check")
    root = Path(__file__).resolve().parents[1]
    shutil.copytree(root / "src", tmp_path / "src", ignore=shutil.ignore_patterns("__pycache__"))
    shutil.copytree(root / "data/reference", tmp_path / "data/reference")
    shutil.copytree(
        root / "frontend/api",
        tmp_path / "frontend/api",
        ignore=shutil.ignore_patterns("__pycache__"),
    )
    (tmp_path / "frontend/scripts").mkdir()
    shutil.copy(root / "frontend/scripts/prepare-api.mjs", tmp_path / "frontend/scripts")
    shutil.copytree(root / "frontend/licenses", tmp_path / "frontend/licenses")
    subprocess.run(
        [node, "frontend/scripts/prepare-api.mjs"],
        cwd=tmp_path,
        check=True,
        capture_output=True,
        text=True,
    )
    check = r"""
import os, runpy
from pathlib import Path
os.environ["VERCEL_URL"] = "preview-terraproof.vercel.app"
app = runpy.run_path("frontend/api/index.py")["app"]
if __import__("sys").platform == "linux":
    assert Path("frontend/server_bundle/lib/libexpat.so.1").is_file()
    assert Path("frontend/server_bundle/lib/expat-MIT.txt").is_file()
from fastapi.testclient import TestClient
from terraproof import places, climate
assert "server_bundle" in str(climate.__file__)
assert str(climate.DATA).startswith(__import__("tempfile").gettempdir())
places.search_places = lambda q: {"places": [{"label": q, "latitude": 13.1, "longitude": 123.7}]}
with TestClient(app, base_url="https://preview-terraproof.vercel.app") as client:
    assert client.get("/api/health").json()["public_mode"] is True
    assert client.get("/api/places/search?q=Legazpi").json()["places"][0]["label"] == "Legazpi"
    assert len(client.get("/api/planting/crops").json()["profiles"]) == 7
    assert client.get("/api/comparisons").status_code == 403
    disabled = client.post("/api/research/rainfall/predict",
                           json={"issue_date":"2025-12-22"})
    assert disabled.status_code == 404
    assert client.get("/api/not-a-route").status_code == 404
print("Packaged function health, search, references, public isolation and API 404 verified")
"""
    result = subprocess.run(
        [sys.executable, "-c", check], cwd=tmp_path, capture_output=True, text=True
    )
    assert result.returncode == 0, result.stdout + result.stderr
