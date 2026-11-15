# TerraProof: delivery status and scientific claims

Review date: 15 November 2026, Asia/Manila. This implementation is a local review
build without a public application deployment. This report distinguishes
software operation, scientific foundations and demonstrated prediction accuracy.

## What currently works

TerraProof is now a global regional soil-prediction explorer. Users navigate a
NASA-imagery globe, draw a rectangle or enter coordinates, choose depth/date and
retrieve a sourced soil profile. The primary experience is no longer the economic
calculator. The old planning URL now opens the explorer; archived climate/economics
backend and research code retain their original scope limits.

The regional pipeline retrieves eight SoilGrids predicted properties: pH in water,
organic carbon, clay, sand, silt, CEC, bulk density and total nitrogen. It reports
sampled regional medians, spatial ranges, valid sample counts, units and provenance.
NASA POWER adds a separate fourteen-day relative-wetness series at the centroid.
Small extracts replace multi-gigabyte full-scene downloads.

The farmer guide adds ten complete prior years of NASA POWER, seven versioned FAO
crop profiles, indicative harvest ranges, water context and farmer priorities. Its
suggestions compare pH and seasonal mean temperature only. Two NASA NEX-GDDP-CMIP6
models separately explore future climate. All 40 small 2027–2036 SSP2-4.5 extracts
were retrieved in the final Albay proof; this establishes processing, not crop
success. [Methods and proof](farmer-guide-and-validation.md).

Place search, detailed imagery/labels and zoom controls help locate small fields.
Browser notebooks preserve plots, actual planting/management notes and user-provided
pH-in-water tests, with export/import and reversible removal. These records do not
verify laboratory results or forecast future soil health after repeated crops.

Where published, WoSIS queries supply historical regional observations of Olsen,
Bray-I or Mehlich-3 extractable P and saturated-paste EC. Methods, depths, dates,
positional uncertainty and CC-BY licences remain attached. Their absence is a data
gap; their presence does not measure the entire region or its current condition.

Live source retrieval was exercised in Albay, Iowa, Kenya and a Queensland reference
rectangle. The Australian selection returned Olsen-P and EC observations; the
Albay selection did not. These checks establish retrieval and processing behavior,
not independent regional accuracy.

The globe's NASA GIBS Blue Marble background is static reference imagery. It does
not measure present soil chemistry. The date selector controls NASA wetness, not
the acquisition date of every soil property. Ocean/polar gaps and source outages
remain visible. Geographic selection is worldwide within the documented per-request
bounds; worldwide public hosting is intended but has not been performed.

## Scientific foundations

