# Global regional soil assessment

Updated 15 November 2026 (Asia/Manila). The user's clarified product is a globally
accessible soil assessment explorer: select a rectangle on a world globe and inspect
scientific evidence for its soils. Calculator navigation has been removed in favour
of the region-based [farmer crop/season guide](farmer-guide-and-validation.md).
The implementation is a local review build; public application deployment remains deferred.

## Implemented flow

React → Cesium globe → WGS84 rectangle/depth/date → `POST /api/soil/assess` →
small ISRIC WCS extracts + NASA POWER point JSON → masks/units/geometry checks →
regional statistics and a separate centroid wetness series → report/JSON export.

The globe displays NASA GIBS Blue Marble reference imagery, with Esri detailed
imagery and labelled road maps for finding small fields. It is interactive,
not a live camera. NASA [retired NEO in September 2026](https://science.nasa.gov/earth/nasa-earth-observations-neo/)
and identifies GIBS as the alternative for imagery services. NASA's
[GIBS examples](https://github.com/nasa-gibs/gibs-web-examples) include Cesium.
Map tiles are visualizations; the assessment uses numerical source values.

`/` is the soil explorer; `/?workspace=planning` now opens the same farmer workflow
after calculator removal. Region selection works through two globe clicks or editable
coordinates, including when WebGL is unavailable. Requests are permitted worldwide
within the supported geographic domain, rather than restricted to Albay.

## Current numerical sources

| Source / status | Variables | Meaning and scale |
| --- | --- | --- |
| **ISRIC SoilGrids, integrated via WCS** | `phh2o`, `soc`, `clay`, `sand`, `silt`, `cec`, `bdod`, `nitrogen` | Predicted soil properties on a native 250 m grid, selected at 0–5, 5–15 or 15–30 cm depth |
| **NASA POWER, integrated** | `GWETTOP`, `GWETROOT`, `TS`, `PRECTOTCORR` | Recent relative soil wetness, skin temperature and rainfall at the selected region's centroid; coarse meteorological grid |
| **NASA GIBS, integrated display only** | Blue Marble shaded relief/bathymetry tiles | Earth navigation and orientation; not soil measurements or training labels |

SoilGrids is an existing published machine-learning soil map, not a new network
trained by TerraProof. [Poggio et al. (2021)](https://doi.org/10.5194/soil-7-217-2021)
documents the global mapping method, spatial evaluation and uncertainty. It supports
using these maps as regional estimates; it does not establish farm-level accuracy
or validate a universal soil-health score. SoilGrids is **ISRIC**, not NASA.

The SoilGrids [layer specification](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html)
defines storage units. The initial six properties divide raw integers by
10, yielding pH, SOC in g/kg, texture in percent and CEC in cmol(c)/kg. Bulk density
and total nitrogen divide by **100**, yielding kg/dm³ and g/kg respectively. Conversion
factors are property-specific; tests cover the distinct scaling.
SOC is not organic matter, total nitrogen is not plant-available nitrogen, and CEC
is not an N/P/K test. Six standard SoilGrids intervals exist; this first UI exposes
three, without silently merging depths.

NASA [GMAO's soil-moisture definitions](https://gmao.gsfc.nasa.gov/gmao-products/merra-2/faq_merra-2/)
distinguish relative wetness from volumetric moisture. The response's `GWETTOP`
and `GWETROOT` units must be `1`/fraction. TerraProof shows them on their 0–1 scale,
without converting to m³/m³. `TS` is skin temperature, not soil temperature at the
chosen depth. Fourteen daily values end seven days before today by default;
the latest permissible end date is three days ago. These are explicit latency
choices, not agronomic thresholds. Missing source days remain null. Numerical
checks enforce finite values, relative wetness within 0–1 and nonnegative rainfall;
no uncited temperature or extreme-rainfall cutoff is imposed.

POWER's [meteorological-source documentation](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/)
describes MERRA-2 and GEOS-IT. The November live response identified `GEOSIT` in
`header.sources`; TerraProof preserves that header instead of assuming every date
uses MERRA-2. These meteorological wetness fields are not the separate SMAP L4
volumetric-moisture product discussed in POWER's hydrology catalog.

## Small-data processing and numerical meaning

- WCS `GetCoverage` requests bound the rectangle, property, depth and raster size.
  The implementation uses [ISRIC's documented WCS path](https://docs.isric.org/globaldata/soilgrids/WCS_from_Python.html),
  avoiding dependence on the paused beta REST endpoint. No whole-scene download.
- Each layer uses at most 64 × 64 output samples, with fewer samples for small
  regions so the request does not deliberately exceed native 250 m spacing.
  Large rectangles are coarsely sampled. Their results are approximate summaries,
  not a census of every native soil pixel or a map of within-field variability.
- Every upstream response is capped at 2 MiB. Retrieved bytes, URL, time and SHA-256
  are cached under ignored `data/cache/soil/`; matching requests reuse that snapshot
  within an operational 30-day TTL. Archived content-addressed snapshots preserve
  refreshed bytes; see [maintenance](maintenance.md).
  Raster shape, EPSG:4326 bounds, nodata and finite/nonnegative values are checked.
  Service XML errors are not cached as valid rasters. There is no imputation.
- Latitude cosine weights approximate cell area on the regular latitude/longitude
  output grid. Reported median and 10th/90th percentiles describe spatial variation
  among sampled *mean predictions*. They are **not model prediction intervals**.
  Source Q05/Q95 layers are not yet retrieved; model uncertainty remains explicit.
- Coverage is the fraction of valid output samples weighted by latitude, not a
  verified fraction of all land. Water, ice, unmapped and failed samples are unknown.
- The POWER request is at one explicit centroid. Its approximately 0.5° × 0.625°
  meteorological support is disclosed; it must not be presented as a regional mean.
- A single request supports up to 30° in either direction and latitude −85° to 85°.
  These are workload/geometry bounds, not scientific suitability rules. Split larger
  selections and selections crossing the date line. Polar soils are not promised.
- Partial source failures preserve independent available results. No source failure
  produces a fabricated value, healthy/unhealthy grade or fertilizer dose.

Observed live checks: Albay pH median 5.4, SOC 57.2 g/kg; Iowa 6.6 and 21.5 g/kg;
Kenya 6.6 and 33.9 g/kg, all at 0–5 cm for their respective test rectangles. These
are map predictions for those selected samples, not national summaries or laboratory
validation. All eight soil properties and NASA wetness were retrieved in each check.
The eight Albay soil rasters totaled 18,151 bytes (17.7 KiB); exact sizes/hashes remain in the local
`artifacts/soil-live-{albay,iowa,kenya}.json` reports. Live availability is not guaranteed.

## NASA-first expansion catalog: verified discovery, not yet integrated analysis

`scripts/discover_soil_sources.py` makes bounded unauthenticated catalog requests,
archives raw metadata and hashes, and reports candidates instead of automatically
choosing a new source version. The 15 November run found exactly one collection
for every query below and verified AppEEARS product/layer listings.

| Product | Verified CMR ID / version | Role and limitation |
| --- | --- | --- |
| ORNL DAAC regridded HWSD v1.2 | `C2216863856-ORNL_CLOUD`, `HWSD_1247`, v1 | NASA-hosted historical global soil baseline: pH, texture, carbon and related attributes. The archive is derived from FAO/partners, not new satellite chemistry observations; 0.05° files and 0–30/30–100 cm horizons are much coarser/different from SoilGrids. [Dataset DOI](https://doi.org/10.3334/ORNLDAAC/1247) |
| SMAP L4 | `C3480440870-NSIDC_CPRD`, `SPL4SMGP`, `008` | Global 9 km, three-hourly surface (0–5 cm) and root-zone (0–100 cm) volumetric moisture estimates. AppEEARS lists `SPL4SMGP.008`; its catalog labels daily granularity, so inspect extraction time semantics before combining with native three-hourly files. [NSIDC](https://nsidc.org/data/spl4smgp/versions/8) |
| HLS Landsat / Sentinel | `C2021957657-LPCLOUD` / `C2021957295-LPCLOUD`, v2.0 | Near-global 30 m surface reflectance; cloud-masked vegetation/bare-surface context. AppEEARS IDs are `HLSL30.020` and `HLSS30.020`—different version formatting from CMR. [NASA HLS](https://hls.gsfc.nasa.gov/data-products/) |
| IMERG Final | `C2723754847-GES_DISC`, `GPM_3IMERGHH`, `07` | 0.1° half-hourly precipitation; accumulation requires time integration and missing-data handling. Final is delayed research data; do not silently substitute Early/Late. [NASA IMERG](https://gpm.nasa.gov/data/imerg) |
| NISAR GCOV | `C3622241360-ASF`, `NISAR_L2_GCOV_V1`, v1 | Radar backscatter features; acquisition/quality coverage is not uniform worldwide. Not direct pH/NPK observations. |
| NISAR SME2 | `C2854344945-ASF`, `NISAR_L3_SME2_PROVISIONAL_V1`, v1 | Soil-moisture context with provisional-calibration caveats; not chemical soil quality. The two supplied local HDF5 files are not inputs to this explorer. |

SMAP's provider currently flags a **14 May–28 July 2026 geolocation problem** and
ongoing L4 reprocessing. Retain provider notices, granule revision/checksum and
reprocessing status; do not claim those dates are validated because a download succeeds.
Global product scope does not mean every pixel/date is valid or that Antarctica,
oceans, dense vegetation, snow and frozen ground all support the same retrievals.

```powershell
uv run python scripts/discover_soil_sources.py --output artifacts/global-soil-discovery-003
```

Discovery succeeds without an Earthdata account. Most science-asset downloads and
AppEEARS extraction jobs require Earthdata Login; keep credentials server-side.
No authenticated extraction or NASA cloud training job was run in this work.

## Streaming and training without gigabytes on the user's computer

1. **Display:** CesiumJS requests only the visible [GIBS tiles](https://nasa-gibs.github.io/gibs-api-docs/access-basics/).
   The globe does not download full science scenes.
2. **Select:** send rectangle, depth, date and requested indicators to Python. Add
   antimeridian splitting before claiming unrestricted rectangle geometry.
3. **Subset:** for SMAP/HLS use authenticated [AppEEARS](https://appeears.earthdatacloud.nasa.gov/api/)
   point/area tasks, or [Harmony](https://harmony.earthdata.nasa.gov/docs) where that
   exact collection advertises support. Query `/product/{ProductAndVersion}` for
   available layers and QA; do not assume a service supports every NASA collection.
4. **Process:** decode scale/offset/fill, QA flags and temporal support in Python.
   `earthaccess` handles discovery/auth/access; `rasterio` handles GeoTIFF windows;
   `xarray`/`h5netcdf` can process NetCDF/HDF5 where their layouts permit it. HTTP
   range requests can still transfer large chunks; never promise zero transfer.
5. **Aggregate:** retain each source's native support and summarize valid intersecting
   pixels with area weights. A 9 km SMAP pixel must not become a 30 m soil measurement
   by resampling. Track valid area, sample counts and source dates separately.
6. **Train later:** a versioned feature table joins actual soil laboratory samples
   to matching locations, depths, dates, methods and covariates. Fit preprocessing
   on train data only; evaluate held-out regions and later dates, with native soil
   type/land-use subgroups, a baseline and calibrated uncertainty. Reproducing
   SoilGrids outputs measures emulation, not independent soil accuracy.
7. **Serve:** deploy only after target-specific field validation. Users receive a
   compact regional report; datasets remain in managed server/cloud storage.

The initial profile does not need a newly trained neural network: it integrates
published soil predictions and NASA context. A custom model requires independent
soil labels and a defined target such as measured pH or SOC. A global health grade
would additionally require validated land-use/soil-type reference functions.
[USDA NRCS](https://www.nrcs.usda.gov/conservation-basics/soil/soil-health/soil-health-assessment)
describes physical, chemical and biological indicators; moisture alone is insufficient.
No universal 0–100 score, pH cutoff, fertilizer prescription or soil-safety claim is
introduced. Biological activity, contaminants and current regional salinity/available
N/P/K remain unmeasured rather than inferred from imagery. Compatible historical
WoSIS P/EC samples, where available, are a separate evidence section.

## Global hosting and review boundary

The product is for global users. A local URL is a review environment, not its target
market. Current changes are deliberately not committed, pushed or deployed because
the user requested review first. After acceptance, use the existing container build
on Azure Container Apps (or equivalent HTTPS hosting), with a Python worker for
longer extraction/training tasks. Public users need not download source archives.

Server configuration:

```text
TERRAPROOF_PUBLIC_MODE=1
TERRAPROOF_ALLOWED_HOSTS=your-actual-host.example,127.0.0.1,localhost
TERRAPROOF_DATA_DIR=/app/data
```

Public mode disables all saved-comparison API access; same-origin soil requests
are accepted on explicitly configured hosts. Private authenticated projects and
multi-user saved reports are not implemented. Before public launch add bounded
job queues, per-user/IP quotas, durable Blob storage/cache retention, monitoring,
provider-policy review and budget controls. Keep Azure entitlement/credits distinct
from NASA data access. No cloud costs, credits, subscription or deployment are claimed.

Public service secrets stay in managed identity/Key Vault, never React. Run jobs
close to the NASA cloud assets where supported, or send only subset results to Azure;
cross-cloud transfer can cost money. Training still reads data on its compute host:
“without downloading to my laptop” does not mean “without accessing any bytes.”

## Additional soil evidence and gap handling

The expanded pipeline adds SoilGrids bulk density and total nitrogen predictions
and bounded [WoSIS WFS](https://maps.isric.org/generated/vector/wosis_latest.html)
queries for Olsen P, Bray-I P, Mehlich-3 P and saturated-paste electrical conductivity.
It requests at most 64 candidates per method, retains only observations inside the
rectangle whose horizon overlaps the selected depth, removes duplicate profile/layer
records and returns explicitly CC-BY-licensed observations. Different P extractants
and EC methods are not merged. Actual horizon, date, source, licence and positional
uncertainty remain attached; broader horizons are not silently relabeled 0–5 cm.

[Batjes et al. (2024)](https://doi.org/10.5194/essd-16-4735-2024) documents WoSIS
quality assessment/standardisation. Sparse historical profiles do not define present
conditions across a region. WoSIS data may overlap SoilGrids training data, so these
references do not establish independent TerraProof accuracy. Albay returned no
compatible P/EC records in the test rectangle; a Queensland reference rectangle
returned an Olsen-P record and an ECe record. Both outcomes are valid data results.

Two further reviewed candidates address remaining gaps but are not yet numeric
inputs to the assessment:

- [FAO GSASmap](https://www.fao.org/global-soil-partnership/soil-data/global-map-of-salt-affected-soils-gsasmap/en)
  supplies country-contributed salt-affected-soil evidence at 0–30 and 30–100 cm.
  Its incomplete country coverage and different horizons must remain visible.
- [NASA ORNL DAAC microbial C/N/P compilation](https://doi.org/10.3334/ORNLDAAC/1264)
  supplies historical observations and biome-scale modeled context, not a current
  microbial test for an arbitrary selected pixel. The CMR discovery script checks
  its collection metadata; authenticated science-data acquisition is not implemented.

No defensible globally complete source for current plant-available N/P/K or soil
contaminants was established. No missing value is filled by zero, a nearby unrelated
profile, an incompatible depth or a quantity with a different operational definition.
Adding a trained gap model later requires independent held-out observations,
missingness analysis, regional validation and calibrated uncertainty.
