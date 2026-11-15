# Vercel: frontend and Python API

## Why search returned 404

The Vite interface sends requests to /api on the same domain. The earlier static
hosting deployment had no Python function at those paths. The Vite development
proxy only runs on a development server; it does not become a production proxy.

## Project settings

For this repository's existing Vercel frontend project:

- Root Directory: **frontend**.
- Framework Preset: **Vite** (explicit in frontend/vercel.json).
- Enable **Include source files outside of the Root Directory in the Build Step**.
  The build must read ../src/terraproof and ../data/reference. Missing source causes
  an explicit build error rather than deploying another UI-only version.
- Use the install/build/output commands from frontend/vercel.json; remove conflicting
  dashboard command overrides if present. The output directory is dist.
- Python: frontend/.python-version selects 3.12. frontend/requirements.txt installs
  the web runtime, not the larger research-training environment.

The account/project settings cannot be changed by pushing repository files alone.
Do not declare the API working until the checks below pass on the public domain.

## Packaging and routes

The install and build steps run scripts/prepare-api.mjs. It stages fresh Python
source and public reference JSON under frontend/server_bundle, preserving the
source tree's path conventions. Generated bundles are ignored by Git and never
include data/cache, local databases, credentials or the supplied HDF5 files.
Docker's frontend build stage also includes those source inputs.

frontend/api/index.py exposes the FastAPI app. /api/* rewrites to that function;
other application paths use the SPA fallback, with static assets served from dist.
The function includes the staged source/reference directory and excludes frontend
source/dependency/static folders from its Python bundle. Temporary caches live in
the system temporary directory and are ephemeral, not shared durable storage.
Public hostnames come from the Vercel deployment environment and explicit allowed
hosts. Public comparison-record APIs are blocked. The research rainfall inference
route is omitted because its training stack is not part of the web runtime.

The 60-second function duration can constrain cold multi-source assessments and
future-climate extraction; a successful search does not establish all workloads
fit that limit. Upstream service access, geocoder policies and rate limits still
apply. Multiple instances do not share the local geocoder lock/cache; broader
production use needs a managed geocoder/shared rate limiter and durable jobs/cache.

## Verification

1. Build: pnpm --dir frontend build.
2. Backend regression: uv run pytest -q (includes isolated bundle test).
3. After deployment, GET /api/health must return JSON with status ok and public_mode true.
4. GET /api/planting/crops must return the seven-profile JSON catalog.
5. GET /api/places/search?q=Legazpi must return a places array or a descriptive
   upstream-service error, rather than a Vercel NOT_FOUND page.
6. GET /api/comparisons must remain blocked. Check the globe's static runtime assets.

References: https://vercel.com/docs/functions/runtimes/python/api-directory and
https://vercel.com/docs/functions/runtimes/python .
