"""Convert archived PSA PXWeb responses into aggregate rice-yield tables."""

import csv
import hashlib
import json
import math
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data/external/psa-rice"
BASE = "https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/2E/CS/"


def load(name):
    return json.loads((DEST / name).read_text(encoding="utf-8-sig"))


def observations(prefix):
    metadata = load(f"{prefix}-metadata.json")
    response = load(f"{prefix}.json")
    maps = {
        v["code"]: dict(zip(v["values"], v["valueTexts"], strict=True))
        for v in metadata["variables"]
    }
    codes = [c["code"] for c in response["columns"] if c["type"] == "d"]
    rows = {}
    for record in response["data"]:
        key = tuple(maps[c][v] for c, v in zip(codes, record["key"], strict=True))
        assert len(key) == 4
        assert key not in rows, f"Duplicate observation: {key}"
        try:
            value = float(record["values"][0])
            if not math.isfinite(value):
                value = None
        except ValueError:
            value = None
        rows[key] = value
    return rows


def main():
    production, area = observations("production"), observations("area")
    assert production.keys() == area.keys(), "Production/area dimensions differ"
    rows = []
    for key, tonnes in production.items():
        ecosystem, geography, year, period = key
        hectares = area[key]
        valid = tonnes is not None and hectares is not None and hectares > 0 and tonnes >= 0
        rows.append(
            {
                "ecosystem": ecosystem,
                "location": geography.lstrip("."),
                "geographic_level": "national"
                if geography == "PHILIPPINES"
                else ("province_or_city" if geography.startswith("....") else "region"),
                "year": int(year),
                "period": period,
                "production_t": tonnes,
                "harvested_area_ha": hectares,
                "derived_yield_t_ha": tonnes / hectares if valid else None,
                "yield_status": "derived_from_aggregate_estimates"
                if valid
                else "missing_or_zero_area",
            }
        )
    bicol = {"Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"}
    selections = {
        "palay-yield-all-locations.csv": rows,
        "palay-yield-bicol.csv": [r for r in rows if r["location"] in bicol],
        "palay-yield-albay.csv": [r for r in rows if r["location"] == "Albay"],
    }
    for name, selection in selections.items():
        with (DEST / name).open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(selection)
    manifest = {
        "prepared_at_utc": datetime.now(UTC).isoformat(),
        "source": "Philippine Statistics Authority OpenSTAT",
        "production_url": BASE + "0012E4EVCP0.px",
        "area_url": BASE + "0022E4EAHC0.px",
        "method": "production in metric tonnes / harvested area in hectares; missing retained",
        "rows": {name: len(selection) for name, selection in selections.items()},
        "limitations": [
            "Aggregate survey estimates, not independently measured field-season outcomes.",
            (
                "2026 and other source estimates may be provisional or incomplete; "
                "inspect raw metadata."
            ),
            (
                "Annual, semester and quarter periods overlap; do not treat them "
                "as independent samples."
            ),
            (
                "National, regional and province/city totals overlap; geographic "
                "definitions can change."
            ),
            "No field coordinates, exact planting dates, variety or consent records supplied.",
            "Not compatible with the existing measured-field-outcomes training contract.",
        ],
        "restricted_sources": [
            {
                "source": "PSADA Palay Production Survey microdata",
                "status": "not_downloaded",
                "reason": (
                    "Direct catalog request returned HTTP 403; microdata access "
                    "requires checking registration and dataset-specific conditions."
                ),
            },
            {
                "source": "PhilRice/PRiSM measured field records",
                "status": "not_downloaded",
                "reason": "Requires a data request; no request submitted.",
            },
        ],
        "files": {
            p.name: {
                "bytes": p.stat().st_size,
                "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
            }
            for p in sorted(DEST.iterdir())
            if p.is_file() and p.name != "manifest.json"
        },
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest["rows"], indent=2))


if __name__ == "__main__":
    main()
