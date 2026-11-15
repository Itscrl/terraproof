# Farmer guide: methods, proof of concept and validation limits

Updated 15 November 2026, Asia/Manila. This extension replaces calculator navigation
with a region-based farmer workflow. It remains a local review build without a
public application deployment.

## The question TerraProof helps investigate

“What could I plant here, and how can I keep this land productive over the years?”
The implemented system provides regional soil estimates, historical environmental
context, a transparent crop shortlist, indicative time to harvest and exploratory
future climate scenarios. It does **not** yet simulate how repeated planting changes
soil health. A climate projection is not a soil-health trajectory.

Farm notebooks make repeated use practical: save a named rectangle, record actual
planting dates and management notes, retain pH-in-water laboratory observations and
export/import records. These are user-provided records, not automatically verified
labels, independent validation or inputs to a soil-health forecast.

## Research and data register

| Evidence | Implemented role | Limit |
| --- | --- | --- |
| [Poggio et al., SoilGrids 2.0 (2021)](https://doi.org/10.5194/soil-7-217-2021) | Regional predicted soil properties | Native 250 m support; map summaries are not field diagnoses |
| [FAO Ecocrop](https://www.fao.org/geospatial/data-and-tools/data-portals/ecocrop/en) and species sheets below | Preferred and broader temperature/pH reference ranges | Species-level descriptors, not cultivar-specific response functions; sheet pH method is not specified |
| [FAO crop-water manual, tables 6 and 14](https://www.fao.org/4/s2022e/s2022e07.htm) | Indicative duration and crop water-use ranges | Duration depends on local variety and conditions; water use is not rainfall requirement |
| [NASA POWER meteorology](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/) | Ten complete prior years at the centroid | Coarse grid; not a field weather station or a next-year forecast |
| [NASA NEX-GDDP-CMIP6](https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/) and [Thrasher et al. (2022)](https://doi.org/10.1038/s41597-022-01393-4) | Daily temperature/precipitation from two bias-corrected downscaled climate simulations | 0.25° cells; free-running climate, not actual future daily weather |
| [WoSIS (2024)](https://doi.org/10.5194/essd-16-4735-2024) | Separate historical laboratory references | Sparse and method-specific; may overlap SoilGrids training data |
| [FAO conservation-agriculture principles](https://www.fao.org/conservation-agriculture/overview/conservation-agriculture-principles/en) | Crop-diversification and management context | Not a calibrated numerical effect for this farmer's field |

Seven profiles are versioned in `data/reference/crop-requirements-v1.json`, including
species, FAO record ID, source URL, retrieval time and source HTML SHA-256. The pH
comparison uses SoilGrids pH in water against a generic Ecocrop reference; because
the sheet does not specify a laboratory method, that comparison is approximate.
It is not a basis for a liming prescription.

| Crop / exact FAO species record | Preferred temperature °C | Preferred pH | Indicative days | Indicative water use mm |
| --- | --- | --- | --- | --- |
| [Maize, Zea mays 2175](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=2175) | 18–33 | 5–7 | 125–180 | 500–800 |
| [Rice, indica 8143](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=8143) | 25–35 | 5–8 | 90–150 | 450–700 |
| [Sorghum 48747](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=48747) | 22–35 | 5.5–7.5 | 120–130 | 450–650 |
| [Soybean 1150](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1150) | 20–33 | 5.5–6.5 | 135–150 | 450–700 |
| [Potato 1971](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1971) | 15–25 | 5–6.2 | 105–145 | 500–700 |
| [Wheat 2114](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=2114) | 15–23 | 6–7 | 120–150 | 450–650 |
| [Groundnut 2199](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=2199) | 22–32 | 5.5–6.5 | 130–140 | 500–700 |

The broad absolute envelopes are also preserved in the catalog. They are not daily
heat-damage/frost thresholds. Paddy land preparation, seepage and other water needs
are additional to the indicative evapotranspiration range. No irrigation-adequacy
classification is derived by comparing rain totals with that range.

## Reproducible pipeline

1. The selected rectangle/depth reaches `POST /api/planting/assess`. Python obtains
   its pH map estimate server-side, avoiding client-provided numbers posing as evidence.
2. NASA POWER supplies `T2M`, `T2M_MIN`, `T2M_MAX`, `PRECTOTCORR`, `GWETROOT` for the
   last ten complete calendar years, in two bounded five-year requests. Units, LST
   dates, finite values and parameter definitions are checked. Headers are retained.
3. Monthly rain totals and mean temperatures use complete months only. The displayed
   typical value is the median of the yearly monthly summaries; ranges are min/max.
4. Each crop's reference duration is the rounded midpoint of its published duration
   range. Planting is assumed on day 1 of the chosen month. **These are implementation
   assumptions**, not estimated maturity or a validated phenology model.
5. All crops share the first nine planting-year cohorts, allowing seasons to cross
   into the tenth weather year. Every daily mean-temperature/rain value must exist
   for a season to count. Missing wetness stays unknown independently.
6. Check the regional pH median and median historical growing-season mean temperature
   against each species' preferred and broader envelopes, with inclusive boundaries.
   Both preferred matches produce `reference_match`; a broader-envelope result
   produces `local_review`; an outside-envelope result produces `outside_reference`.
   A missing input produces `needs_data`. These states describe **two checks only**.
7. Sort by those reference-check states, then the farmer's selected preference for
   shorter duration or legume options, then name. No probabilistic suitability score
   is calculated. Water-supply statements are user context, not verified capacity.
8. Report published duration ranges as possible harvest dates. Yield, harvest rate,
   profit, fertiliser dose and crop-success probabilities remain absent.

The longest run of days with rain below 1 mm is a seasonal adaptation of the
[Climdex dry-day definition](https://www.climdex.org/learn/indices/). It does not
measure soil drought, crop water stress or irrigation demand.

## Future climate: separate from future soil health

`POST /api/planting/future` uses **ACCESS-CM2** and **MRI-ESM2-0**, ensemble member
`r1i1p1f1`, separately under SSP2-4.5 or SSP5-8.5. It requests NASA NCSS point CSVs
from pinned `v2.0` files for `tas` and `pr`, for ten years starting at the chosen
planning year. The end year remains before the product's 2100 endpoint.

NCSS performs the extraction on NASA's server. TerraProof decodes K to °C and
kg m⁻² s⁻¹ to mm/day, checks the returned neighbouring 0.25° grid cell, dates,
calendar completeness and CSV units, then reuses the seasonal-summary function.
Non-Gregorian/missing calendars are rejected rather than silently converted.
Each result preserves the source coordinates, URLs, bytes and hashes.

Two models illustrate possible outcomes; they do not form a representative full
ensemble or calibrated uncertainty distribution. The ten-year window is exploratory,
not a 30-year climate normal. Model ranges describe simulated interannual variation.
No direct change estimate against POWER is made, because mismatched model/reference
datasets could confound a climate-change signal with baseline differences.

The model does not predict stable weather in 2027 or the actual day a storm will
arrive. It holds soil unchanged and does not model soil carbon, nutrients, pests,
erosion, drainage, floods or farm management. `soil_health_forecast` is explicitly null.

## What the live proof establishes

The Albay June-planting check returned ten historical weather years (2016–2025)
and nine complete common planting-year seasons. Maize and indica rice matched the
two preferred reference checks; this does not establish full agronomic suitability.

The 2027–2036 SSP2-4.5 run returned all **40 small NASA point files**, about **1.19 MiB**
combined: 626,449 bytes for ACCESS-CM2 and 626,422 for MRI-ESM2-0. Both supplied nine
complete simulated planting seasons. The initial attempt had timeouts; the final
bounded-retry run completed using cached successes and recovered missing files.
First retrieval took about 222 seconds; cached browser retrieval was much faster.

Local evidence: `artifacts/farmer-guide-proof-004/{planting,future}.json`. These
ignored files record real processing; they are **integration evidence, not ground-truth
validation**. Synthetic tests separately verify arithmetic and failure handling.

```powershell
uv run python scripts/verify_planting_sources.py --region albay --future --output artifacts/new-proof-run
```

Use a new output directory to preserve previous evidence. Exit 2 means at least one
requested source was incomplete/unavailable. No credentials or full-scene files are
needed for these public endpoints. No cloud deployment or new neural-network training
was performed.

## What would support predicting soil change after repeated cropping

A defensible analysis needs georeferenced baseline and repeated soil tests at
comparable depths/methods, crop/cultivar histories, harvest/residue removal, fertiliser
and manure inputs, tillage, cover, irrigation/drainage and locally relevant climate.
It must evaluate independent locations/years and management scenarios.

[Rothamsted's RothC](https://www.rothamsted.ac.uk/rothamsted-carbon-model-rothc) is a
research-based candidate for **organic-carbon turnover in non-waterlogged topsoil**.
Its [documented inputs](https://www.rothamsted.ac.uk/sites/default/files/Documents/summary_data_requirements.pdf)
include monthly climate and carbon inputs. It is not a universal soil-health model,
and its scope must not be silently extended to flooded paddy. No RothC, nutrient
balance or rotation-impact simulation has been integrated in this MVP.

Before promotion, compare candidate models with independent laboratory outcomes,
hold out regions and later years, report property-specific errors and calibration,
and have local agronomists review decisions. Evaluating a neural network against
SoilGrids labels alone would measure imitation, not independent soil accuracy.

The present guide adds crop traits, seasons and farmer preferences to the prior
soil explorer. It is still **partial** alignment with Field Shift: no validated
multi-year rotation strategy comparison or demonstrated soil-health benefit exists.
See [delivery/accuracy status](status-and-accuracy.md) and [maintenance](maintenance.md).

## Guided two-season comparison — current extension

The app now compares the usual crop sequence with two farmer-chosen next-crop
alternatives. Plain-language onboarding and a text-plan download guide discussion
with an adviser. Each crop is checked independently against soil pH and historical
seasonal temperature; possible planting/harvest overlap is exposed. Water-use ranges
and legume contributions are reference explanations, not simulations of irrigation
need, nitrogen credits or improved soil health. See [rotation methods](rotation-comparison.md)
and [submission wording](submission-brief.md) for the current supported scope.
