# Vercel: frontend and Python API

## Native-library startup repair — 15 November 2026

After routing was deployed, public requests reached the Python function but failed
with HTTP 500. The dashboard runtime log showed Rasterio could not import because
`libexpat.so.1` was absent. This affected health/search as well as soil assessment,
since Rasterio is imported while the application starts.

The Linux staging step now copies the builder's Expat shared library (dereferencing
its symlink) and its upstream MIT licence into `server_bundle/lib`. The function
loads that absolute library path globally before importing the application.
Windows/macOS local builds do not redistribute a Linux library. A Linux builder
without Expat fails explicitly rather than producing a known broken bundle.

CI additionally installs only the web requirements inside the AWS Python 3.12
minimal runtime image and checks the packaged API plus a synthetic georeferenced
TIFF. This checks native-loader compatibility beyond Ubuntu/Windows unit tests;
it does not replace public deployment and real-provider checks below.

The Ubuntu CI runner first acquires Expat from an official Amazon Linux 2023
container and supplies its path through `TERRAPROOF_EXPAT_LIBRARY` during staging.
Copying Ubuntu's own library into Lambda fails because it needs GLIBC_2.36.
Vercel's Amazon Linux builder uses its system library by default. The override
supports other Linux build environments; the library must match the target ABI.

Public verification after `a8e5a89`: health, seven-profile catalog and real Legazpi
place search all returned HTTP 200. This establishes startup and those requests,
not full real-provider soil/season performance.

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

The first real public soil request exceeded the 60-second function duration.
Public soil and standard planting assessments now share a 35-second provider
budget with shorter per-request timeouts and streamed-body deadline checks.
Fresh cached sources remain usable after that budget expires; unfinished sources
return unavailable/partial evidence with retry explanations, without invented
values. Local-review requests retain their previous provider timeout settings.
This is a cooperative I/O budget, not a hard real-time execution guarantee.
Future-climate extraction can still exceed the hosting limit; that older explorer
is not mounted in the current UI. Upstream service access, geocoder policies and rate limits still
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
