"""Check the deployment bundle in a minimal Linux Python container, without upstream APIs."""

import runpy
import tempfile
from pathlib import Path

app = runpy.run_path("api/index.py")["app"]

import httpx  # noqa: E402
import numpy as np  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from rasterio.io import MemoryFile  # noqa: E402
from rasterio.transform import from_bounds  # noqa: E402

from terraproof import places, soil  # noqa: E402

places.search_places = lambda q: {"places": [{"label": q}]}
with TestClient(app) as client:
    assert client.get("/api/health").json()["public_mode"] is True
    assert len(client.get("/api/planting/crops").json()["profiles"]) == 7
    assert client.get("/api/places/search?q=Legazpi").json()["places"][0]["label"] == "Legazpi"
    assert client.get("/api/comparisons").status_code == 403

# Exercise GDAL's TIFF driver and georeferencing, not only module import.
region = soil.SoilRegion(west=10, south=10, east=10.001, north=10.001)
with MemoryFile() as memory:
    with memory.open(
        driver="GTiff",
        width=1,
        height=1,
        count=1,
        dtype="int16",
        crs="EPSG:4326",
        nodata=-32768,
        transform=from_bounds(10, 10, 10.001, 10.001, 1, 1),
    ) as dataset:
        dataset.write(np.array([[54]], dtype="int16"), 1)
    raster = memory.read()

with tempfile.TemporaryDirectory() as cache:
    with httpx.Client(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, content=raster))
    ) as client:
        result = soil.map_property(client, region, "phh2o", Path(cache))
    assert result["status"] == "available", result
    assert result["median"] == 5.4, result
print("Minimal Linux runtime: public API, references and synthetic soil raster passed.")
