# Public Philippine rice statistics

Downloaded from PSA OpenSTAT: production and harvested area, 1987–2026, for irrigated palay, rainfed palay and total palay across all listed geographies. Raw JSON responses, metadata and exact POST queries are preserved. `manifest.json` records sources, file hashes, counts and unavailable sources.

- `palay-yield-all-locations.csv`: 91,560 rows, including overlapping national/regional/province or city totals.
- `palay-yield-bicol.csv`: 5,040 rows for the six Bicol provinces.
- `palay-yield-albay.csv`: 840 rows for Albay.

Rows include seven overlapping reporting periods and three overlapping ecosystem categories. These are not independent field measurements. Yield is derived as production (metric tonnes) / harvested area (hectares), not downloaded as a separate measured-yield product. Missing values remain blank, including Albay annual 2026 at download time. Do not combine annual, semester and quarterly totals as independent observations. Review geographic changes and provisional data before modeling.

Download missing raw responses with `python3 scripts/fetch_psa_rice.py` using the saved query files (internet required). Rebuild CSVs locally with `python3 scripts/prepare_psa_rice.py`. Each raw response was fetched with a JSON POST using its corresponding query file against the URL recorded in the manifest. The CSV preparation checks dimension alignment and duplicate keys.

The archived RiceLytics Albay pages are documentation only, not an additional dataset. PalayStat redirected to RiceLytics. PSA microdata and PRiSM measured field records were not downloaded: direct PSADA access returned 403, and field records require an access request. No account was created and no request sent.

These aggregate statistics can support a separately designed province-level study. They do not satisfy TerraProof’s current measured field-season yield contract and cannot be assigned to individual HDF5 pixels. Data access does not establish unrestricted reuse rights; consult source terms for the intended use.
