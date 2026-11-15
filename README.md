# TerraProof

A working review build for **global regional soil assessment**. Navigate a NASA-imagery
globe, draw a rectangle, select soil depth/date and inspect mapped pH, carbon, texture,
CEC, bulk density, total nitrogen and recent NASA wetness context. Python/FastAPI
serves the React/TypeScript globe. Historical WoSIS P/EC observations appear separately
where compatible records exist.

Soil properties come from ISRIC SoilGrids' published prediction model; wetness comes
from NASA POWER. Small regional extracts avoid full-scene satellite downloads.
Results are regional estimates with explicit missingness and source provenance.
The farmer guide adds historical seasons, seven FAO crop-reference profiles,
indicative harvest timing and two separate NASA future-climate simulations.
No farm-level accuracy percentage, laboratory diagnosis or universal health score is claimed.
See [global sources and pipeline](docs/global-soil-assessment.md) and
[current status and accuracy](docs/status-and-accuracy.md).

## Guided rotation comparison — 15 November 2026

After assessing your land, open **What could I grow after this crop?** Choose your
first crop and planting month/year, your usual next crop and its planting month,
and two alternative next crops. The starting choices are examples, not local
recommendations; select crops you can obtain and sell or use at home.

TerraProof compares three two-season sequences using soil acidity and past NASA
seasonal temperatures. It explains approximate harvest windows, possible date
overlaps, published water-use tendencies, crop diversity and potential legume
contributions. Results say **Worth exploring**, **Needs checking** or **Potential
conflict**, with an explanation and checklist for a local adviser. New three-step
instructions guide farmers through land selection, soil assessment and crop plans.
A readable text download can be shared or printed; JSON preserves detailed evidence.
Changed choices flag old results and disable downloads until recalculation.

This is a deterministic proof of concept, not a validated agronomic rotation model.
Crops are screened separately; carry-over soil water, nutrient cycles, pest effects,
yield, income and soil-health changes are not simulated. Published water-use ranges
are not irrigation liters or proven savings. Priorities guide which trade-offs to
read, without declaring a winner. Seven FAO profiles are available; local suitability,
seeds, buyers, drainage and water capacity still need checking. The API endpoint is
`POST /api/rotations/assess`. See [rotation methods](docs/rotation-comparison.md).

## Progress snapshot — 15 November 2026

This README is the progress handoff for the current review build. Source control
publication and public application hosting are separate: the app runs locally;
no public deployment or cloud infrastructure has been provisioned.

| Area | Completed progress | Remaining boundary |
| --- | --- | --- |
| Global exploration | Interactive Cesium globe, rectangular selection, coordinate entry, place search, optional device location and detailed imagery/road layers | Provider access is required; selected coordinates do not establish a surveyed field boundary |
| Soil assessment | Eight predicted properties: pH, organic carbon, clay, sand, silt, CEC, bulk density and total nitrogen; depth selection, coverage, spatial summaries and JSON export | Regional SoilGrids estimates, not a laboratory test or independent farm-level validation |
| Historical soil observations | Compatible WoSIS phosphorus and electrical-conductivity records with method, date, depth and access conditions | Coverage is uneven; missing observations remain missing |
| NASA environmental context | Fourteen-day POWER wetness/rainfall/skin-temperature context and ten complete prior weather years | Coarse regional context; not measured moisture in individual crop beds |
| Farmer crop guide | Seven versioned FAO crop profiles, pH/seasonal-temperature screening, farmer preferences and published harvest-duration ranges | Not a calibrated suitability, yield or crop-success model |
| Future climate exploration | Two NEX-GDDP-CMIP6 climate models, separate model results and SSP2-4.5/SSP5-8.5 pathway choices | Climate simulations, not forecasts of a particular season or future soil health |
| Farm notebook | Browser-persisted plots, planting/management notes, user-entered laboratory pH records, backup import/export and removal undo | Single-browser records; no shared accounts, cloud sync or independently verified labels |
| Reproducibility | Bounded source requests, cache expiry, content hashes, provenance, crop references and source-verification scripts | Source discovery alone does not mean a dataset is integrated |
| Operational preparation | Local launcher, frozen dependencies, container recipe, configurable hosts and public-mode isolation of private comparisons | Public hosting, production load tests and multi-user operations remain unverified |
| Retained research | Historical rice replay, economics APIs, outcome-training readiness gates and a reproducible rainfall experiment | The rainfall model underperforms its baseline and is blocked from operational advice |

