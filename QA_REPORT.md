# Local MVP verification

## Pre-push regression — 15 November 2026

- Python lint and formatting: passed (`ruff check src tests` and
  `ruff format --check src tests`; 20 files already formatted).
- Python tests: **46 passed**, using workspace-local `.cache/pytest-prepush`.
  One upstream Starlette/httpx deprecation warning remains.
- Production build: passed. The lazy-loaded Cesium engine chunk is approximately
  3.98 MB / 1.06 MB gzip and still triggers Vite's size warning.
- Browser regression: **4 passed, 1 skipped** using `TERRAPROOF_TEST_PORT=8015`.
  The live-source soil test was not opted into; deterministic tests cover soil
  assessment/error recovery, crop/future evidence, plot records/backups and place search.
- The local launch was checked separately at port 8000: health `ok`, homepage
  HTTP 200. No new claim of live-provider availability, field accuracy or public
  deployment follows from this regression run.

The earlier observations below retain their original dates and scopes.

## Global soil explorer — 15 November 2026

Earlier review preview: `http://127.0.0.1:8001`. Global hosting is the intended
delivery; no public application deployment has been performed.

| Check | Result | Evidence |
| --- | --- | --- |
| Numerical/API suite | PASS | **38 tests**; prior suite plus region bounds, raster geometry/masks/scaling, cache integrity, response-size cap, NASA units/missingness, hosted host/origin/private-record boundaries, WoSIS method/depth/licence filtering and duplicate handling |
| Full browser regression | PASS | **5 tests**, including live soil flow and the retained climate/economics journeys |
| Real globe journey | PASS | Globe renders NASA tiles; two-corner selection, coordinate entry, depth changes, assessment, pending/error/retry, stale-selection notice and JSON download exercised |
| Real global source checks | PASS for retrieval | Eight SoilGrids properties and NASA wetness retrieved in Albay, Iowa, Kenya and Queensland; no field accuracy inferred |
| Missing indicator extension | PASS for implemented scope | Bulk density and total nitrogen use separate /100 scaling. Queensland returned compatible Olsen-P and ECe observations; Albay returned no compatible observations |
| Public mode | PASS in API tests | Explicit hosted domain and same-origin request accepted; untrusted host/origin rejected; saved comparisons disabled |
| Mobile / accessibility | PASS in tested states | 1440, 768, 390, 320 px, no page overflow; axe WCAG A/AA tags scanned on initial/error/report states; coordinate fields provide keyboard alternative to WebGL |
| Production build | PASS | TypeScript and Vite; Cesium runtime assets copied and loaded. Globe engine chunk ~3.97 MB / ~1.06 MB gzip triggers the documented size warning; split-loaded, not a performance certification |
| Source discovery | PASS | Eight exact CMR queries found one collection each; AppEEARS SMAP/HLS product/layer metadata saved in `docs/evidence/global-soil-catalog-20261115.json` |
| Design inspector | PASS in scanned states | 0 findings at 1440, 768 and 390 px; real report captures also reviewed at 320 px |
| Independent visual review | SHIP for scored fixes | Five refreshed captures accepted; map framing/selection outline corrected, globe-first design documentation persisted; no remaining material findings |
| Soil predictive accuracy | NOT ESTABLISHED independently | Published SoilGrids model used; no independent TerraProof laboratory holdout, calibrated intervals or global accuracy percentage |
| Public hosting / load / field usability | UNVERIFIED | No hosted deployment, production load test, agronomic trial, screen-reader or field-user study performed |

Live browser check (explicit network use):

```powershell
$env:TERRAPROOF_TEST_PORT='8001'
$env:TERRAPROOF_LIVE_SOIL='1'
pnpm --dir frontend exec playwright test --reporter=line
```

Run from `frontend` with `pnpm exec playwright test` if pnpm's directory option is
unavailable. CI skips the opt-in live-source test; synthetic fixtures test behavior
and are never presented as agricultural accuracy. Actual real-data captures are
under `frontend/test-results/soil-live-soil-selection-and-real-data-evidence/`:
`globe-initial-desktop.png`, `soil-desktop.png`, `soil-768.png`, `soil-390.png`,
`soil-320.png`. Generated screenshots are ignored. NASA imagery is attributed in-app;
no generated bitmap illustration or mock satellite data was used.

