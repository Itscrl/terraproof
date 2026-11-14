# Alternative rice-yield sources checked

Raw downloads remain local. Run `python scripts/fetch_rice_research.py` with the project's research dependencies to acquire public archives and write checksums. No account, guestbook or data request is submitted.

| Source | What was found | Decision |
| --- | --- | --- |
| IRRI long-term trial, standardized by Carob, 1987–1989 | 287 / 288 / 263 experimental yield records at Los Baños; management, variety, season | Used in a separate exploratory yield experiment with 1987 training, 1988 selection and 1989 evaluation. Not Albay validation. |
| IRRI full long-term archive, DOI 10.7910/DVN/HKX9SF | Metadata public; file endpoint requires guestbook 40 | Not downloaded; no guestbook response supplied. |
| China field-scale paddy yields, DOI 10.5281/zenodo.20077393 | Public archive of 66 fields, measured in 2023; CC BY 4.0 | Downloaded for suitability review. Wrong region/year for the local 2026 HDF5; no valid match. |
| Philippine yields/nutrients, DOI 10.5281/zenodo.22639994 | 83 administrative observations, 13 columns; CC BY 4.0 | Downloaded; unclear nutrient scales, observation year and labeling prevent a defensible time-aware experiment. |
| PRiSM / PSADA field records | Access requirements unresolved | No measured field records downloaded. |

IRRI original identifiers: [1987](https://doi.org/10.7910/DVN/75MPJJ), [1988](https://doi.org/10.7910/DVN/WYCUMH), [1989](https://doi.org/10.7910/DVN/ECKKQO). [Carob standardization](https://carob-data.org/reports/agronomy/doi_10.7910_DVN_75MPJJ.html) provides public transformed archives. The current original 1987 metadata lists CC BY-NC-SA 4.0 and restricted files, while the standardized copy says CC0. This discrepancy is recorded; the raw archives and extracted observations are not redistributed in Git. No restriction on the original download endpoint was bypassed.

The standardizer's `_functions.R` assigns `yield` from `GYkgha`; the research script divides by 1,000 to report tonnes/ha. It also documents fertilizer disagreements and inferred month dates. The standardized observation coordinates are not source GPS measurements. No consent flags, exact dates or independent field identities were fabricated to force these data into the existing gated pipeline.

`train_irri_yield.py` is deliberately an isolated, within-station experiment. Earlier and later years can reuse the same long-term plots; there is no independent spatial holdout. It cannot support Albay recommendations, and no old trial yields were joined to 2026 satellite pixels.
