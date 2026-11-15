# Maintaining TerraProof for repeated seasonal use

Updated 15 November 2026. This is a maintained Python/React repository with explicit
source versions and reproducible checks. It is a review MVP, not a claim of production
uptime or validated agronomic accuracy.

## Data lifecycle

- History rolls forward: request the ten completed years before the current UTC
  year. Planning-year defaults advance with the calendar.
- `TERRAPROOF_CACHE_TTL_HOURS` defaults to 720 hours (30 days), an operational
  freshness policy rather than a scientific threshold. Set 0 to force reacquisition.
  Every source response is capped at 2 MiB.
- Request-cache entries expire, but content-addressed raw snapshots and SHA-256
  metadata remain under `data/cache/*/snapshots/`. Exports retain retrieval times
  and source hashes. Refresh does not erase previously archived source bytes.
  Preserve older caches during migration if retained reports depend on them.
- FAO profiles and NASA climate file versions are pinned. An update requires unit,
  method, calendar, provider-notice and regional checks, followed by a catalog/rule
  version change. Never silently replace a scientific method or reference depth.
- Successful extracts remain cached when other requests fail. Retry fetches missing
  files and reuses successes. Transport failures get one bounded retry; first-year
  preflight prevents requesting all years of a wholly unavailable model.

Monitor disk usage. Define snapshot archival/retention and backup policies before
public hosting; automatic scientific-snapshot deletion is intentionally absent.

## Farmers' records and backups

Notebook v1 is stored per browser origin under `terraproof.farm-notebook.v1`. It
supports named rectangles, actual crop/management records and laboratory pH-in-water
records. It survives ordinary reloads/restarts. A removal can be undone until the
next change.

Imports validate schema, coordinates, depths, dates, bounded text and values.
Identical plots are skipped; conflicting IDs become separate copies. Existing
records are not replaced. Failed browser writes retain the in-memory edit for export.

Clearing browser data, changing origin/port or changing devices does not carry
records automatically. Export/import is the backup and transfer path. Exports
contain locations/notes. There is no account, cloud sync, lab authentication or
automatic training consent; server sync needs ownership, migrations and backups.

## Repeatable checks

```powershell
uv run ruff check src tests scripts/discover_soil_sources.py scripts/verify_planting_sources.py
uv run ruff format --check src tests scripts/discover_soil_sources.py scripts/verify_planting_sources.py
uv run pytest -q
pnpm --dir frontend build
pnpm --dir frontend test:e2e
```

The default browser suite uses synthetic fixtures and skips the live-source flow.
Set `TERRAPROOF_TEST_PORT` and `TERRAPROOF_LIVE_SOIL=1` for an explicit live run.
It checks soil, historical weather and future scenarios; source availability is external.

Use a fresh output directory for each public-source proof:

```powershell
uv run python scripts/verify_planting_sources.py --region albay --future --output artifacts/source-check-new
uv run python scripts/discover_soil_sources.py --output artifacts/catalog-check-new
```

Check different hemispheres/climates after scientific changes. Inspect failures,
returned cells, temporal completeness, notices and units. Source-proof exit 2 means
an integration remains incomplete; exit 0 never establishes agricultural accuracy.

## Public-service dependencies

Nominatim is manual-search-only, cached, identified by User-Agent and limited to
less than one request/second per API process. Keep one API worker for this prototype.
Multiple workers/users need a shared limiter and an appropriate hosted/self-hosted
provider. `TERRAPROOF_GEOCODER_URL` supports replacement without a code change.
[Provider policy](https://operations.osmfoundation.org/policies/nominatim/).

NASA GIBS provides the globe overview. Esri imagery, topographic maps and reference
labels support detailed navigation, with credits. Public endpoint access does not
establish permanent production entitlement. Review [World Imagery terms](https://goto.arcgisonline.com/maps/World_Imagery)
and basemap licensing before hosting. Image date/resolution varies; it is not a
cadastral boundary or fine-resolution soil measurement.

POWER, SoilGrids, WoSIS and NCCS can change or have outages. Keep provenance, disclose
partial evidence and retain coordinate/retry paths when navigation services fail.

## Release boundary

The application remains a local review build without a public deployment. Before multi-user
release, move long extractions to durable jobs with resumable status, add per-user
quotas/shared concurrency limits, provider budgets, durable object storage, health
monitoring and tested backups. Current future requests are synchronous, limited to
one per API process and four upstream workers. Cold retrieval can take minutes.

Azure Container Apps plus workers/queues and Blob storage are possible next steps;
see [the platform roadmap](research-and-platforms.md). No Azure entitlement, account,
deployment or spending is assumed. Field evaluation is a separate release gate.

## Rotation comparison maintenance

Keep crop IDs and names synchronized between the reference catalog, API Literal
and farmer form. Any rule change requires updating `rotation-screen-v1` and its
methods, submission brief and regression checks. The comparison is recomputed;
it is not saved automatically to the farm notebook. Farmers should download the
text plan or evidence JSON. A new deployment requires rebuilding the frontend and
restarting the API process so `/api/rotations/assess` is available.
