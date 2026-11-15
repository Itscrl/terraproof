#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Git does not update ignored frontend/dist output. Build before every launch.
uv sync --frozen --python 3.12
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
exec .venv/bin/python -m uvicorn terraproof.api:app --host 127.0.0.1 --port "${PORT:-8000}"