### NASA resources actually used

| Source | Implemented use |
| --- | --- |
| NASA POWER | Numerical historical temperature/rainfall and relative soil-wetness context used by assessment and crop-season services |
| NASA GIBS / Blue Marble | Static globe reference imagery for navigation; not analytical soil measurements |
| NASA NEX-GDDP-CMIP6 | Optional future-climate scenario extraction from ACCESS-CM2 and MRI-ESM2-0 |
| ISRIC SoilGrids and WoSIS | Soil predictions and historical observations; these are additional **non-NASA** sources |
| FAO crop references | Published crop requirements and duration ranges; these are **non-NASA** references |

NASA POWER is included in the reproduced 2026 Field Shift resource list. The
[official challenge](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/)
remains authoritative; its resource page was not directly retrievable during the
latest check. See the [local event reproduction](https://hackathlone.com/challenges/adapting-farms-with-nasa-data)
and [research register](docs/research-and-platforms.md) for the evidence boundary.
NEX and GIBS are additional NASA integrations, not a claim that every integrated
source appears in the challenge resource list. SMAP, GPM IMERG, HLS/Landsat,
ECOSTRESS, SRTM and GRACE analysis are **not currently integrated**.

### Product direction and next work

The global opportunity under discussion is practical planning for farmers,
agricultural advisers, cooperatives and irrigation organizations. The proposed
water-allocation pivot asks: **"Given the water available until the next refill,
which crop beds should receive it, how much, and when?"** The initial proposed
users are growers with several separately watered beds and a measurable supply.
This is a research direction, not a completed calculator or validated service.

Next work, subject to local agronomic evidence and product prioritization:

1. Compare actual multi-season crop sequences, including the current practice,
   with explicit soil, crop, water, labor and market constraints. A preliminary two-season comparison is implemented; coupled soil/water effects
   and independent agronomic validation remain future work.
2. Prototype a water budget using bed areas, crop stages, root-zone water storage,
   recent irrigation, delivery losses, available volume and next-refill timing.
   Compare weather scenarios and explain shortages; do not invent exact liters
   from crop names or coarse satellite pixels alone.
3. Include practical alternatives such as irrigation repair, storage, wells or
   pipelines using locally assessed capacity, cost and reliability. A satellite
   cannot certify that a particular well will supply enough usable water.
4. Validate decisions with farmers and advisers against existing crop calendars
   and advisory practice; obtain independent measured outcomes before claiming
   improved yield, soil health, water savings or predictive accuracy.
5. Complete deployment and operations gates before public multi-user release.

### Latest pre-push verification

Checks rerun on 15 November 2026:

- Python lint and formatting: passed; 20 source/test files checked for formatting.
- Python suite: **46 passed**; one upstream Starlette/httpx deprecation warning.
- Frontend production build: passed; the split-loaded Cesium bundle still emits
  Vite's large-chunk warning (approximately 3.98 MB / 1.06 MB gzip).
- Browser regression: **4 passed, 1 skipped** on isolated port 8015. The skipped
  test requires explicit opt-in to live soil-provider access; this run does not
  re-establish live-source availability or agricultural accuracy.
- Local launch check: `/api/health` reported `ok`; the homepage returned HTTP 200
  at `http://127.0.0.1:8000`.

See [QA_REPORT.md](QA_REPORT.md) for earlier live-source observations, test scope
and unresolved production/scientific validation requirements.

The calculator has been removed from navigation. Older `?workspace=planning` links
now enter the region-based explorer. Historical rice-replay and research code remain
in the repository, with their earlier pilot limits documented below.

The pilot is an illustrative rice calendar near Legazpi, Albay, Philippines
(13.1391° N, 123.7438° E). It replays planting years 2015–2024 using an archived
2015–2025 NASA dataset. The planning workflow does **not** forecast weather, predict crop damage,
recommend a winning plan, or validate a particular rice variety.

## Run locally

Requirements: Python 3.12+, [uv](https://docs.astral.sh/uv/), Node 24,
and pnpm 11.25.0. All Python and JavaScript dependency resolutions are locked.
The archived rice-pilot dataset needs no network connection. The global soil,
planting and navigation features require access to their public data services.

From this repository in PowerShell:

```powershell
uv sync --frozen --python 3.12
Set-Location frontend
pnpm install --frozen-lockfile
pnpm build
Set-Location ..
uv run uvicorn terraproof.api:app --host 127.0.0.1 --port 8000
```

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** for the globe. Port 8000 is
the default local launch address; earlier review checks also used port 8001.
Public hosting is the product target; this preview address is for acceptance testing.
Subsequent starts can use `./scripts/dev.ps1`. On Linux/macOS use `cd` instead of
`Set-Location`. Run from this checkout; reference data and frontend build are shipped
alongside the Python source, rather than packaged into a standalone wheel.

For UI development, keep the Python server running and run `pnpm dev` in `frontend`;
Vite proxies `/api` to port 8000. Rebuild before checking the single-server experience.

For a pip-based Python environment, activate a Python 3.12+ virtual environment and run:

```powershell
python -m pip install -r requirements.txt
python -m pip install --no-deps -e .
```

The second command installs TerraProof and its CLI from this checkout. The requirements
file contains pinned runtime dependencies; development tools remain in the uv `dev`
group. After updating `uv.lock`, regenerate it with:

```powershell
uv export --frozen --no-dev --no-emit-project --no-hashes --format requirements.txt --output-file requirements.txt
```

## Try the primary workflow

1. Search a village/address, use **My location**, or rotate/zoom the Earth. Switch
   between satellite detail and **Places & roads** to find the land. Click **Draw a region**, then click two opposite corners.
   **Edit coordinates** provides keyboard selection. **Globe view** returns to Earth.
2. Select depth and wetness end date, then **Assess selected region**.
3. Expand properties for units, coverage, spatial range and source retrieval details.
4. Read data gaps and download the soil-test checklist. Inspect NASA wetness with
   its plain-language explanation and numerical table.
5. Set planting month/year, water context and priority. **Explore crops and past
   seasons** compares seven reference profiles with the same region.
6. Open a crop for published time-to-harvest ranges and remaining checks. Optionally
   **Explore future climate** under one of two emissions pathways.
7. Save the plot and keep planting/management notes and laboratory pH observations
   in the browser notebook. Export a backup before changing devices or clearing data.

Requests work for land regions worldwide within the documented bounds. The default
Albay rectangle is an example, not a geographic restriction. Live providers require
network access; missing or unavailable evidence is reported explicitly.

Crop suggestions are an explicit pH/seasonal-temperature screen, not a validated
suitability or yield model. Future climate does not predict future soil health or
guarantee stable weather. See [methods and proof of concept](docs/farmer-guide-and-validation.md)
and [maintenance/backup instructions](docs/maintenance.md).

## Historical research retained in the repository

- NASA acquisition, raw snapshots, metadata/checksums, explicit units, quality flags,
  local caching and provenance exports.
- Stage/season heat screening, days with rain ≥20 mm, rainfall total and longest
  <1 mm dry spell. Missing stays missing; averages use years complete for every plan.
- Earlier economics and saved-comparison APIs remain for historical compatibility;
  their calculator interface is no longer routed. Public mode disables saved comparisons.
- Offline research: measured outcome validation → preplant features → spatial/time
  holdout → Ridge/mean baseline comparison → metrics and model card. No auto-promotion.
- Backend/pipeline/browser tests, CI, and a local container recipe.

## Training and reproducibility

An additional **research-only seven-day rainfall model** is trained and callable
through the CLI and API. It uses NASA POWER, not the supplied HDF5 inputs: both local
NISAR files failed NASA checksum and HDF5 integrity checks. The model's test MAE
(38.67 mm) is worse than the seasonal baseline (37.85 mm); operational use is blocked.
See [satellite diagnosis, results and runnable commands](docs/satellite-and-rainfall-research.md).

```powershell
uv run terraproof replay --output artifacts/replay.json
uv run terraproof train --outcomes data/templates/outcomes.csv --manifest data/templates/climate-manifest.json --holdout-groups held-out-region --test-from-year 2022 --output artifacts/readiness-check
```

The training command **exits 2 by design** with a readiness report because no real
outcome labels were supplied. See [the training runbook](docs/training.md) to connect
consented measured labels and mapped climate snapshots. Synthetic test fixtures prove
wiring only; they are not agricultural validation. Stage A is implemented; later
stages retain the [preparation plan's](docs/dataset-preparation-and-ml-plan.md) gates.

## Verification

```powershell
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest -q
Set-Location frontend
pnpm build
pnpm test:e2e
```

Local browser tests use installed Chrome; CI installs Chromium. Tests start a
temporary Python server if port 8000 is free, using ignored `artifacts/e2e-data`.
See [QA_REPORT.md](QA_REPORT.md) for observed results and limits. Restricted Windows
runners may need permission to spawn browser processes and access test temp folders.

## Documentation

- [Global soil explorer, NASA catalog and small-data pipeline](docs/global-soil-assessment.md)
- [Delivery status, challenge alignment and accuracy claims](docs/status-and-accuracy.md)
- [Scientific evidence, NASA challenge and Azure roadmap](docs/research-and-platforms.md)
- [Source register and data dictionary](docs/data-contracts.md)
- [Training pipeline and readiness gates](docs/training.md)
- [NISAR integrity checks and trained rainfall experiment](docs/satellite-and-rainfall-research.md)
- [Architecture, API and operations](docs/operations.md)
- [Product decisions](PRODUCT.md), [build notes](BUILD_NOTES.md), [design system](DESIGN.md)
- [Verification report](QA_REPORT.md), [changelog](CHANGELOG.md)

The inferred challenge is **2026 Field Shift: Adapting Farms with NASA Data**. This
soil/season guide supplies part of its evidence foundation, with crop profiles and
farmer preferences. Preliminary rotation screening is implemented; rotation-impact simulation and
validated recommendations remain future work. NASA's 2026 offer names
Azure and Planetary Computer; credits,
eligibility and quotas need verification. No cloud resources have been deployed.

## Storage and delivery boundary

`data/local/` holds SQLite, `data/cache/` live snapshots, and `artifacts/` research
runs; all are ignored by Git. `TERRAPROOF_DATA_DIR` relocates writable application
data. Back up SQLite before upgrades. Public reference data is tracked separately.

The review build keeps private saved comparisons in single-user local storage.
For public soil hosting, use `TERRAPROOF_PUBLIC_MODE=1` and explicitly configure
`TERRAPROOF_ALLOWED_HOSTS`; this disables saved-comparison API access. Private
multi-user accounts/storage remain future work. See the global pipeline's launch
gates before hosting. Optional local packaging: `docker compose up --build`; it binds port
8000 to loopback and uses persistent volumes. Container verification is reported
separately from native verification.

## Contributing

Update `CHANGELOG.md` under `Unreleased`, distinguish completed work from plans,
retain provenance, and use descriptive commits such as `feat: add historical replay`.
No project software license has been assigned; dependency/data terms remain their
owners' terms. NASA data access does not confer a blanket project license.

## Submission and requirements handoff

Use [the submission brief](docs/submission-brief.md) for a consistent project
summary, challenge requirement mapping, NASA-source description, user workflow,
validation status and limits. [Rotation methods](docs/rotation-comparison.md)
define the implemented rules. Current verification: **49 Python tests passed**,
**5 browser tests passed / 1 live-data test skipped**, lint/format and production
build passed. Earlier progress snapshots retain their original dates and scope.
