# Source register and data contracts

Version: `replay-v1` / `comparison-v1`; verified 2026-11-14.

## Acquired source

| Attribute | Source |
| --- | --- |
| Owner | NASA POWER / NASA GMAO meteorology |
| Product | POWER Daily API v2.10.3; payload sources `MERRA2`, `POWER` |
| Parameters and units | `T2M_MAX`, `T2M_MIN` in °C; `PRECTOTCORR` in mm/day |
| Time | 2015-01-01 through 2025-12-31; 4,018 daily rows; explicit LST |
| Geography | Requested 13.1391, 123.7438; returned 123.744, 13.139, elevation 88.79 m |
| Spatial meaning | POWER point lookup; ~0.5° × 0.625° meteorology, not a surveyed field |
| Missing sentinel | Declared −999 → null; absent dates/readings remain missing |
| Quality | 0 flagged days under implemented checks; not proof of field accuracy |
| Rights/access | Public NASA API, no key; retain attribution, request and metadata. See research register for policies. No NASA endorsement. |
| Use | Historical heat/rain screening, not labels for crop damage |
| Limits | Coarse reanalysis; no plot soil water, wind, flood depth or crop outcomes |

Exact retrieval time, request URL, definitions, geometry and header are retained in
`data/reference/albay-power-2015-2025.json`. Derived `quality-report.json` records
checks and the payload digest. Payload SHA-256 hashes Python
`json.dumps(payload, sort_keys=True).encode()`; training snapshot digests hash the
entire file bytes. These deliberately different fingerprints are not interchangeable.

`terraproof fetch-pilot` refuses an existing output. Refresh into a new file, review
differences, then deliberately update the tracked source and report. Live caches
are reused, not silently refreshed or substituted with synthetic values.

## Canonical schemas

Executable validation: `src/terraproof/models.py`. Versioned JSON Schema:
`data/schemas/comparison-v1.schema.json`. Current API schema: `/openapi.json`.
Unknown fields and nonfinite numeric requests are rejected.

| Grain / object | Fields |
| --- | --- |
| Climate day × point | ISO date, nullable `tmax_c`, `tmin_c`, `rain_mm`, quality flags |
| Location | WGS84 latitude/longitude; 12.7–13.6 N, 123.2–124.2 E pilot box is an engineering bound, not an Albay polygon |
| Crop plan | Unique name, rice variety/calendar label, month/day, ordered Vegetative/Reproductive/Ripening durations, economics |
| Stage | Name, 1–150 days each; total ≤240 days; these are input bounds, not agronomic cutoffs |
| Plan × season × planting year | Planting/harvest dates, stage summaries, full daily rows; crossing calendar years is supported |
| Economics | ha, t/ha, PHP/kg, itemized `*_php_ha`, ISO assumption date, market/source note |
| Observed field × season | Pseudonymous field ID, spatial group, crop/variety, dates, measured yield, provenance, consent |
| Saved comparison | UUID, title, UTC created-at, full request/result including source hash and feature/rule metadata |

NASA dates follow LST, not Philippine civil-clock boundaries. Recurring February 29
is rejected, but February 29 inside a season is retained. Sowing is day zero; harvest
is sowing + total duration −1. No nursery/transplant age is inferred.

## Quality and missingness

- Preserve original response values/metadata separately from derived rows.
- Duplicate JSON keys fail ingestion rather than overwrite daily values.
- Broad engineering plausibility checks: −90 to 65 °C, 0–2,000 mm/day, Tmin ≤ Tmax.
  These are **not crop-damage thresholds**. Unit mismatches fail closed.
- Zero remains zero. No imputation. Missing rain makes its complete window's rainfall
  total, heavy-rain count and longest dry spell unavailable; observed event dates remain.
- Missing Tmax invalidates heat totals. Missing Tmin is flagged but does not invalidate
  indicators that use only Tmax/rain. Missing days break observed dry runs.
- Averages use the intersection of years complete for every plan's required indicators;
  the denominator is visible. No unequal-year averages are compared.
- Stage/season dry runs stop at their window boundaries. The mean of seasonal maxima
  is a season average, not a continuous multi-year maximum.

## Economics

Harvest kg = ha × assumed t/ha ×1,000. Revenue = harvest kg × PHP/kg. Each cost is
PHP/ha × ha rounded half-up to cents. Sum displayed cost components; net = displayed
revenue − total costs. Break-even price is undefined for zero harvest; break-even
yield is undefined for zero selling price. “Net return” is a scenario margin using
included costs, not audited household income or a forecast.

## Outcome CSV and climate manifest

`data/templates/outcomes.csv` has only a header: no fabricated labels. Columns:
`field_id`, `location_group`, `planting_date`, `harvest_date`, `crop` (= rice),
`variety`, `area_ha`, `yield_t_ha`, `measurement_method` (= measured for inclusion),
`consent` (= true for inclusion), `outcome_source`.

One row is one field-season. Reject duplicate field/planting dates and fields in
multiple spatial groups. Use pseudonymous IDs and a private collection protocol.
A CSV consent flag does not replace actual informed consent.

Manifest example (paths relative to the manifest):

```json
{
  "your-spatial-group": {
    "snapshot": "relative/path/to/nasa-snapshot.json",
    "grid_id": "verified-native-cell-or-conservative-spatial-block",
    "coordinates_verified": true,
    "spatial_linkage": "Describe field/grid method, distance, resolution and reviewer"
  }
}
```

Use the wrapper emitted by `fetch_power`/`save_snapshot`, including `payload`.
Grid IDs must reflect verified geography, not arbitrary farm names. Shared grid IDs
across training/test fail. Incorrect IDs can still conceal leakage; correlated nearby
events require buffered splits and domain review. Soil/management inputs remain
unavailable, not assumed to be zero or inferred from the demonstration coordinate.

## Rotation reference comparison — rotation-screen-v1

`RotationRequest` extends the validated soil/planting request with a first crop,
usual next crop, exactly two distinct alternatives, next month and stated goal.
Only seven catalog IDs are accepted. The next season rolls into the following
year when its planting month is no later than the first month. Published duration
bounds flag possible calendar overlap. Results retain the request, crop reference
sources, catalog version, soil provenance, historical weather provenance and
per-crop complete-season counts. No missing values become zeros. This is separate
from the archived rice comparison schema; see [rotation rules](rotation-comparison.md).
