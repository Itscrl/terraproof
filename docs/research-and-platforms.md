# Research evidence and platform roadmap

**Scope update, 15 November 2026:** the user clarified a global soil assessment
explorer with globe/rectangle selection as TerraProof's primary purpose. See
[the current soil pipeline](global-soil-assessment.md) and
[the status/accuracy assessment](status-and-accuracy.md). The rice-first decisions
below document the original implementation and do not govern the new primary UI.

Research date: **14 November 2026 (Asia/Manila)**. This document records source-backed choices, implementation assumptions, and future integration options. A listed platform is not evidence that an account, credit, deployment, or dataset connection exists.

## Challenge alignment

The planning repository did not identify a challenge URL or year. The closest current official brief is **[Field Shift: Adapting Farms with NASA Data — NASA Space Apps 2026](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/)**. Its summary calls for decision support combining NASA Earth observations, local soil information, crop characteristics, and farmer priorities to explore crop rotations under changing conditions. This is an **inferred project alignment**, not a claim that the team is registered for that challenge.

TerraProof's documented Stage A is a deliberately narrower first step: historical climate replay for rice calendars and transparent economic scenarios. It supplies an auditable climate comparison, not proof of soil improvement or a validated crop-rotation recommendation. Full challenge coverage still requires locally appropriate rotation options, soil evidence, crop-specific parameters, farmer constraints, and agronomic review. Comparing three rice planting dates does not by itself implement three crop rotations.