The initial browser pass caught missing Cesium runtime paths and a dependency CSP
conflict; the final integration uses the engine directly, correct asset directories
and `wasm-unsafe-eval` without enabling JavaScript `unsafe-eval`. A separate visual
check caught the geographic tile-matrix mismatch; the corrected standard Web Mercator
tile path was verified against NASA's Cesium example and real browser imagery.

See [status and accuracy](docs/status-and-accuracy.md) for supported claims and the
conditional challenge-alignment assessment. Historical reports below remain scoped
to their original implementation dates.

## Research extension — 15 November 2026

- `pytest -q`: **29 passed**, including the original suite plus HDF5 corruption,
  archive checksum, external-storage rejection, future-data exclusion, incomplete
  windows, temporal splits, training-only scaling, JSON inference round trips and
  research API boundaries. One upstream Starlette/httpx deprecation warning remains.
- `ruff check src tests` and `ruff format --check src tests`: passed.
- Real POWER training completed: 308 training, 103 validation and 156 test weeks.
  Bundled coefficients reproduce from the training command; test MAE 38.67 mm,
  versus 37.85 mm for the training-only monthly mean. No operational promotion.
- CLI prediction for issue date 2025-12-22 returned 118.4069 mm for December 23–29,
  with source/model fingerprints and explicit research-only limitations. This is a
  historical model output, not verified field rainfall or a current forecast.
- Both supplied NISAR files failed file-level NASA MD5 comparison and HDF5 reads.
  The read-only audit rejects them; originals are intact and excluded from Git.
  NASA public metadata was accessible; replacement data returned Earthdata HTTP 401.
- No HDF5 model was trained. The rainfall experiment uses NASA POWER exclusively.
  [Audit, recovery steps and evaluation](docs/satellite-and-rainfall-research.md).
- The React UI was not changed in this extension. Browser/build evidence below is
  from the original MVP acceptance, not a claim of a new browser test run.

## Original MVP acceptance

Date: **14 November 2026 (Asia/Manila)**. Environment: Windows, Python 3.12.14,
Node 24.22.1, React 19.3.1, Vite 7.3.8, Playwright 1.65.0, installed Google Chrome.
Application: `http://127.0.0.1:8000`, built React assets served by FastAPI.
Dependency versions are resolved in the committed locks; source revision is the
commit containing this report (no cloud release has been published).

| Check | Result | Evidence |
| --- | --- | --- |
| NASA acquisition | PASS | Public daily API v2.10.3 fetched successfully; real 2015–2025 Albay snapshot retained |
| Live source and cache | PASS | Real `/api/compare` request for 2024 planting year fetched NASA data in 1.69 s; repeat reused identical provenance in 0.02 s; 0 flagged days |
| Data quality | PASS for implemented checks | 4,018 expected days, 0 flagged; complete raw metadata and SHA-256 in `data/reference/quality-report.json` |
| Python behavior | PASS | `pytest -q`: **22 passed**; source/units/missingness, threshold equality, leap/cross-year dates, economics, API/storage/CSV and training gates |
| Python style | PASS | `ruff check src tests`, `ruff format --check src tests`: all pass |
| React production build | PASS | TypeScript strict compile and Vite build successful |
| Main browser journey | PASS | Real NASA replay → change date → recalculate economics → save → reload → reopen → JSON/CSV download → delete own test record |
| Invalid/error behavior | PASS | Invalid date rejected; simulated 503 displayed; retry recovered; pending changes clearly marked |
| Browser runtime | PASS in tested journey | No page errors captured by Playwright |
| Responsive layout | PASS in checked views | Comparison at 1440, 768, 390, 320 CSS px; other three views at 1440/390; no page-level horizontal overflow |
| Automated accessibility | PASS in scanned states | axe-core checks with wcag2a/wcag2aa/wcag21aa tags return no violations at tested widths/views |
| Keyboard checks | PASS for tested controls | Skip link focus/activation, native forms, focusable horizontal-scroll table regions |
| Visual review | SHIP for scored fix | Fresh reviewer found missing mobile table-scroll cue; visible cue added; reviewer confirmed resolved at 390/320 without visible regression |
| Design inspector | PASS with noted warnings | 0 failures; small-text and offscreen data-hue warnings explained below |
| Training wiring | PASS | Synthetic test fixtures exercise prepare/train/holdout/model artifact path; never agricultural accuracy evidence |
| Real-label readiness gate | PASS | CLI with empty supplied template exits 2; `readiness.json`: “No observed outcome labels were supplied”; no model generated |
| Field predictive validity | NOT ESTABLISHED | No real crop outcome labels, calibrated intervals or agronomic validation supplied |
| Container runtime | UNVERIFIED | Docker CLI present, Linux engine pipe unavailable because Docker Desktop engine was not running |
| GitHub Actions | CONFIGURED, NOT RUN REMOTELY | Workflow includes frozen install, Python checks, frontend build and Chromium browser tests |
| Azure deployment | NOT PERFORMED | Local acceptance first; no offer activated, credit assumed or resource created |
| Screen reader / field usability | UNVERIFIED | Automated and keyboard checks are not inclusive field-user testing or WCAG certification |
| Performance | BUILD SIZE ONLY | JS 253.32 kB / ~79.02 kB gzip; CSS 15.84 kB / ~4.11 kB gzip. No field Core Web Vitals claim |

