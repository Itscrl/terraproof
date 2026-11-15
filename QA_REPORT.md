# Local MVP verification

## Deployed assessment verification — 15 November 2026

Revision `b5af427` was deployed successfully. Real public calls for the generic
Albay sample returned:

- Soil assessment: HTTP 200, `available`, all eight SoilGrids properties present,
  with available NASA wetness. Observed request duration was approximately 5.3 s.
- Standard planting assessment: HTTP 200, available weather history, no history
  retrieval failures and seven crop results. Observed request duration was 2.7 s.
- Local regression for this revision: **54 Python tests passed**; lint and the
  production frontend build passed. The existing Cesium bundle-size warning and
  upstream TestClient deprecation warning remain.

Cache state was not controlled, so these timings are observations, not cold-start
benchmarks. A single sample does not demonstrate global provider availability,
agronomic accuracy or a production service-level guarantee.

## Public runtime diagnosis — 15 November 2026

GitHub Actions run 43712418170 for `f1f3665` passed its Python, production build and
Linux Chromium checks. The public frontend returned HTTP 200, but health, crop
catalog and search returned HTTP 500. The Vercel runtime log identified Rasterio's
missing `libexpat.so.1`; successful build status did not establish runtime health.

The deployment repair bundles/preloads the builder's Linux Expat library with its
MIT licence. Local lint/formatting, **50 Python tests** and production build pass.
The added AWS Python 3.12 container smoke test exercises native TIFF handling and
packaged public routes. Docker was not running locally, so that check must execute
in CI; deployment success must be verified against the public endpoints.

After deployment `a8e5a89`, health, crop catalog and real Legazpi search all returned
HTTP 200. The first container CI run correctly rejected an Ubuntu-native Expat
requiring GLIBC_2.36. CI now stages Expat from the target Amazon Linux 2023 image
via an explicit build-path override before running the same minimal-runtime check.

Run 43713500138 passed the minimal-runtime smoke test and the full Linux browser
suite. A subsequent real Albay soil request returned Vercel 504, exposing the
unbounded sequence of 45-second provider requests. Public soil and standard crop
assessment now share a 35-second provider budget, including streamed response
checks. New deterministic tests preserve cache reuse, missingness and absent crop
evidence after expiry. This changes request scheduling, not the soil/crop model.

## Redesigned interface regression — 15 November 2026

The supplied CI failures were caused by browser journeys targeting headings and
controls removed by the landing/globe/wizard redesign. Updated the journeys to
exercise the screens now mounted, with shared synthetic soil and planting API
fixtures. Removed-panel coverage is not presented as current UI coverage.

- Production TypeScript/Vite build: passed; 342 Cesium runtime assets copied.
  The existing large Cesium chunk warning remains.
- Browser suite: **6 passed, 1 skipped** on local Chrome at port 8018. Covers
  assessment failure/retry, invalid and changed bounds, evidence exports, notebook
  persistence/import protection, explicit place search, water/month/priority API
  requests, crop/rotation selections, final-report JSON and the print action.
- Coordinate keyboard navigation and the scoped `#soil-region` axe WCAG A/AA
  check passed. This is not a whole-application accessibility certification.
- Reviewed screenshots at 1440, 390 and 320 px. Tests also exercise 768 px,
  assert search-field bounds and interact with saved-plot forms at every width.
  Fixed drawer/toolbar overlap, clipped phone controls, unscrollable notebook
  content and next-step-caption contrast discovered during the checks.
- Live-provider retrieval was not rerun; its explicit opt-in check is skipped.
  These fixture-based checks establish interface behavior, not crop/market accuracy
  or public Vercel API availability. Linux CI must still run the pushed revision.

The local review server remains available at `http://127.0.0.1:8000/`.

## Production TypeScript build repair — 15 November 2026

Pulled interface revision `2d305c6` and reproduced its production build errors.
Removed unused React/showcase imports, an unused property-count variable and an
unused price-adjustment state setter (the adjustment remains zero). Added an
optional crop-illustration `className` prop that preserves the base SVG classes.
`pnpm build` now passes TypeScript and Vite with strict unused-symbol checks intact;
342 Cesium runtime assets are copied. The existing large Cesium chunk warning is
non-blocking. This verifies the local build command used in the supplied Vercel
log, not a completed Vercel deployment or renewed full UI regression.

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

## Contributor startup fix — 15 November 2026

- Reproduced the stale-build condition structurally: the previous launcher reused
  an existing ignored `frontend/dist/index.html`; Git pulls cannot update it.
- Updated Windows launcher exercised on isolated port 8017: frozen uv/pnpm setup,
  TypeScript/Vite rebuild with Cesium runtime assets, then successful API startup.
- Browser regression on port 8018: **5 passed, 1 live-provider test skipped**.
  The legacy planning URL now explicitly asserts a visible globe canvas and valid
  packaged Cesium asset JSON, outside the opt-in live-source test.
- Linux/macOS launcher supplied with the same fail-fast sequence; not executed on
  this Windows host. No new live-source or agricultural accuracy claim.
- Tracked-data inventory confirms all five reference files, schemas and input
  templates are in Git. Generated builds, caches and private local records remain
  excluded. Current backend suite evidence remains the prior 49-test pass; no
  Python application logic changed in this startup fix.

## Vercel API wiring — 15 November 2026

Public checks before the fix returned 404 from both `/api/health` and place search.
Added `frontend/api/index.py`, explicit same-origin rewrites, a web-runtime
requirements file and Python 3.12 selection. Build staging includes source and
public references only; caches and private data are excluded. Public storage goes
to the system temporary directory; local/private comparison APIs remain blocked.
Research inference is excluded from the lightweight function and remains local.

- Python suite: **50 passed**, including an isolated staged-function process with
  health, mocked search provider, real bundled crop catalog, host/public-mode and
  missing-route checks. This does not establish public upstream availability.
- Frontend production build: passed; 342 Cesium runtime files copied. Existing
  Cesium bundle-size warning remains. No UI code changed in this deployment fix.
- Live Vercel routing and provider responses require post-deployment verification.
  Root Directory must be frontend and outside-root build sources must be included.
