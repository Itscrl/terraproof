# Two-season rotation comparison

Implemented 15 November 2026. Farmers choose the first crop and usual next crop,
planting months/year, two alternative next crops, water context and a priority.
The seven FAO profiles are an illustrative catalog, not a local crop whitelist.

`POST /api/rotations/assess` reuses SoilGrids pH and NASA POWER historical weather.
Each crop uses its own month and published midpoint duration for climate screening.
Missing or incomplete historical seasons are excluded, with counts retained. Counts
can differ by crop/window; there is no aggregate success score or yield comparison.
The first crop is identical across the three scenarios. The next planting moves
to the following year when its month is no later than the first planting month.
The longest published first-crop duration flags possible overlap; land preparation
and cultivar-specific timing require local review.

## Decision rules

- Potential conflict: a crop is outside its broad pH/temperature reference or the
  next planting overlaps the latest indicative harvest of the first crop.
- Needs checking: missing evidence or a value between preferred and broad limits.
- Worth exploring: both reference screens pass and no calendar overlap is found.
  Water supply, market access, labor and local suitability are still unverified.

Water reference ranges add two published whole-crop evapotranspiration ranges.
A lower tendency is stated only when an alternative second crop's upper bound
is below the usual second crop's lower bound (higher is the reverse). Overlapping
ranges establish no clear difference. Rainfall is not subtracted, paddy extras and
irrigation losses are excluded, and no liters or savings are calculated.

Legume and broad crop-group descriptions identify potential contributions only.
No nitrogen credit, pest reduction, carbon change, fertility trajectory, profit or
yield benefit is calculated. Crops are screened independently, without carry-over
water/nutrients between seasons. Published references and NASA provenance remain
in the evidence JSON. The primary download is a readable text plan for discussion.
Priorities change explanatory guidance, not the scientific result or a ranking.

## User guidance and validation

Three-step onboarding covers selecting land, assessing soil and comparing plans.
Forms use explicit labels and native controls. Earlier results are flagged when
inputs change and cannot be downloaded until recalculated. Duplicate next-crop
choices are rejected by both UI and API. Missing providers and retry states remain
visible. Tests use synthetic evidence for behavior; they do not establish farm
accuracy. Independent local trials and adviser review remain required.
