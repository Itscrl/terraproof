# Changelog

All notable changes to TerraProof are documented here. Entries describe completed repository changes; planned product capabilities are documented in the preparation plan. Unreleased changes remain under `Unreleased` until a release is published.

## [Unreleased]

### Added

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