| Component | Basis | What that basis supports |
| --- | --- | --- |
| Soil-property predictions | [Poggio et al. (2021), SoilGrids 2.0](https://doi.org/10.5194/soil-7-217-2021) and [ISRIC layer specifications](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html) | Global soil-map prediction methodology, evaluated spatially in the source study; property/depth/unit meanings |
| Historical laboratory references | [Batjes et al. (2024), WoSIS snapshot 2023](https://doi.org/10.5194/essd-16-4735-2024) | Quality-assessed/standardised soil observations and method distinctions; not a complete current global survey |
| NASA wetness context | [POWER meteorological methodology](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/) and [GMAO wetness definitions](https://gmao.gsfc.nasa.gov/gmao-products/merra-2/faq_merra-2/) | Interpreting relative wetness, skin temperature and rainfall without substituting them for fertility; actual source header is retained |
| Soil-quality interpretation | [USDA NRCS soil-health assessment](https://www.nrcs.usda.gov/conservation-basics/soil/soil-health/soil-health-assessment) | Soil quality involves physical, chemical and biological indicators rather than one satellite signal |

TerraProof integrates an existing published predictive model. It has **not trained
a new soil neural network**. The separate rainfall experiment remains research-only
and does not validate soil predictions. The two unreadable NISAR copies are not used.

No unsupported nutrient conversion, arbitrary health score, soil-safety certification
or universal fertilizer threshold is applied. Crop-specific FAO reference envelopes
are used for the two-indicator screen, with method/cultivar limits. Interpretation requires land use,
soil type, crop requirements and appropriate regional reference conditions.

## Accuracy: supported and unsupported statements

**Supported:** TerraProof presents regional predictions from identified scientific
sources, performs documented unit/geometry/missingness checks and preserves audit
information. Its numerical pipeline, source access and user interactions have been
tested. Its published-method foundation is real and cited.

**Not established:** a percentage such as “90% accurate soil quality”; exact pH or
fertility of an individual farm; current plant-available N/P/K; contaminant or food
safety; a global healthy/unhealthy grade; locally calibrated prediction intervals;
or demonstrated agronomic benefit. Four successful regional requests do not
establish global predictive validity. There is no independent TerraProof soil-label
evaluation from which to calculate defensible soil MAE, RMSE or calibration coverage.

The displayed spatial 10th–90th percentiles describe variation across sampled map
predictions. They are **not prediction confidence bounds**. SoilGrids' own model
uncertainty quantiles are not yet requested. Laboratory observations may overlap
SoilGrids training profiles and therefore cannot automatically serve as independent
validation. Wider selections use coarse sampling; a small output grid does not
increase the native source's information or resolution.

Truthful presentation wording:

> TerraProof predicts regional soil characteristics using published soil maps and
> NASA environmental data. It shows data coverage and limitations to support
> investigation and planning; local soil testing is needed for field-specific decisions.

Avoid “diagnoses your farm from space,” “detects NPK anywhere,” “live soil chemistry,”
“clinically/scientifically validated TerraProof accuracy” or “guaranteed healthy soil.”

## Challenge alignment

The closest researched official brief remains
[2026 Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/).
Its official indexed summary asks for NASA observations, local soil information,
crop characteristics and farmer priorities to explore resilient **crop rotations**.
The official summary was rechecked on 15 November; direct page access returned 502.
The team has not supplied its registered challenge identifier, so this mapping is
conditional, not confirmation of registration or NASA acceptance.

| Requirement / user goal | Current status |
| --- | --- |
| Globe and global rectangular region selection | Implemented, exercised in Chrome; coordinate fallback available |
| Regional predicted soil properties | Implemented with eight properties, explicit scale/depth/source limits |
| NASA data use | GIBS display, POWER history/recent context and two NEX climate-model scenarios |
| Additional measured soil evidence | Bounded WoSIS observations where compatible records exist |
| Data-efficient access | Implemented small regional WCS/JSON requests; no full-scene requirement |
| Crop characteristics and farmer priorities | Seven FAO profiles; planting month/year, stated water context and sorting preference; limited screening |
| Indicative time to harvest | Published ranges, not cultivar-specific maturity or yield prediction |
| Repeated use / field history | Browser plot notebook, actual season notes and user-provided laboratory pH records; export/import |
| Future soil health under repeated crops | Not simulated; no carbon/nutrient/rotation-impact model integrated |
| Crop-rotation strategy comparison | Not implemented; earlier planting-date comparison is not rotation analysis |
| Demonstrated improvement in soil health or farm decisions | Not evaluated |
| Public global deployment and production operations | Prepared host/public-mode configuration; not deployed or load-tested |

**Conclusion:** the working soil explorer addresses the user's clarified regional
soil-information goal and is more relevant than a calculator-first workflow. It
remains a partial solution to Field Shift. A globe and credible datasets alone do
not fulfill that challenge's crop-rotation decision-support requirements.

## What would establish stronger reliability

1. Define a specific target/property, depth, region, time window and intended decision.
2. Acquire independent, georeferenced laboratory samples with documented methods,
   dates, precision, permissions and sampling design; identify any training overlap.
3. Match source support to sample support without inventing fine-scale information.
4. Pre-register spatially blocked and, for changing properties, temporal holdouts;
   fit preprocessing using training data only. See
   [Roberts et al. (2017)](https://doi.org/10.1111/ecog.02881) on structured evaluation.
5. Report property-specific MAE/RMSE, bias, sample counts, regional/soil-type/land-use
   performance and prediction-interval calibration against a simple baseline.
6. Have regional soil/agronomy specialists review the proposed interpretations and
   evaluate whether users make better decisions prospectively.

No fixed sample count, arbitrary error cutoff or universal health threshold is
declared scientifically sufficient. Requirements depend on the specific use case.
Until those evaluations exist, the appropriate claim is an evidence-backed regional
prediction and screening MVP, not a validated field diagnostic system.

See [the complete pipeline and source catalog](global-soil-assessment.md) and
[the verification report](../QA_REPORT.md) for engineering evidence and limits.
