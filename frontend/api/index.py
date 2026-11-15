"""Same-origin public FastAPI function for the Vite Vercel project."""

import os
import sys
import tempfile
from pathlib import Path

bundle = Path(__file__).resolve().parents[1] / "server_bundle"
sys.path.insert(0, str(bundle / "src"))
os.environ["TERRAPROOF_DATA_DIR"] = str(Path(tempfile.gettempdir()) / "terraproof")
os.environ["TERRAPROOF_PUBLIC_MODE"] = "1"
hosts = {"localhost", "127.0.0.1", "testserver", "terraproof-nu.vercel.app"}
hosts.update(filter(None, os.getenv("TERRAPROOF_ALLOWED_HOSTS", "").split(",")))
for name in ("VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
    if os.getenv(name):
        hosts.add(os.environ[name])
os.environ["TERRAPROOF_ALLOWED_HOSTS"] = ",".join(sorted(hosts))

from terraproof.api import app  # noqa: E402

# Offline model inference needs the full research environment, not the public web runtime.
app.router.routes = [
    route
    for route in app.router.routes
    if getattr(route, "path", "") != "/api/research/rainfall/predict"
]
