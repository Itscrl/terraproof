# Changelog

All notable changes to TerraProof are documented here. Entries describe completed repository changes; planned product capabilities are documented in the preparation plan. Unreleased changes remain under `Unreleased` until a release is published.

## [Unreleased]

### Added

- README progress handoff dated 15 November 2026: implemented features, NASA versus
  non-NASA sources, Field Shift alignment gaps, proposed water-allocation scope,
  next steps and current pre-push verification results.
- Farmer-facing explanations, readable chart legends/data tables and actionable
  soil-test checklists; explicit separation of missing data and source outages.
- Region-based crop/season guide replacing calculator navigation: seven versioned
  FAO crop profiles, ten completed NASA POWER weather years, reference-range checks,
  harvest-duration ranges and separately reported two-model NASA climate scenarios.
- Detailed satellite/place/road navigation, manual cached place search, optional
  device location and visible zoom controls; source science scales remain disclosed.
- Persistent browser field notebooks with saved plots, planting/management notes,
  user-provided pH-in-water records, portable backup import/export and removal undo.
- Expiring source caches with content-addressed archives, bounded scenario retries,
  reproducible public-source proof script, crop/season tests and maintenance runbook.
- Explicit future-soil-health scope: climate simulations do not model repeated-crop
  soil degradation; no soil-health forecast, yield or crop-success probability claimed.
- Global soil explorer as the primary workflow: NASA GIBS/Cesium globe, rectangular
  selection, coordinate fallback, soil depth/date controls, regional evidence and export.
- Bounded ISRIC SoilGrids WCS extraction for eight soil properties, area-weighted sample
  statistics, raw response caching/hashes and NASA POWER centroid wetness context.
  Real requests verified in Albay, Iowa, Kenya and Queensland; no whole-scene downloads required.
- Method-specific WoSIS historical phosphorus and salinity observations where compatible
  CC-BY records exist, with date/depth/positional uncertainty preserved. No regional
  prediction is filled from an unrelated point sample or incompatible nutrient test.
- NASA CMR/AppEEARS discovery script and source/layer evidence for global soil,
  moisture, reflectance, rainfall and radar products; documented streaming/cloud path.
- Hosted-mode host configuration and private saved-record isolation, numerical/API
  tests and globe browser verification. Public application deployment remains deferred.
- Read-only HDF5 inventory and streamed SHA-256/MD5 audit with optional NASA CMR
  archive verification; documented checksum failures for both supplied NISAR files.
  Satellite originals remain local and are excluded from Git and Docker contexts.
- Reproducible NASA POWER seven-day rainfall research training, temporal holdouts,
  seasonal/persistence benchmarks, portable JSON model, CLI inference and explicit
  research API endpoints. Test MAE is 38.67 mm versus 37.85 mm seasonal baseline;
  this is not trained on HDF5 and is not approved for operational recommendations.
- Leakage, missingness, integrity, inference and API tests; satellite recovery
  instructions, model card, observed evaluation and research references.
- Pinned runtime `requirements.txt` exported from `uv.lock`, with pip installation
  and regeneration instructions for environments that do not use uv.
- Frozen-install CI workflow, local Docker/Compose packaging, Windows launcher,
  operational/rollback guidance, and a reproducible local verification report.
- Updated setup and usage documentation distinguishing the verified native MVP,
  research readiness gates, broader challenge gaps and deferred cloud deployment.
- Responsive React/TypeScript planning workspace with editable calendars, climate
  comparison charts, stage/event evidence, independent economics and saved records.
- Self-hosted IBM Plex Sans, reusable interface components, documented design tokens,
  mobile table-scroll guidance, keyboard controls and pending/error/retry states.
- Playwright end-to-end, responsive, keyboard and axe accessibility checks; captures
  cover desktop, tablet and narrow mobile layouts.
- Python/FastAPI MVP with strict input contracts, NASA POWER acquisition/cache,
  immutable raw pilot snapshot (4,018 days, 2015–2025), source fingerprints,
  quality reporting, and versioned comparison JSON Schema.
- Historical rice-stage replay with configurable heat screening, documented rain
  indicators, leap/cross-year handling, missing-data propagation, and common-year
  comparison denominators. Indicators do not imply crop damage or yield loss.
- Editable PHP economics, itemized costs and break-even calculations; local SQLite
  comparisons and provenance-preserving JSON/CSV exports.
- Connected offline research pipeline from measured-label validation through
  preplant features, disjoint field/grid/time evaluation, Ridge/mean baselines,
  subgroup metrics, descriptive errors and research-only artifacts. Missing labels
  fail closed; no predictive model is deployed.
- Scientific threshold register, inferred 2026 Field Shift challenge mapping,
  verified NASA/Microsoft offer references, Azure roadmap, data dictionary and
  training runbook. Broader crop rotations remain a documented scope gap.
- Backend tests for real-data API persistence/exports, validation, missing values,
  boundaries, calendars, economic units and research leakage/readiness gates.
- Project README covering purpose, current status, proposed pilot scope, and documentation maintenance.
- Dataset Preparation and Machine Learning Plan covering source inventory, canonical observations, data quality, auditable features, outcome labels, evaluation design, and staged modeling.
- Governance requirements and readiness gates for predictive crop-outcome decision support.
- Changelog for tracking meaningful repository changes.

### Clarified

- The preparation plan stands on its own without relying on an attached product specification that is absent from this repository.
- Historical exposure, predicted crop outcomes, and economic scenario estimates require distinct evidence and validation.

### Fixed

- Close SQLite connections deterministically after each transaction to avoid relying
  on garbage collection during repeated save/export workflows.
