"""Reproducible live integration evidence, never independent agricultural validation."""

import argparse
import json
import time
from pathlib import Path

from terraproof.planting import FutureRequest, PlantingRequest, assess_future, assess_planting

REGIONS = {
    "albay": (123.7, 13.1, 123.8, 13.2),
    "iowa": (-93.8, 42.0, -93.7, 42.1),
    "kenya": (36.8, -0.1, 36.9, 0.0),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--region", choices=REGIONS, default="albay")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--future", action="store_true", help="Also request two NASA climate models"
    )
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    west, south, east, north = REGIONS[args.region]
    values = dict(west=west, south=south, east=east, north=north, planting_month=6)
    start = time.monotonic()
    report = assess_planting(PlantingRequest(**values))
    (args.output / "planting.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("History:", report["status"], "seconds:", round(time.monotonic() - start, 1), flush=True)
    for crop in report["crops"]:
        print(
            crop["id"], crop["status"], crop["climate"]["complete_seasons"], "seasons", flush=True
        )
    success = report["status"] == "available"
    if args.future:
        future = assess_future(FutureRequest(**values))
        (args.output / "future.json").write_text(json.dumps(future, indent=2), encoding="utf-8")
        for model in future["models"]:
            print(
                model["id"],
                model["status"],
                len(model["provenance"]),
                "files",
                sum(item["bytes"] for item in model["provenance"]),
                "bytes",
                len(model["failures"]),
                "failures",
                flush=True,
            )
        print("Total seconds:", round(time.monotonic() - start, 1), flush=True)
        success = success and all(model["status"] == "available" for model in future["models"])
    return 0 if success else 2


if __name__ == "__main__":
    raise SystemExit(main())
