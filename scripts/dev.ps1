param([ValidateRange(1, 65535)][int]$Port = 8000)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

# dist is ignored by Git. A pull updates source, not an existing local build.
# Always rebuild, and never start the server if a setup/build command fails.
Get-Command uv, pnpm -ErrorAction Stop | Out-Null
Write-Host 'Preparing TerraProof from the current checkout...'
uv sync --frozen --python 3.12
if ($LASTEXITCODE -ne 0) { throw 'Python setup failed. Fix the error above and retry.' }
pnpm --dir frontend install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Frontend setup failed. Fix the error above and retry.' }
pnpm --dir frontend build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed. The server was not started.' }
Write-Host "Opening the current globe build at http://127.0.0.1:$Port"
& '.venv/Scripts/python.exe' -m uvicorn terraproof.api:app --host 127.0.0.1 --port $Port
