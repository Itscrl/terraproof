# TerraProof: Dataset Preparation and Machine Learning Plan

**Purpose:** Prepare climate, crop, field, and economic data for future TerraProof analysis, and define a staged machine learning (ML) approach that supports informed crop planning.

## 1. Project goal and scope

TerraProof is intended to help farmers compare planting plans by replaying historical climate against crop calendars and showing transparent economic assumptions. The ML goal is to eventually estimate *validated crop outcomes and decision-relevant risks* for supported crop/variety/region combinations. Models should support farmer judgment, not issue guaranteed prescriptions.

This document defines intended product behavior, not evidence of a deployed system or available training datasets. ML recommendations, calibrated yield-loss prediction, and market forecasting remain research and validation-dependent. The proposed 48-hour MVP instead calls for explainable historical hazard exposure and an editable profit calculator. Accordingly, this document is a preparation plan, not a claim that a model can already be trained or that recommendations are validated.

## 2. Questions to answer before modeling

1. Which crop, variety, and region are in scope?
2. What decision should a model support: stage-specific hazard exposure, yield estimation, or scenario ranking? Treat these as separate tasks.
3. What observed outcome is available (for example, measured yield, crop damage, or farmer-reported harvest), at what spatial and temporal scale, and under what consent and quality controls?
4. Which years and locations can be held out for genuinely independent evaluation?

For this questions answer it on your own base on your understanding and look for it's approach on the actual challenge, dataset and whatever you need information just look for it on the web and don't ask questions.
Make sure to document it well.

## 3. Dataset inventory

Create a source register before downloading or joining data. Record dataset owner/source, product and version, access date, license/terms, spatial and temporal resolution, coverage, units, quality flags, known limitations, and intended use.

| Data family | Candidate inputs | Preparation notes |
| --- | --- | --- |
| Climate | NASA POWER daily temperature and precipitation; other planned sources such as GPM IMERG where justified | Preserve source values and quality flags; convert units explicitly; document grid resolution and missing periods. Do not equate gridded values with field measurements. |
| Soil and terrain | Soil texture, drainage, slope, elevation, soil products | Keep source resolution and uncertainty; distinguish measured field inputs from gridded estimates. |
| Crop plan and phenology | Crop, variety, planting/transplant date, stage dates, duration, management | Version stage calendars and thresholds; mark farmer-entered, expert-specified, and approximate values separately. |
| Management and field | Irrigation, fertilizer, prior crop, area, planting method, other available practices | Use only with clear definitions and consent; track unknown separately from no/zero. |
| Outcomes | Observed yield, harvest date, damage or loss observations, farm-reported outcomes | Require provenance, units, date, farm/location linkage quality, and collection method. Flag estimates and low-confidence records. |
| Economics | Farm-entered yield assumptions, selling price, seeds, fertilizer, irrigation, labor, equipment, transport | Keep scenario assumptions distinct from observed financial outcomes and from forecasts. Record currency, market, unit, and date. |

Do not presume these sources or labels are already assembled. Confirm data availability, rights, and coverage for the chosen pilot.

## 4. Preparation workflow

### 4.1 Define a canonical observation

Use a documented analysis grain such as *field or grid cell × crop season × year*. Each record should link to a scenario and include identifiers for location/grid, crop and variety, planting date, season, data-source versions, management inputs, and outcome provenance. Store raw source data separately from derived features so analyses can be reproduced.

### 4.2 Validate and normalize

- Parse dates and calendars consistently; handle leap years and seasons crossing calendar years.
- Convert units into a canonical set while retaining original value/unit and conversion metadata.
- Check plausible ranges, duplicates, coordinate validity, date coverage, and inconsistent crop/variety labels.
- Track missingness explicitly; distinguish missing, not collected, not applicable, and true zero.
- Retain source quality flags. Do not silently impute failed or low-quality readings.
- Harmonize spatial data cautiously. Record the climate grid cell and distance/aggregation method used for a field; avoid false plot-level precision.
- Apply documented, crop- and variety-specific stage calendars. Mark approximate stage dates as approximations.

### 4.3 Create auditable features

Derive features only from information available for the analysis at hand. Candidate features include:

- stage-specific heat exposure (for example, days above a documented threshold), with threshold source and stage window;
- rainfall totals, heavy-rain exposure, and consecutive dry days by crop stage;
- seasonal summaries and anomalies relative to a specified baseline period;
- planting-date/calendar features and documented crop-stage durations;
- soil, terrain, and management variables where coverage and measurement quality are adequate.

Keep daily time series and event-level provenance so each summary can be traced to dates and values. Do not substitute rainfall for wind, or label exposure as crop damage. Do not derive features from future observations when predicting an earlier decision.

### 4.4 Build labels carefully

For outcome modeling, specify the target and units before joining records: e.g., observed yield per area, a defined damage category, or a verified loss amount. Document collection method and uncertainty. Avoid treating farmer estimates, simulated outcomes, and measured observations as equivalent labels. Exclude or separately analyze records with uncertain linkage or inconsistent outcome definitions.

