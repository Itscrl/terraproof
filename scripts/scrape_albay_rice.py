"""Archive public Albay municipal yield estimates; keep unsupported years separate.

No field coordinates, harvest dates, measured yield labels or consent are invented.
"""

import csv
import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data/external/albay-public"
BASE = "https://ricelytics.philrice.gov.ph/"
ENDPOINT = BASE + "fetch/get_data_by_province_psgc_new"
PSGC = "0500500000"
PERIODS = ["Annual", "Semester 1", "Semester 2"]


def archive_geometry(client, raw):
    url = BASE + "js/maps_coordinates/phl-city-geo1.js"
    path = raw / "municipal-map.js"
    if not path.exists():
        response = client.get(url)
        response.raise_for_status()
        path.write_bytes(response.content)
    text = path.read_text()
    # Parse the static object literal as JSON; never execute downloaded JavaScript.
    text = text[text.index("[") :].strip().rstrip(";")
    text = re.sub(r"(?m)(^\s*|[,{]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', text)
    text = re.sub(r",\s*([}\]])", r"\1", text)
    features = [
        feature for feature in json.loads(text) if feature["properties"].get("ADM2_EN") == "Albay"
    ]
    if len(features) != 18:
        raise ValueError("Expected 18 Albay municipality/city boundaries")
    (DEST / "context/albay-municipal-boundaries.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}) + "\n"
    )
    metadata = {
        "url": url,
        "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "feature_count": len(features),
        "filter": "properties.ADM2_EN == Albay",
        "interpretation": "Administrative boundaries, not rice fields or measured plot locations.",
        "license": "Not stated in map JavaScript; review source reuse terms.",
    }
    (DEST / "geometry-source.json").write_text(json.dumps(metadata, indent=2) + "\n")
    return {feature["properties"]["PSGC_CODE"] for feature in features}


def main():
    raw = DEST / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    (DEST / "context").mkdir(exist_ok=True)
    requests, rows, quarantined = [], [], []
    with httpx.Client(follow_redirects=True, timeout=45) as client:
        path = raw / "available-years.json"
        if not path.exists():
            response = client.post(
                BASE + "fetch/get_available_year_prism", data={"table": "kpi_pay_prism"}
            )
            response.raise_for_status()
            path.write_bytes(response.content)
        advertised = sorted(int(y) for y in json.loads(path.read_text())["years"])
        geometry_codes = archive_geometry(client, raw)
        # 2026 was returned in initial discovery, but is not advertised by the years endpoint.
        years = sorted(set(advertised + [2026]))
        for year in years:
            for period in PERIODS:
                path = raw / f"ricelytics-{year}-{period.replace(' ', '-')}.json"
                query = {"year": year, "psgc_code": PSGC, "period": period}
                request = {
                    "url": ENDPOINT,
                    "method": "POST",
                    "query": query,
                    "file": str(path.relative_to(DEST)),
                }
                try:
                    if not path.exists():
                        response = client.post(ENDPOINT, data=query)
                        response.raise_for_status()
                        payload = response.json()
                        if "municipal_yield_geo" not in payload:
                            raise ValueError("Expected municipal_yield_geo response")
                        path.write_bytes(response.content)
                    payload = json.loads(path.read_text())
                    records = json.loads(payload["municipal_yield_geo"])
                    if not isinstance(records, list):
                        raise ValueError("Municipal records are not a list")
                    request.update(
                        status="archived",
                        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                        record_count=len(records),
                    )
                    for record in records:
                        if int(record["year"]) != year:
                            raise ValueError("Returned year does not match requested year")
                        try:
                            value = float(record["value"])
                        except (ValueError, TypeError):
                            value = None
                        row = {
                            "location": record["location_name"],
                            "psgc": str(record["map_ID"]),
                            "geographic_level": "province"
                            if str(record["map_ID"]) == PSGC
                            else "municipality_or_city",
                            "year": year,
                            "requested_reporting_period": period,
                            "source_yield_value": value,
                            "display_unit": "metric tonnes per hectare",
                            "source_kind": "municipal_yield_estimate_not_measured_field_yield",
                            "year_advertised": year in advertised,
                            "exact_planting_date": "",
                            "exact_harvest_date": "",
                            "field_latitude": "",
                            "field_longitude": "",
                            "field_label_eligible": False,
                            "source_file": str(path.relative_to(DEST)),
                        }
                        (rows if year in advertised else quarantined).append(row)
                except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                    request.update(status="failed", reason=str(exc))
                requests.append(request)
                print(f"{year} {period}: {request['status']}", flush=True)
    for row in rows + quarantined:
        if row["geographic_level"] == "municipality_or_city":
            assert row["psgc"] in geometry_codes, "Unmatched municipality identifier"
    seen = set()
    for row in rows + quarantined:
        key = (row["psgc"], row["year"], row["requested_reporting_period"])
        assert key not in seen, f"Duplicate location/year/period: {key}"
        seen.add(key)
    if rows:
        with (DEST / "context/municipal-yield-history.csv").open(
            "w", newline="", encoding="utf-8"
        ) as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    # Only rejection identifiers are exported; unverified targets stay in raw responses.
    rejected = [
        {
            "location": row["location"],
            "psgc": row["psgc"],
            "year": row["year"],
            "period": row["requested_reporting_period"],
            "reason": "Year not advertised by source; not eligible for training",
            "source_file": row["source_file"],
        }
        for row in quarantined
    ]
    (DEST / "rejections.json").write_text(json.dumps(rejected, indent=2) + "\n")
    manifest = {
        "scraped_at_utc": datetime.now(UTC).isoformat(),
        "landing_page": BASE + "rice_industry?psgc_code=0500500000&locType=2",
        "advertised_years": advertised,
        "historical_rows": len(rows),
        "historical_municipal_rows": sum(
            r["geographic_level"] == "municipality_or_city" for r in rows
        ),
        "unverified_year_rows": len(quarantined),
        "measured_field_labels_found": 0,
        "training_eligible": False,
        "dataset_role": "context_only",
        "context_table": "context/municipal-yield-history.csv",
        "reason": "No independently measured field yields with matched dates and locations",
        "interpretation": [
            "Public map estimates are not crop-cut or measured field-season yield observations.",
            "Reporting periods are request parameters; exact crop-season dates are not supplied.",
            "The map-view center is provincial, not a field coordinate; "
            "it is not assigned to observations.",
            "2026 responses are quarantined because the years endpoint "
            "only advertises earlier years.",
            "Annual and semester summaries overlap and must not be treated as independent samples.",
            "No data joined to HDF5 pixels; no promotion or training-label eligibility inferred.",
        ],
        "requests": requests,
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                key: manifest[key]
                for key in [
                    "historical_rows",
                    "historical_municipal_rows",
                    "unverified_year_rows",
                    "measured_field_labels_found",
                ]
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
