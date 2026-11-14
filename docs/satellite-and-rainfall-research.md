# Satellite inputs and rainfall research

## Status on 15 November 2026

The two supplied NISAR `.h5` files are satellite data containers, not trained neural
networks. **Neither can be used for training in its current local state.** Both have
the expected file length but differ from NASA's file-level MD5 checksums and fail
HDF5 reads. The original files were preserved and excluded from Git and Docker.
The committed [audit](evidence/nisar-input-audit-20261115.json) records full filenames,
SHA-256 fingerprints, NASA archive records and reader errors.

| Input | Local bytes | NASA MD5 | Local MD5 | Reader result |
| --- | ---: | --- | --- | --- |
| GCOV, 2026-10-31, P05036 | 5,091,885,056 | `8bfb4cd82b8a617431c35588de6b4793` | `08f4bd5b22019da40ba42b1aed1c3b83` | Root object metadata unreadable |
| SME2, 2026-10-19, P05023 | 77,594,624 | `e4617082fa2ab415933adc162b825ee4` | `595642aad13b3cb79af484880638ef58` | HDF5 signature not found |

Both local files changed between the first audit and the final recheck, while their
lengths and reported modification dates stayed the same. The table records the
latest recheck, not a permanent statement about future replacements. An ongoing
download/copy is one possible explanation; the cause was not established. Wait for
all writers to finish and rerun the checksum audit on any replacement. Size and
timestamp checks alone are insufficient to establish a complete download.

