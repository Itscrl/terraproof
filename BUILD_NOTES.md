# Build notes

The repository began with planning documentation only. The existing user edit to the
ML plan is preserved. The MVP follows Stage A; Stage B is an executable offline path,
not a deployed predictor. Local-only delivery is explicit; Sites hosting is not used
because a persistent Python service is required and deployment is deferred.

## Surface brief and direction contract
Mode: Operate. Question: how did the same historical years affect two rice calendars?
Thesis: paired crop-stage strips make the calendar the working object.
Own-world: a green-grey frame, white sheet, quiet ink, teal climate marks, IBM Plex Sans.
Story: edit sowing dates, replay the same years, inspect evidence, adjust costs, save.
First viewport: compact product navigation, two calendar editors, replay action,
paired year comparison and financial assumptions accessible in the same workspace.
Form: framed-sheet, taste seed 234310446; no redraw. Impeccable engine unavailable;
context and craft guidance read directly. User delegated choices without questions.
Finish: unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

The alternatives considered were a map-first atlas and a calendar-first comparison.
The latter fits a single coarse grid point without suggesting farm-level precision.
Signature: two rice growth calendars sharing one year and the same exposure scale.

## Data and jobs inventory
- Two to four named planting plans; recurring month/day, stages in days.
- Pilot point rather than field boundary; coordinates visible in evidence.
- Ten planting years; complete common years alone enter comparisons.
- Daily Tmax/Tmin in °C and precipitation in mm/day from NASA POWER.
- Stage heat days, ≥20 mm rain days, <1 mm longest dry spell, event dates.
- Missing values remain missing; no imputation in exposure summaries.
- Economic assumptions: ha, t/ha, PHP/kg, itemized PHP/ha costs.
- Saved comparisons persist in local SQLite; JSON and CSV export retain provenance.
- Farmer/adviser reviews calendars, changes assumptions and inspects daily evidence.
- Training status and citations remain visible, without fabricated model scores.
# Global soil explorer — 15 November 2026

User clarification: global globe/rectangle soil assessment supersedes calculator-first
entry. The new route extends the existing framed-sheet palette/type with a large
Cesium Earth and adjacent soil report. NASA tiles are reference imagery; numeric
analysis uses small ISRIC map subsets and NASA POWER wetness JSON. Regions are not
restricted to Albay. Local preview is acceptance testing before global hosting.
Direction contract: `.impeccable/soil-explorer-brief.md`. No new raster art was made;
NASA tile attribution and service URLs are retained. No commits/pushes per the latest
user instruction. This describes the initial soil-explorer milestone.

## Farmer workflow extension — 15 November 2026

The user asked for plain language, smaller-field navigation, a crop/season guide,
calculator removal and repeat use. The farmer brief is `.impeccable/farmer-guide-brief.md`.
Seven FAO profiles, NASA historical weather and two separate NEX model pipelines
are connected. Real source checks returned complete histories in three regions and
all 40 small scenario files in Albay after bounded retry. Browser notebooks preserve
plots and actual/user-provided records with export/import and removal undo.
The interface explicitly distinguishes future climate from future soil health;
no repeated-crop degradation, yield or rotation-impact model is claimed.

## Guided rotation comparison — 15 November 2026

The user authorized a feasible two-season proof of concept and farmer guidance.
`rotations.py` composes the existing soil/NASA crop-screening methods into a
baseline and two chosen alternatives. The result includes calendar overlap checks,
published water ranges, crop-group explanations and explicit unresolved checks.
`RotationGuide.tsx` adds labeled forms, three-step instructions, plain-language
statuses, a text plan download and separate evidence export. It preserves the
existing globe workflow and visual system. Soil/nutrient/water carry-over is not
modeled. See `docs/rotation-comparison.md` and `docs/submission-brief.md`.
