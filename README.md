# TerraProof

A local working MVP for comparing rice planting dates through **real NASA POWER
historical climate replay** and **editable economic assumptions**. Python/FastAPI
serves a React/TypeScript workspace and persists comparisons in SQLite.

The pilot is an illustrative rice calendar near Legazpi, Albay, Philippines
(13.1391° N, 123.7438° E). It replays planting years 2015–2024 using an archived
2015–2025 NASA dataset. It does **not** forecast weather, predict crop damage,
recommend a winning plan, or validate a particular rice variety.

## Run locally

Requirements: Python 3.12+, [uv](https://docs.astral.sh/uv/), Node 24,
and pnpm 11.25.0. All Python and JavaScript dependency resolutions are locked.
The bundled historical dataset needs no account, secret, or network connection.

From this repository in PowerShell:

```powershell
uv sync --frozen --python 3.12
Set-Location frontend
pnpm install --frozen-lockfile
pnpm build
Set-Location ..
uv run uvicorn terraproof.api:app --host 127.0.0.1 --port 8000
```

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.
Subsequent starts can use `./scripts/dev.ps1`. On Linux/macOS use `cd` instead of
`Set-Location`. Run from this checkout; reference data and frontend build are shipped
alongside the Python source, rather than packaged into a standalone wheel.

For UI development, keep the Python server running and run `pnpm dev` in `frontend`;
Vite proxies `/api` to port 8000. Rebuild before checking the single-server experience.

## Try the primary workflow

1. Change the June and July sowing dates. Expand each calendar to change its name,
   variety label, or approximate stage durations.
2. Replay the same years. Compare heat and heavy-rain counts, then inspect one year,
   crop stages, and flagged dates.
3. Open **Farm economics**, replace the illustrative area, yield, selling price,
   costs, market and date, and recalculate. Exposure never changes assumed yield.
4. Save a comparison. **Saved comparisons** reopens its original result and provenance;
   export daily CSV or the complete JSON evidence bundle.
5. **Evidence & methods** explains thresholds. Live NASA mode can retrieve another
   point in the pilot bounding box; failures are explicit.

Defaults are illustrations, not market quotes. Recurring annual calendars reject
February 29 and impossible dates. Stages count from **sowing**, not transplanting.

## Implemented capabilities

- NASA acquisition, raw snapshots, metadata/checksums, explicit units, quality flags,
  local caching and provenance exports.
- Stage/season heat screening, days with rain ≥20 mm, rainfall total and longest
  <1 mm dry spell. Missing stays missing; averages use years complete for every plan.
- Itemized per-hectare costs, scenario net return and break-even calculations.
- SQLite persistence, protected CSV exports, responsive React UI, pending/error/retry
  states and keyboard-accessible evidence tables.
- Offline research: measured outcome validation → preplant features → spatial/time
  holdout → Ridge/mean baseline comparison → metrics and model card. No auto-promotion.
- Backend/pipeline/browser tests, CI, and a local container recipe.

## Training and reproducibility

```powershell
uv run terraproof replay --output artifacts/replay.json
uv run terraproof train --outcomes data/templates/outcomes.csv --manifest data/templates/climate-manifest.json --holdout-groups held-out-region --test-from-year 2022 --output artifacts/readiness-check
```

The training command **exits 2 by design** with a readiness report because no real
outcome labels were supplied. See [the training runbook](docs/training.md) to connect
consented measured labels and mapped climate snapshots. Synthetic test fixtures prove
wiring only; they are not agricultural validation. Stage A is implemented; later
stages retain the [preparation plan's](docs/dataset-preparation-and-ml-plan.md) gates.

## Explore the connected Albay data

Open **Albay data** in the sidebar to select a municipality on the map, change the
reporting year/period, inspect yield history and download the context records.
The page also displays saved research results from the HDF5, IRRI and PSA experiments.
These are archived results, not on-demand farm predictions or model promotion.

The local context dataset is read from `data/external/albay-public/context/`.
If it is absent in a fresh checkout, run `python scripts/scrape_albay_rice.py` with
the project dependencies and internet access, then reload the page. Missing data
has an explicit empty state; the application does not fabricate or silently replace it.
The read-only endpoints are `/api/research/albay` and `/api/research/models`.
Unadvertised years and nonmunicipal rows are filtered server-side. Raw downloads,
model binaries and rejected 2026 values are not served.

## Additional local research experiments

The [research reports](docs/research-runs/README.md) record PSA province-yield,
NISAR HDF5 soil-moisture and IRRI experimental grain-yield runs. These are isolated
research scripts, not application predictions. Candidate selection uses a validation
split before final evaluation. The HDF5 model estimates a satellite retrieval;
the IRRI experiment uses historical trial data from one Laguna station, without an
independent spatial holdout. Neither validates Albay farm outcomes or planting advice.
Raw observations and model binaries remain local; source metadata, acquisition scripts,
metrics and limitations are tracked. See the [alternative source register](data/external/rice-alternatives/README.md).

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

- [Scientific evidence, NASA challenge and Azure roadmap](docs/research-and-platforms.md)
- [Source register and data dictionary](docs/data-contracts.md)
- [Training pipeline and readiness gates](docs/training.md)
- [Architecture, API and operations](docs/operations.md)
- [Product decisions](PRODUCT.md), [build notes](BUILD_NOTES.md), [design system](DESIGN.md)
- [Verification report](QA_REPORT.md), [changelog](CHANGELOG.md)

The inferred challenge is **2026 Field Shift: Adapting Farms with NASA Data**. This
rice-calendar MVP is a subset; rotations, soil analysis and validated recommendations
remain future work. NASA's 2026 offer names Azure and Planetary Computer; credits,
eligibility and quotas need verification. No cloud resources have been deployed.

## Storage and delivery boundary

`data/local/` holds SQLite, `data/cache/` live snapshots, and `artifacts/` research
runs; all are ignored by Git. `TERRAPROOF_DATA_DIR` relocates writable application
data. Back up SQLite before upgrades. Public reference data is tracked separately.

This is a **single-user loopback MVP**, without accounts. Hosted use needs the
identity/ownership/storage work in the operations roadmap before private farm data
is collected. Optional local packaging: `docker compose up --build`; it binds port
8000 to loopback and uses persistent volumes. Container verification is reported
separately from native verification.

## Contributing

Update `CHANGELOG.md` under `Unreleased`, distinguish completed work from plans,
retain provenance, and use descriptive commits such as `feat: add historical replay`.
No project software license has been assigned; dependency/data terms remain their
owners' terms. NASA data access does not confer a blanket project license.