## 5. Train and evaluation design

- Split by *time and location*, not by randomly splitting rows from the same farms or seasons across train and test. Use earlier years/locations for training and later or geographically distinct groups for evaluation, depending on coverage.
- Fit imputers, scalers, feature selection, and encoders on training folds only.
- Prevent leakage from post-harvest data, future weather, outcome-derived features, duplicate farms, or neighboring records that reveal the same event.
- Compare against simple baselines: historical mean/median for yield targets and transparent threshold rules for exposure tasks.
- Evaluate by crop, variety, region, season, and relevant farm subgroups where sample sizes allow. Report sample counts and uncertainty, not only an aggregate score.
- For yield regression, consider MAE and RMSE with observed-versus-predicted plots and prediction intervals. For damage classification, report precision, recall, calibration, and class prevalence; choose thresholds with local domain input.
- Test robustness to missing data, unusual seasons, and distribution shift. A strong average score does not establish local usefulness.

## 6. Staged ML methods

### Stage A — MVP: no ML claims

Use transparent historical replay and documented hazard rules for heat and a selected rainfall indicator. Compare planting dates over the same historical period and show the source, thresholds, event dates, and limitations. Keep the profit calculator based on user-editable assumptions; do not infer a financial gain from lower exposure.

### Stage B — Research baseline

Once outcome labels are available, begin with interpretable baselines such as regularized linear regression for yield or a simple decision tree/logistic regression for a clearly defined damage label. Use grouped, time-aware validation and compare with non-ML baselines. This stage establishes whether the data supports predictive modeling at all.

### Stage C — Candidate nonlinear models

If data volume and independent validation support it, compare tree-based methods such as Random Forest or gradient-boosted trees against Stage B. Use calibration and uncertainty estimation where appropriate. Select models on held-out performance, stability, interpretability, and subgroup behavior—not training fit alone.

### Stage D — Decision support

Only after independent regional and agronomic review, test whether predicted outcomes improve scenario comparisons. Show alternatives as uncertain estimates with drivers and constraints. Keep farmer choice explicit. Crop substitution, rotations, intercropping, and price forecasting each need their own evidence and evaluation; a model for one task does not validate the others.

## 7. Governance and responsible outputs

Every output should identify the crop/variety/region coverage, data period and sources, model and feature version, missing inputs, uncertainty, and validation status. Distinguish clearly among *historical exposure*, *predicted outcome*, and *economic scenario estimate*. Never present a hazard flag as measured damage, a model result as a future weather forecast, or an unvalidated ranking as a recommendation. Protect farm coordinates and outcome records; use them only with appropriate consent and access controls.

## 8. Initial deliverables and readiness gates

1. Dataset/source inventory with rights, coverage, units, quality flags, and limitations.
2. Versioned data dictionary and canonical schemas for climate, crop plans, fields, outcomes, and economic assumptions.
3. Reproducible cleaning and feature-generation pipeline retaining raw provenance.
4. Data quality report covering missingness, duplicates, spatial/temporal coverage, label quality, and subgroup counts.
5. For any proposed model: target definition, leakage review, baseline comparison, time/location-held-out evaluation, uncertainty and subgroup report, and documented model card.

*ML readiness gate:* Do not deploy predictive crop-outcome recommendations until target labels, representative coverage, independent validation, uncertainty communication, and qualified agronomic review are in place. If a gate is unmet, retain the rule-based historical exposure workflow and make the evidence gap visible.

## 9. Assumptions and open items

- No actual project datasets were supplied; this plan describes candidate sources and intended product behavior.
- The proposed initial location is Albay, Philippines, but exact boundaries and climate period remain to be selected.
- Rice and an illustrative variety may be used for a demonstration, with stage parameters explicitly disclosed.
- The target outcome, data access/permissions, available sample size, and validation partners remain undecided.
- The recommended model family is conditional on data quality and independent validation; no technique can compensate for absent or biased labels.

## 10. Implementation checkpoint — 14 November 2026

Stage A is implemented with Python/FastAPI, React, real archived NASA POWER data,
source/quality metadata, editable calendars/economics, local persistence and exports.
The selected pilot is a Legazpi-area point, 2015–2024 planting years and an explicitly
illustrative 115-day sowing-based rice calendar. These decisions do not establish
cultivar validation. Earlier assumptions above describe the initial planning state.

Stage B has an offline CLI enforcing measured-label, consent, provenance, preplant
feature, spatial/time holdout and baseline-evaluation gates. No observed yield labels
were supplied; the empty template fails closed. Synthetic fixtures test wiring only.
Stages C/D, soil-informed rotations and predictive recommendations remain future work.

See [data contracts](data-contracts.md), [training](training.md), [research/platforms](research-and-platforms.md)
and [operations](operations.md) for decisions, citations and reproducible commands.