The 2025 [NASA Farm Navigators](https://www.spaceappschallenge.org/2025/challenges/nasa-farm-navigators-using-nasa-data-exploration-in-agriculture/?tab=resources) challenge is a different brief associated with educational farming games. Do not silently describe TerraProof as fulfilling that brief.

The official 2026 challenge summary was available through the indexed official page; direct page retrieval returned HTTP 502 during this research. A [local event's reproduction of the full brief](https://hackathlone.com/challenges/adapting-farms-with-nasa-data) was used to discover resource links. It suggests comparing at least three strategies, including the existing rotation, and discussing evidence, uncertainty, and local constraints. The official challenge page remains authoritative. Dataset capabilities below are grounded in their providers' documentation rather than the reproduction.

## Pilot decisions and limits

| Decision | MVP choice | Reason and limitation |
| --- | --- | --- |
| Region | Albay, Philippines; reference point near Legazpi at latitude 13.1391, longitude 123.7438 | An explicit demonstration coordinate, not a surveyed farm boundary or a claim about every Albay field. |
| Crop | Rice; illustrative calendar | No locally validated variety-specific phenology was supplied. Keep that distinction visible in exports and the UI. |
| Time window | Planting years 2015–2024, inclusive | Ten comparable historical seasons; not a 30-year climate normal. Late-year plantings need climate through their harvest in 2025. |
| Main question | How did changing a planting date change historical stage exposure? | Use the same eligible years for all compared plans. Do not rank future profitability using exposure counts. |
| Economic question | What gross margin follows from the user's area, yield, price, and costs? | Inputs are assumptions, not measured outcomes or market forecasts. |
| Research target | Measured harvested rice yield in tonnes per hectare | No suitable consented field-season labels were supplied. Climate data alone does not supply this target. |
| Evaluation | Earlier seasons for training; later seasons and distinct locations for evaluation | A single climate point cannot establish geographic transfer. The actual split must follow the eventual labels' coverage. |

## Threshold register

All thresholds must be versioned with their comparison operator, stage window, units, and source. Threshold changes alter the analysis definition; export the values actually used.

| Indicator | Default definition | Evidence | What it does not establish |
| --- | --- | --- | --- |
| Hot-day screening | Daily maximum 2 m air temperature **≥35 °C** within an explicitly defined rice stage | [Jagadish, Craufurd & Wheeler (2007), DOI 10.1093/jxb/erm003](https://doi.org/10.1093/jxb/erm003); [PubMed record](https://pubmed.ncbi.nlm.nih.gov/17431025/) | Not a universal rice damage threshold. The study examined controlled tissue temperature, exposure duration, flowering time, and genotype. A daily gridded air maximum is an imperfect proxy for panicle conditions at anthesis. |
| Very wet day | Daily precipitation **≥20 mm** | [Climdex index definitions](https://www.climdex.org/learn/indices/); [Environment and Climate Change Canada definitions](https://climate-scenarios.canada.ca/?page=climdex-indices) | Not flood depth, waterlogging, cyclone exposure, erosion, or measured crop loss. |
| Consecutive dry days | Longest uninterrupted run with precipitation **<1 mm/day** | Same Climdex/Canadian definitions | Not root-zone drought, irrigation demand, or water deficit. Soil, irrigation, evapotranspiration, and antecedent water storage matter. |

The heat paper studied IR64 and Azucena at 29.6, 33.7, and 36.2 °C tissue temperatures. It supports caution around flowering heat and genotype differences; it does **not** calibrate a 35 °C daily POWER threshold for Albay. The MVP's ≥35 °C rule is an explicit, adjustable screening choice motivated by this literature. Do not attach loss percentages, yield penalties, or a “safe” classification to it.

R20mm and CDD are normally defined over annual reporting periods. TerraProof's crop-season or stage-window versions are **adaptations** of those definitions and should be named “days with rain ≥20 mm” and “longest observed dry run,” not passed off as standard annual indices. Missing daily observations break a dry run; a partial-coverage maximum is a lower bound, not a complete result. A missing temperature is neither a cool day nor zero exposure.

### Crop-stage calendar

The three broad rice phases are vegetative, reproductive, and ripening. IRRI's [Principles and Practices of Rice Production](https://books.irri.org/0471097608_content.pdf) discusses the variation in development and roughly 25–35 days from flowering to maturity in tropical conditions. The Philippine Rice Research Institute's [Rice Breeding Manual](https://www.philrice.gov.ph/wp-content/uploads/2023/05/Rice-Breeding-Manual_May-2023.pdf) depicts an example with approximately 35 reproductive days and 30 ripening days. [FAO's paddy-rice irrigation guidance](https://www.fao.org/4/T7202E/t7202e07.htm) distinguishes nursery/transplanting and direct-sown calendars.

These sources justify the phase structure, not a universal calendar. The implemented default is an illustrative **115-day schedule: 55 vegetative, 30 reproductive, and 30 ripening days**, measured from sowing. These exact durations are editable implementation assumptions, not study-validated parameters for Albay. A 120-day 55/35/30 alternative may be entered when appropriate; neither is a certified cultivar calendar. A narrow flowering window inside a schedule is also an approximation. Do not apply a sowing-based duration to a transplant date without accounting for seedling age. Local measured stage dates should replace approximations before agronomic use.

## NASA data and tools

### POWER: the first integrated climate source

Use the [NASA POWER Daily Point API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) with community `AG`, an explicit point and date range, JSON output, and `time-standard=LST`. Relevant parameters are `T2M_MAX`, `T2M_MIN`, `T2M`, and `PRECTOTCORR`; request only what the computation uses. LST is a solar-time convention, not the Philippines' civil time zone.

NASA's [data FAQ](https://power.larc.nasa.gov/docs/faqs/data/) describes meteorology originating from MERRA-2/GEOS assimilation products and warns that values represent their source resolution. Its [API tutorial](https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/) describes approximately 0.5° × 0.625° meteorological resolution and discourages redundant requests within a cell. Accordingly, POWER is regional gridded context, not a thermometer or rain gauge at a field. A precise input coordinate does not confer plot-level accuracy.

Preserve the complete response and a request manifest before normalization. The manifest should include retrieval time, request URL/parameters, requested coordinates, returned geometry, source names, API version, parameter names/units, declared fill value, and a SHA-256 digest. The API's current metadata wins over assumptions embedded in code. Validate expected temperature and precipitation units; stop on unknown units rather than guess a conversion. Map the declared missing sentinel (commonly `-999`) to null and retain its reason. Preserve provider quality metadata if supplied; do not fabricate flags when a point response has none.

NASA describes POWER as free, globally available data in its API tutorial. Retain NASA POWER attribution and the product metadata in derived exports. Archive the response for reproducibility because provider data can be revised. Review [NASA's science information policy](https://science.nasa.gov/researchers/science-information-policy/) and each future source's own terms; free access is not a blanket license for unrelated content or a NASA endorsement.

An acquisition failure must produce an actionable error or use an explicitly identified previously acquired cache. Synthetic test fixtures may exercise code but must never appear as NASA observations. Cache by coordinates, range, parameters, community, and time standard; use bounded retries and avoid repeated downloads per interaction.

### Candidate extensions, not current integrations

| Resource | When it helps | How to integrate and retain uncertainty |
| --- | --- | --- |
| [GPM IMERG](https://gpm.nasa.gov/data) | Independent precipitation comparison after POWER replay works | NASA documents 0.1° × 0.1° half-hourly IMERG products and distinguishes Early/Late from Final research products. Select one version/run, inspect QA, aggregate consistently to daily time windows, and compare with local gauges. Do not splice products without provenance. |
| [Earthdata Search](https://search.earthdata.nasa.gov/) and [earthaccess](https://earthaccess.readthedocs.io/en/stable/user/quick-start/) | Reproducible discovery/access for products requiring Earthdata Login | Pin collection short name/version and granule identifiers; search Albay bounding box and dates, download through the Python library, retain checksums and product QA. Keep credentials outside source control. POWER does not require this login. |
| [SMAP](https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/smap) | Add soil-moisture context once a product and validation protocol are selected | Select a documented surface or root-zone product explicitly; they are not interchangeable. Preserve retrieval flags, native scale, and temporal coverage. Do not present a coarse pixel as measured soil moisture on a small paddy. |
| [ECOSTRESS](https://ecostress.jpl.nasa.gov/data) | Explore heat/evapotranspiration with product-specific validation | Inspect cloud/quality masks, acquisition times, revisit gaps, and land-surface versus air-temperature meaning. It cannot directly replace `T2M_MAX`. |
| [Microsoft Planetary Computer](https://planetarycomputer.microsoft.com/docs/concepts/sas/) | Add catalogued satellite/terrain assets with manageable downloads | Discover via STAC, pin collection/item/asset IDs, and use the provider's signed asset access. Check each dataset's license and QA. The public data catalogue is distinct from provisioned Azure compute or Planetary Computer Pro. |
| Local soil, management, measured outcomes | Required before useful farm-specific modeling | Obtain consented field records and local soil measurements/approved surveys. Record collection method and uncertainty. U.S.-specific soil/crop datasets listed in a global challenge are not Albay substitutes. |

## Space Apps offers and Azure roadmap

The NASA GO Team's [13 November 2026 Global Offers announcement](https://github.com/nasa/spaceapps/discussions/2058) explicitly lists Microsoft Azure, Planetary Computer, Microsoft Copilot, GitHub Copilot, and Teams among participant resources. It also lists Google Cloud, Meteomatics, GoDaddy, and Miro. The [2026 Global Offers page](https://www.spaceappschallenge.org/2026/global-offers/) is the activation starting point; it returned HTTP 502 during retrieval here. No offer was activated for this project.

**Verified:** Microsoft participation and the named tools. **Unverified:** this team's eligibility, Azure credit amount, expiry, allowed regions/SKUs, subscription quotas, and redemption state. Do not reuse a past year's offer or assume every Azure product is covered. A [2026 Space Apps Navigator answer](https://github.com/nasa/spaceapps/discussions/2071) explicitly recognizes regional access limitations and local development as an alternative.

The following is a proposed deployment architecture, not deployed infrastructure:

| Product | When to use | TerraProof implementation path |
| --- | --- | --- |
| [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/overview) | After local API, frontend, provenance, and failure-path checks pass | Build the Python API and compiled React assets into a versioned container, publish to a registry, configure HTTPS ingress and health probes, and use revisions for rollback. Use scheduled jobs for bounded ingestion rather than fetching full archives on every request. |
| [Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) | When more than one process needs durable raw/derived artifacts | Separate raw snapshots, normalized data, run manifests, and research reports. Use private containers and identity-based access; preserve content hashes/version IDs and retention rules. Local disk remains the MVP alternative. |
| [Azure Machine Learning pipelines, SDK/CLI v2](https://learn.microsoft.com/en-us/azure/machine-learning/concept-ml-pipelines?view=azureml-api-2) | After measured labels and a credible evaluation design exist | Wrap the same local prepare → validate → split → train → evaluate commands as components. Register versioned data/environment assets; log baseline/model metrics, split manifests, uncertainty, and model cards. Do not auto-promote a research model into farmer-facing predictions. |
| [Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/overview) | Once authenticated external data or database access is introduced | Resolve secrets at runtime through a managed identity. Keep values out of React, Git, command history, exports, and application logs. No vault is necessary for an unauthenticated POWER-only local run. |
| [Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/overview) | Before a shared pilot runs unattended | Record request latency, acquisition failures, data age, missingness, and pipeline failures. Avoid logging precise private farm coordinates or outcome payloads. Set log retention and cost alerts. |
| Azure database, selected later | When multi-user persistent farm records are introduced | Move beyond single-process local storage only after defining account ownership, authorization, consent, backups, migrations, and restore tests. Do not expose a local MVP database directly on the internet. |

### Deployment sequence and alternatives

1. Finish local verification with real acquired climate data and clearly marked test fixtures. Keep the research pipeline runnable without Azure. Record the exact code revision and dependencies in each run.
2. Verify the current offer in the team's own account, allowed deployment region, quotas, expiry, and expected billable services. Configure a budget before provisioning. No cloud provisioning is needed for the local acceptance test.
3. Deploy a staging container from the tested revision. Configure durable storage before relying on data written inside a container; ephemeral container storage is not the data archive. Restrict access until user-data authorization is tested.
4. Replay the same local scenarios in staging and compare scientific outputs and provenance, not just HTTP status. Exercise provider outages, invalid requests, empty data, and a rollback to the preceding revision.
5. Introduce scheduled refresh and research compute separately. Registering a trained artifact is not permission to claim validated yield estimates. Independent regional review remains a release gate.

If an offer cannot be redeemed, continue with the same local Python/React application and filesystem artifacts. A compatible container host can be chosen later. If labels are unavailable, retain historical exposure and editable economics. If field-scale soil evidence is unavailable, retain unknown values and document the gap instead of inferring precise soil properties from a climate grid.

## Research review checklist

- Every dataset has an owner, product/version, units, coverage, access/terms link, retrieval date, QA meaning, and intended use.
- Every displayed result distinguishes historical exposure, user-entered economics, and research model output.
- Unknowns remain unknown; counts disclose coverage and event dates; comparisons use a common historical support.
- Training labels are measured outcomes with provenance, not values synthesized from the same hazard rules being evaluated.
- Splits prevent shared farms/events and future information from leaking into evaluation; preprocessing is fitted only on training data.
- Local agronomic reviewers validate calendars, thresholds, irrigation context, and crop/rotation suitability before any recommendation claim.

All links above were researched on 2026-11-14. Direct-access failures are stated explicitly; no authenticated subscription or offer eligibility was inspected.
