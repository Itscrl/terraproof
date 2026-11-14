"""Local application API. Keep loopback-only until an identity boundary is added."""

import csv
import io
import json
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from . import __version__
from .climate import DATA, ROOT, ClimateError, load_climate
from .models import Comparison, Contract, Economics
from .replay import RULES, economics, replay
from .storage import Store


class RainfallRequest(Contract):
    issue_date: date


def create_app(db_path: Path | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(db_path or DATA / "local" / "terraproof.sqlite3")
        yield

    app = FastAPI(title="TerraProof", version=__version__, lifespan=lifespan)
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"]
    )

    class SecurityHeaders(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            # Same-origin JSON API: disallow browser writes from a different site.
            origin = request.headers.get("origin")
            if request.method not in {"GET", "HEAD", "OPTIONS"} and origin:
                if origin not in {
                    "http://localhost:8000",
                    "http://127.0.0.1:8000",
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                }:
                    return Response("Cross-origin writes are disabled", status_code=403)
            response = await call_next(request)
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Referrer-Policy"] = "no-referrer"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
            )
            return response

    app.add_middleware(SecurityHeaders)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": __version__, "mode": "local-mvp"}

    @app.get("/api/config")
    def config():
        return {
            "defaults": Comparison().model_dump(mode="json"),
            "rules": RULES,
            "pilot": "Albay, Philippines · illustrative rice calendar",
            "model_status": "No validated outcome model; research pipeline available via CLI",
        }

    @app.post("/api/compare")
    def compare(request: Comparison):
        try:
            rows, quality, provenance = load_climate(request)
            return replay(request, rows, quality, provenance)
        except ClimateError as exc:
            raise HTTPException(503, str(exc)) from exc

    @app.get("/api/research/rainfall")
    def rainfall_card():
        try:
            path = ROOT / "data/reference/rainfall-research-v1/model-card.json"
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise HTTPException(503, "Rainfall research report unavailable") from exc

    @app.post("/api/research/rainfall/predict")
    def rainfall_prediction(request: RainfallRequest):
        from .forecast import predict_rainfall

        try:
            return predict_rainfall(
                ROOT / "data/reference/rainfall-research-v1/model.json",
                ROOT / "data/reference/albay-power-2015-2025.json",
                request.issue_date,
            )
        except ClimateError as exc:
            raise HTTPException(422, str(exc)) from exc

    @app.post("/api/economics")
    def calculate(values: Economics):
        return economics(values)

    @app.get("/api/comparisons")
    def list_comparisons():
        return app.state.store.list()

    @app.post("/api/comparisons", status_code=201)
    def save_comparison(request: Comparison):
        # Compute server-side; never persist client-supplied results as verified evidence.
        return app.state.store.save(compare(request))

    @app.get("/api/comparisons/{record_id}")
    def get_comparison(record_id: UUID):
        record = app.state.store.get(str(record_id))
        if not record:
            raise HTTPException(404, "Saved comparison not found")
        return record

    @app.delete("/api/comparisons/{record_id}", status_code=204)
    def delete_comparison(record_id: UUID):
        if not app.state.store.delete(str(record_id)):
            raise HTTPException(404, "Saved comparison not found")
        return Response(status_code=204)

    @app.get("/api/comparisons/{record_id}/daily.csv")
    def export(record_id: UUID):
        result = get_comparison(record_id)["result"]
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(
            [
                "plan",
                "planting_year",
                "date",
                "tmax_c",
                "tmin_c",
                "rain_mm",
                "quality_flags",
                "source_sha256",
                "feature_version",
            ]
        )
        for plan in result["plans"]:
            # Spreadsheet formula injection protection for user-entered names.
            name = plan["name"]
            if name.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")):
                name = "'" + name
            for season in plan["seasons"]:
                for row in season["daily"]:
                    writer.writerow(
                        [
                            name,
                            season["year"],
                            row["date"],
                            row["tmax_c"],
                            row["tmin_c"],
                            row["rain_mm"],
                            ";".join(row["quality_flags"]),
                            result["provenance"]["sha256"],
                            result["feature_version"],
                        ]
                    )
        return Response(
            output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="terraproof-daily.csv"'},
        )

    dist = ROOT / "frontend" / "dist"
    if dist.exists():
        app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
    return app


app = create_app()
