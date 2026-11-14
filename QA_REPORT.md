# Local MVP verification

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
