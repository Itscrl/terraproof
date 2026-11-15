# TerraProof submission brief and requirements map

Updated 15 November 2026. Use this as the current factual handoff when preparing
project requirements, presentation answers and challenge submissions. Do not turn
planned capabilities or expected benefits into completed or measured results.
No exact submission questionnaire was supplied; adapt these facts to its wording.

## Project summary

TerraProof helps farmers and agricultural advisers explore what to grow next on
the same land. Users select an area, review regional soil estimates and NASA
weather context, then compare their usual two-season crop sequence with two
chosen alternatives. Plain-language guidance explains reference matches, missing
evidence, timing conflicts and practical checks. A readable plan can be downloaded
for adviser discussion. This is an operational proof of concept using published
references, not a scientifically validated predictor of crop success.

## Problem

Soil, climate and crop information is scattered and difficult to interpret together.
A farmer considering another crop needs to examine both seasons, water constraints,
planting timing, seeds, labor and buyers. TerraProof brings some of this evidence
into one workflow while identifying the questions that still need local answers.

## Challenge requirement mapping

Challenge: 2026 Field Shift: Adapting Farms with NASA Data.
Official brief: https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/

| Requirement | What is implemented | Limit |
| --- | --- | --- |
| NASA Earth observations/environmental data | POWER temperature, rainfall and wetness; optional NEX climate scenarios; GIBS globe imagery | POWER is regional satellite/model-derived context; GIBS is display only; NEX is simulation |
| Soil information | SoilGrids predictions and compatible historical WoSIS observations | Regional public estimates/records, not a fresh local laboratory test |
| Crop characteristics | Seven sourced FAO crop profiles, duration and water-use reference ranges | Local varieties and crop availability are unverified |
| Farmer priorities | Planting months/year, crops, water context and chosen focus | Preferences change explanatory focus; no optimized ranking or measured supply |
| Explore crop rotations | Same first crop followed by usual next crop or either of two alternatives | Two-season independent screening, not coupled soil/nutrient/water simulation |
| Soil-health and water considerations | Crop-group/legume explanations and relative water-reference comparisons | No modeled soil improvement, fertilizer credit, irrigation liters or proven savings |
| Accessible decision support | Three-step guidance, plain-language statuses, labeled controls, mobile flow, text download and checklist | English only; field-user and screen-reader studies have not been completed |

NASA POWER appears in the local event reproduction of the challenge resources:
https://hackathlone.com/challenges/adapting-farms-with-nasa-data
Direct retrieval of the official resource page failed during the source check;
the official page remains authoritative. Do not claim NASA acceptance or endorsement.

## How the farmer uses it

1. Find the land, draw a rectangle and choose Assess selected region.
2. Read the soil explanation; missing information means unknown, not bad land.
3. Open What could I grow after this crop? Enter the usual sequence and months.
4. Choose two next crops that can realistically be obtained and sold or used.
5. Compare the current sequence and two alternatives. Read the timing and local checks.
6. Download the text comparison and consult an adviser before a substantial change.

Worth exploring means the limited reference/timing checks passed. Needs checking
means evidence is missing or borderline. Potential conflict means a broad range
or calendar check found an issue. None is a yield or success guarantee. The first
day of the chosen month is an explicit planning assumption. The longest published
first-crop duration flags possible overlap with the next planting.

## Actual sources and technology

Python/FastAPI implements validated requests and reference calculations; React and
TypeScript provide the interface. SoilGrids/WoSIS are ISRIC sources, not NASA data.
POWER supplies numerical historical climate and wetness. GIBS/Blue Marble supports
navigation, with Esri detail/labels. Optional NASA NEX-GDDP-CMIP6 extracts use two
climate models and two pathway choices; these do not forecast a particular season.
FAO profiles supply crop reference information. SMAP, IMERG, ECOSTRESS and HLS
analysis are catalogued possibilities, not completed analytical integrations.

## Innovation and contribution

The contribution is a practical combination of evidence, understandable comparison
and explicit next actions for a farmer/adviser. It does not claim invention of
crop rotation or exclusive use of satellite data. Expected benefits are better
informed conversations and more transparent planning; these have not been measured.

## Model and validation answer

The rotation feature uses documented deterministic rules, not a newly trained AI
model. SoilGrids itself is a published prediction model. The separate seven-day
rainfall research model performs worse than its baseline and is not used to make
rotation recommendations. Current software verification: 49 Python tests passed,
5 browser tests passed and 1 opt-in live-source test skipped; lint, formatting and
production build passed. Tests with synthetic evidence establish behavior, not
farm accuracy. Independent agricultural trials and local review remain necessary.

## Current delivery and next steps

The app runs locally and has not been publicly deployed. Source commits and public hosting are separate; a remote push is outside the
guided-feature request.
Exact water allocation, measured irrigation adequacy, automatic buyer matching,
profit forecasts, soil-health trajectories and proven environmental benefits are
not implemented. Next steps are local crop/variety review, field-user testing,
independent observations and a calibrated water/soil model where justified.

For technical rules see rotation-comparison.md; for current engineering evidence
see ../QA_REPORT.md. Earlier research sections are historical and do not override
this current feature description.