Source records: [GCOV G4408257877-ASF](https://cmr.earthdata.nasa.gov/search/concepts/G4408257877-ASF.umm_json)
and [SME2 G4381001255-ASF](https://cmr.earthdata.nasa.gov/search/concepts/G4381001255-ASF.umm_json),
retrieved 2026-11-14 UTC / 2026-11-15 Manila. Use the individual
`DataGranule.ArchiveAndDistributionInformation` entry matching the `.h5` filename.
The catalog's aggregate granule size includes companion files and is **not** the
expected HDF5 length. MD5 here checks archive integrity, not authenticity/security.

The GCOV granule belongs to the validated collection; SME2 is provisional. Their
footprints include the pilot vicinity, but usable raster coverage cannot be verified
from damaged files. GCOV is 12 days later than SME2: pairing their pixels would use
future radar to predict past soil moisture. A single SME2 scene also cannot establish
a temporal forecasting dataset, and neither file supplies measured crop yields.

NASA documents [GCOV](https://nisar-docs.asf.alaska.edu/gcov/) as terrain-corrected
backscatter. [SME2](https://nisar-docs.asf.alaska.edu/sme2/) uses a GCOV time series;
the provisional soil-moisture product is not fully calibrated. Its published
0.06 m³/m³ accuracy **goal** is not TerraProof validation or a crop-risk threshold.

## Recover and audit the satellite inputs

1. Re-download each product through authenticated
   [ASF Vertex](https://nisar-docs.asf.alaska.edu/vertex/) or
   [Earthdata Search](https://nisar-docs.asf.alaska.edu/earthdata-search/) to a new
   directory such as `data/local/nisar/`. The anonymous download probe returned
   HTTP 401 at Earthdata login. Do not put passwords or tokens in the repository.
2. Save the two linked public CMR UMM-G records locally as `gcov-umm.json` and
   `sme2-umm.json`. Check exact granule identity; validated and provisional collections
   differ. The audit does not independently authenticate user-supplied metadata.
3. Run the read-only check with both metadata files:

```powershell
uv run terraproof inspect-h5 (Get-ChildItem data/local/nisar -Filter *.h5).FullName --metadata data/local/nisar/gcov-umm.json data/local/nisar/sme2-umm.json --output artifacts/nisar-audit-002.json
```

Without `--metadata`, the command inventories readable datasets and computes hashes
but cannot verify against NASA's archive checksum. With it, every supplied input
must have a matching archive entry. Integrity/read errors exit 2; existing reports
are never overwritten. Hashing is streamed in 8 MiB blocks; no full radar raster is
loaded. External/virtual raster storage is unsupported. Metadata readability alone
does not establish raster integrity, usable quality or training readiness.

4. For a soil-moisture prediction project, acquire a multi-date series with explicit
   feature/target timing and independent ground measurements for validation. Decode
   fill values, retrieval/quality flags and CRS from the actual readable schema;
   aggregate/co-register grids before joining. Respect publication latency. Split
   by later acquisitions and independent spatial blocks, retaining a persistence
   baseline. Do not randomly split adjacent pixels and claim independent accuracy.
5. For crop-yield prediction, additionally supply the consented field-season outcomes
   in [the existing data contract](data-contracts.md). No satellite-to-yield labels
   are synthesized. A satellite feature extractor/trainer is **not implemented**:
   these unreadable, mismatched inputs do not support validating one responsibly.

## Implemented alternative: seven-day rainfall research

An actual Ridge model was trained from the existing public NASA POWER Albay history.
**It did not use either HDF5 file.** It predicts the sum of `PRECTOTCORR` on days
issue+1 through issue+7, in mm. This is a retrospective statistical experiment using
[NASA gridded meteorology](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/),
not a field rain gauge, live forecast, irrigation prescription or crop-yield model.

Inputs contain only weather through the issue date: rainfall for 1/7/30 days,
seven-day mean Tmax/Tmin, and seasonal sine/cosine terms. Thirty complete days are
required; missing values are excluded, not filled. StandardScaler and Ridge alpha=10
fit only the training block; negative predictions are clipped to zero. Models and
baselines were fixed before evaluation, with no tuning or refitting on held-out data.
Monday issue dates make the seven-day target windows non-overlapping. Windows that
cross split boundaries are excluded; training labels end before validation begins.

| Block | Target period | Complete weeks |
| --- | --- | ---: |
| Train | First issue 2015-02-02 through target end 2020-12-28 | 308 |
| Validation | Issue 2021-01-04 through target end 2022-12-26 | 103 |
| Test | Issue 2023-01-02 through target end 2025-12-29 | 156 |

| Predictor | Validation MAE (mm) | Test MAE (mm) | Test RMSE (mm) |
| --- | ---: | ---: | ---: |
| Ridge | 35.07 | 38.67 | 53.42 |
| Training-only monthly mean | **32.79** | **37.85** | 57.84 |
| Previous seven-day total | 43.79 | 47.48 | 70.14 |

Ridge improves RMSE and beats persistence, but its MAE is worse than the seasonal
baseline in both held-out blocks. **Do not promote it to farming advice.** Error
statistics are against POWER estimates; they do not measure accuracy at a farm.
There are no calibrated prediction intervals, independent spatial validation,
prospective observations or simulated publication/revision latency. Weekly errors
can still be temporally correlated. The archived data were retrieved in November
2026; historic issue dates do not assert those exact values were available then.

The 7/30-day windows, alpha=10, Monday sampling and minimum 100/20/20 split counts
are explicit engineering choices, not research-established agronomic thresholds.
The split rationale follows [Roberts et al. (2017)](https://doi.org/10.1111/ecog.02881)
on structured-data evaluation and [scikit-learn's temporal evaluation guidance](https://scikit-learn.org/stable/modules/cross_validation.html#time-series-split).
Those references justify guarding against dependence/leakage; they do not validate
this particular model, horizon, location or sample size.

## Reproduce and call the connected pipeline

```powershell
uv run terraproof train-rainfall --output artifacts/rainfall-002
uv run terraproof predict-rainfall --model artifacts/rainfall-002/model.json --issue-date 2025-12-22
```

Optional `--snapshot`, `--validation-year` and `--test-year` support a new documented
experiment. Never revise splits/settings after seeing test results and describe the
same test set as untouched. A run writes `features.csv`, `predictions.csv`, a JSON
coefficient model and a model card with provenance, exclusions, metrics by year,
dependency versions and blocked promotion. Output directories cannot be overwritten.
The bundled [model](../data/reference/rainfall-research-v1/model.json) and
[model card](../data/reference/rainfall-research-v1/model-card.json) are reviewed
research artifacts from `artifacts/rainfall-001`, not an automatically promoted model.

FastAPI exposes the same predictor independently of the historical comparison UI:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/research/rainfall
Invoke-RestMethod http://127.0.0.1:8000/api/research/rainfall/predict -Method Post -ContentType 'application/json' -Body '{"issue_date":"2025-12-22"}'
```

Restart the server after updating source. Every prediction includes the source/model
hashes, feature values, target dates, `research_only: true`,
`operational_use_allowed: false` and limitations. It cannot change economics,
planting comparisons or assumed yields. JSON coefficients are validated without
unpickling. Inference rejects dates within training, incomplete input windows,
nonfinite coefficients and transfer to a different coordinate point. The API uses
the bundled historical snapshot only; requesting a current November 2026 prediction
returns 422 because those observations are absent.

For later Azure ML work, use the same CLI with immutable data assets and a fresh
output directory in a command job; track source hashes, split settings and Git commit.
Job success is not registry/deployment approval. Current results and corrupted NISAR
inputs do not meet promotion gates. See [the platform roadmap](research-and-platforms.md).