## Reproduce

```powershell
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest -q
Set-Location frontend
pnpm build
pnpm test:e2e
```

This restricted runner used `.venv/Scripts/pytest.exe` with a workspace-local
`--basetemp=.cache/pytest-final` and permission to spawn processes. Initial sandbox
temp/process failures were environmental; the successful run completed outside that
restriction. An upstream Starlette warning notes future TestClient migration from
httpx to httpx2; it does not fail the tests. The lock retains the tested runtime.

Browser evidence is reproducible under
`frontend/test-results/workspace-responsive-pages-accessibility-and-visual-evidence/`:
`comparison-1440.png`, `comparison-768.png`, `comparison-390.png`, `comparison-320.png`,
`farm-1440.png`, `farm-390.png`, `evidence-1440.png`, `evidence-390.png`,
`saved-1440.png`, `saved-390.png`. Generated test captures are ignored by Git.

## Reviewed design warnings

The taste inspector found no failing measurements. Its 11–12px text warning covers
axis ticks, data labels, provenance and secondary notes; principal controls/data are
13–14px and headings 18–26px. At tablet width its first-fold data-hue warning occurs
because the teal comparison chart follows the stacked calendars. The full-page
capture does contain the data hue. The source lint's monospace warning applies only
to the SHA-256 fingerprint, an identifier. These warnings are recorded, not silently
reported as absent. Fresh screenshot review assessed the working interface.

## Observed reference result

For default June 1 / July 1 sowing, 115-day calendar, 2015–2024 shared years:
mean rain ≥20 mm days = **7.1 / 8.9**; mean longest dry spell = **3.7 / 3.5 days**;
both have zero daily Tmax ≥35 °C in this particular coarse-grid replay. Zero does
not establish field safety. Illustrative economics yield PHP45,000.00 net per plan
at one hectare; a two-hectare browser test produces PHP90,000.00 as expected.

## Remaining delivery boundaries

The local MVP is usable for historical comparison and scenario arithmetic. Hosted
private-data use requires identity/ownership/storage work. Predictive advice requires
representative measured labels and independent scientific/agronomic review. Soil,
crop rotations, field water balance and additional NASA products are documented
extensions, not claimed completed integrations. See `docs/operations.md` for rollback,
backup, deployment gates and source-refresh procedures.

## Guided rotation regression — 15 November 2026

- Python suite: **49 passed**, including crop-choice validation, missing evidence,
  calendar overlap, year rollover, source retention and rotation API coverage.
- Ruff lint and formatting: passed (22 source/test files formatted).
- Production TypeScript/Vite build: passed; the existing Cesium chunk-size warning remains.
- Browser suite: **5 passed, 1 skipped** on port 8016. The live-soil opt-in test was
  skipped. The new journey covers three-plan comparison, readable text download,
  changed-input guards, provider error/retry, duplicate selections, desktop/mobile
  overflow checks and axe WCAG A/AA checks for the rotation section.
- Mobile rendered output inspected at 390px; desktop and mobile captures are in
  ignored `frontend/test-results/rotation-1440.png` and `rotation-390.png`.
- Synthetic fixtures establish interaction/calculation behavior, not agricultural
  accuracy. Live providers were not revalidated in this regression. No user trial,
  yield improvement, water saving or soil-health benefit is established.
