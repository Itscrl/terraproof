# Albay public-data scrape: context only

No new measured field labels were found. Nothing in this folder was added to model training. All generated records explicitly set `field_label_eligible=false`; the manifest sets `training_eligible=false` and `dataset_role=context_only`. The scraper writes estimates into a separate `context/` directory, not the field-outcomes template or any training script input path.

## Useful context retained locally

- `context/municipal-yield-history.csv`: 456 location/year/reporting-period rows for 2018–2025. These include 432 municipality/city rows and 24 province summaries. Annual and semester summaries overlap; they are not 456 independent samples.
- `context/albay-municipal-boundaries.geojson`: all 18 municipality/city polygons from the public RiceLytics map. Every municipal estimate matches a polygon's PSGC identifier. These are administrative boundaries, not individual rice plots.
- `raw/albay-rice-occurrence-map.pdf`: DA-AMIA crop occurrence map. Useful for general rice coverage; no measured yield labels or matched planting/harvest dates.
- `raw/varmix-2023.pdf`: published varietal-mixture experiment including Albay trial locations. Experiments were established in 2015–2016, not the October 2026 satellite season. Published summaries do not supply a complete table of plot coordinates, exact season dates and per-plot harvest observations.

## Excluded from training

The public map endpoint returns 38 location-period values for 2026, but its available-years endpoint advertises only 2018–2025. These responses are **unverified**, not established to be either correct or incorrect. Their values are retained only in the ignored raw responses. No CSV of unverified values is retained. `rejections.json` contains identifiers and reasons without yield values.

Other unsuitable leads:

- The PNA report on Itaran, Polangui in October 2026 reports harvest in sacks per hectare. Exact field boundaries, season dates, standardized sack weights and measurement protocols are absent; no conversion to tonnes/ha or model labels was made.
- The Daraga rainfed-rice thesis describes a 2015 survey, but its repository says the full document is not available. No survey microdata were obtained.
- A 2012 PhilRice report download timed out; its partial bytes are named `.partial` and were not parsed into observations.
- The RDAC Albay search API path returned 404. A Harvard Dataverse search returned eight broader survey/tenure records, not verified matching October 2026 measured rice field yields. The search response is archived locally; no raw surveys were substituted as labels.

Missing requirements remain exact field locations or boundaries, linked planting/harvest dates, measured yields with units/methods, appropriate permissions, and independent seasons/locations. Aggregated estimates must not be assigned to every satellite pixel to create artificial field labels.

## Reproduce and inspect

Run `python scripts/scrape_albay_rice.py` with the project dependencies. It uses the public POST requests exposed by the RiceLytics page; it does not log in, bypass verification or submit a request to an agency. It preserves raw responses and hashes, parses static map geometry without executing downloaded JavaScript, checks duplicate location/year/period keys and matches municipal identifiers. Existing archived responses are reused for reproducibility; a new acquisition should use a new archive directory rather than silently updating past source data.

`manifest.json` contains exact request parameters, response hashes, counts and limitations. CSVs, polygons, source documents and raw responses stay local. Source reuse rights should be checked before redistribution.

## Sources

- [PhilRice RiceLytics Albay](https://ricelytics.philrice.gov.ph/rice_industry?psgc_code=0500500000&locType=2)
- [Public map geometry](https://ricelytics.philrice.gov.ph/js/maps_coordinates/phl-city-geo1.js)
- [DA-AMIA Albay crop occurrence map](https://amia.da.gov.ph/wp-content/uploads/2024/03/Albay_CRVA_Crop-Occurence_Maps.pdf)
- [Pacada and Francia, 2023](https://scienggj.org/2023/SciEnggJ%202023-vol16-no01-p8-18-Pacada%20and%20Francia.pdf)
- [PNA Polangui irrigation report](https://www.pna.gov.ph/article/nia-bicol-provides-solar-irrigation-p935-m-livelihood-aid-to-albay-farmers)
- [UPLB Daraga thesis record](https://www.ukdr.uplb.edu.ph/etd-undergrad/5613/)
