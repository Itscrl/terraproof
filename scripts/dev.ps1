$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not (Test-Path '.venv/Scripts/python.exe')) { throw 'Run uv sync --python 3.12 first.' }
if (-not (Test-Path 'frontend/dist/index.html')) { throw 'Build the UI with: cd frontend; pnpm install; pnpm build' }
& '.venv/Scripts/python.exe' -m uvicorn terraproof.api:app --host 127.0.0.1 --port 8000
