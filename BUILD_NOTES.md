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
