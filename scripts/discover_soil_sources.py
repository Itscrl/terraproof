"""Discover public NASA metadata for TerraProof's proposed global soil pipeline.

Run from this checkout: python scripts/discover_soil_sources.py --output artifacts/soil-discovery
This acquires catalog metadata only, not soil observations or authenticated assets.
"""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import httpx

CMR = "https://cmr.earthdata.nasa.gov/search/collections.json"
QUERIES = {
    "soil_baseline_hwsd": {"doi": "10.3334/ORNLDAAC/1247"},
    "historical_microbial_cnp": {"doi": "10.3334/ORNLDAAC/1264"},
    "moisture_smap": {"short_name": "SPL4SMGP", "version": "008"},
    "reflectance_hls_landsat": {"short_name": "HLSL30", "version": "2.0"},
    "reflectance_hls_sentinel": {"short_name": "HLSS30", "version": "2.0"},
    "precipitation_imerg": {"short_name": "GPM_3IMERGHH", "version": "07"},
    "radar_nisar": {"short_name": "NISAR_L2_GCOV_V1"},
    "moisture_nisar": {"short_name": "NISAR_L3_SME2_PROVISIONAL_V1"},
}


def discover(output: Path):
    output.mkdir(parents=True, exist_ok=False)
    report = {
        "retrieved_at": datetime.now(UTC).isoformat(),
        "scope": "Public discovery only; assets not downloaded, decoded or validated",
        "collections": {},
    }
    with httpx.Client(timeout=45, follow_redirects=True) as client:
        for name, query in QUERIES.items():
            item = {"query": query}
            try:
                response = client.get(CMR, params={**query, "page_size": 20})
                item.update(url=str(response.url), http_status=response.status_code)
                response.raise_for_status()
                raw = response.content
                (output / f"{name}.json").write_bytes(raw)
                entries = response.json()["feed"]["entry"]
                item.update(
                    sha256=hashlib.sha256(raw).hexdigest(),
                    hits=response.headers.get("CMR-Hits"),
                    candidates=[
                        {
                            key: entry.get(key)
                            for key in ("id", "short_name", "version_id", "dataset_id", "links")
                        }
                        for entry in entries
                    ],
                    status="review_candidates" if entries else "no_match",
                )
            except (httpx.HTTPError, ValueError, KeyError) as exc:
                item.update(status="unavailable", error=str(exc))
            report["collections"][name] = item
            print(name, item["status"], item.get("hits", ""))
        try:
            url = "https://appeears.earthdatacloud.nasa.gov/api/product"
            response = client.get(url)
            response.raise_for_status()
            (output / "appeears-products.json").write_bytes(response.content)
            products = response.json()
            report["appeears"] = {
                "url": url,
                "http_status": response.status_code,
                "sha256": hashlib.sha256(response.content).hexdigest(),
                "matching_products": [
                    product
                    for product in products
                    if any(
                        token in str(product.get("Product", ""))
                        for token in ("SPL4SMGP", "HLSL30", "HLSS30", "SPL3SMP")
                    )
                ],
                "limits": "A product listing does not verify any layer or authenticated extraction",
            }
            report["appeears"]["layers"] = {}
            for product_id in ("SPL4SMGP.008", "HLSL30.020", "HLSS30.020"):
                layer_response = client.get(f"{url}/{product_id}")
                layer_response.raise_for_status()
                (output / f"{product_id}-layers.json").write_bytes(layer_response.content)
                report["appeears"]["layers"][product_id] = {
                    "sha256": hashlib.sha256(layer_response.content).hexdigest(),
                    "layer_names": list(layer_response.json()),
                }
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            report["appeears"] = {"status": "unavailable", "error": str(exc)}
    (output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = discover(args.output)
    except (OSError, ValueError) as exc:
        parser.exit(2, f"Discovery failed: {exc}\n")
    if any(item["status"] != "review_candidates" for item in result["collections"].values()):
        parser.exit(2, "Some sources were unavailable or unmatched; review report.json\n")
