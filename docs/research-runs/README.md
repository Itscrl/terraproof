# Local research results

These reports preserve experimental results in Git; raw downloads, trained binary models, feature tables and predictions remain local under ignored directories. No research model is served by the application.

| Experiment | Result | Interpretation |
| --- | --- | --- |
| PSA Bicol annual yield, 120 train / 12 test rows | Ridge MAE 0.212 t/ha; persistence 0.217. Ridge RMSE 0.305; persistence 0.301. | Marginal MAE improvement, worse RMSE. |
| HDF5 soil moisture 001, spatial columns | Ridge RMSE 0.0788 m³/m³; mean 0.0742. | Did not beat baseline. |
| HDF5 soil moisture 002, spatial rows with validation | Gradient boosting selected from mean/Ridge/forest/boosting. Test RMSE 0.0472 m³/m³; mean 0.0965. | Exploratory within-scene success, only 105 test pixels. Different split from 001; no direct model-improvement claim across those scores. |
| IRRI trial grain yield, 1987 training / 1988 validation / 1989 test | Random Forest selected against Ridge/mean. Test MAE 0.603 t/ha; mean 0.895. RMSE 0.786; mean 1.117. | Within-station later-year experiment. Repeated long-term plots prevent independent spatial validation; not Albay farm performance. |

Candidate selection uses validation scores, then the selected model is evaluated once on the stated test split. Test results are not fed back into parameter search. Saved-model predictions were checked after reloading. HDF5 targets are satellite retrievals derived from radar; agreement is not ground-truth accuracy. Independent locations/acquisitions, measured outcomes and uncertainty calibration remain necessary before promotion.

Run scripts from the repository root with dependencies from `.[training]`. Each training script refuses to overwrite its experiment directory. `train_irri_yield.py` and `refine_h5_model.py` use the documented fixed output paths; choose/edit a new path deliberately for a new experiment. `refine_h5_model.py` consumes experiment 001's quality-screened feature table.

The [alternative-source register](../../data/external/rice-alternatives/README.md) records successful downloads, rejected matches, guestbook requirements and the IRRI license discrepancy. No fake consent, plot identities, exact planting days or satellite joins were created to pass the main training pipeline's gates.

Verification: frontend TypeScript/Vite production build passed. All three Playwright
workflow, responsive (1440/768/390/320 px), accessibility and recovery tests passed.
All 22 backend tests passed. Python lint/format and script compilation passed.
The checks used an available Python 3.12 research environment with dependencies in
the project-supported version ranges, rather than a frozen installation of uv.lock.
