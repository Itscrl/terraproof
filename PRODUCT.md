# TerraProof

## Platform
Web, global regional soil explorer. Local preview is the review environment before
public hosting; the product is not restricted to a local user or the Albay pilot.

## Stack
Python and React are explicit user requirements. FastAPI, SQLite, Pydantic,
scikit-learn, TypeScript and Vite are implementation choices.

## Users and purpose
Farmers, extension advisers and regional analysts selecting a rectangle on a world
globe, then inspecting mapped soil properties and recent NASA wetness context.
The user's 15 November clarification supersedes the earlier calculator-first scope.
The primary journey is find land → select a region → understand soil evidence →
explore crops and seasons → keep field records for future visits. The user asked
to remove the calculator: the legacy planning URL now opens this primary experience.
The longer-term question is whether repeated cropping can keep soil productive;
current climate scenarios do not predict future soil health.

## Current implementation
Cesium globe with NASA GIBS imagery, two-corner selection and keyboard coordinate
entry. Python retrieves bounded ISRIC SoilGrids WCS subsets for pH, carbon, texture
and CEC, bulk density and total nitrogen, plus NASA POWER wetness/temperature/rainfall
at the region centroid. Compatible historical WoSIS phosphorus/salinity observations
appear separately with their original methods, depths and dates.
Depth/date controls, partial failures, source hashes, spatial ranges and JSON export.
Worldwide region requests were exercised in the Philippines, USA, Kenya and Australia.
Public-mode host configuration disables private saved-comparison access.
No public cloud deployment has been performed; current changes await local review.

The farmer guide integrates ten complete prior years of NASA POWER, seven sourced
FAO crop profiles, indicative harvest windows and two separate NASA NEX-GDDP-CMIP6
climate-model scenarios. Crop suggestions are a two-indicator reference screen,
not validated suitability/yield predictions. Place search, Esri detail/labels and
zoom controls help locate small fields; scientific grids remain at native scales.
Versioned browser notebooks preserve saved plots, actual planting/management notes
and user-provided laboratory pH records, with export/import and reversible removal.
Source caches expire operationally and retain content-addressed snapshots.

## Evidence boundaries
Historical conditions, future climate simulations and user-entered records are separate.
SoilGrids is a published prediction model. No new soil neural network has been trained,
and no local laboratory validation has established TerraProof's soil accuracy.
Map predictions, centroid wetness, spatial variation and measured soil tests are distinct.
There is no universal soil-quality score, NPK diagnosis or fertilizer recommendation.
Detailed sources, architecture and limits: `docs/global-soil-assessment.md`.
Crop/season methods and future soil-health requirements: `docs/farmer-guide-and-validation.md`.

## Assumptions of the retained climate pilot
Legazpi-area point 13.1391 N, 123.7438 E, not an Albay administrative boundary;
2015–2024 planting years with source data through 2025; illustrative 115-day rice,
55/30/30-day stages from sowing, not a certified cultivar calendar. PHP example
economics are editable assumptions, not current price observations.
2026 Field Shift challenge alignment is inferred pending an explicit challenge ID.

## Guided rotation comparison
Farmers compare their usual two-season sequence with two chosen alternative next
crops. Plain-language statuses, calendar checks and text downloads support adviser
discussion. Crops are screened independently; soil/water carry-over and predictive
benefits remain unvalidated. Existing design tokens are preserved with larger
explanatory copy, explicit form labels and three-step guidance.

## Delivery
Verify locally before deployment. The user authorized committing the guided rotation feature. A public remote push
requires separate approval. Keep source provenance, scientific
limits and test evidence. Global hosting remains the target after acceptance.
