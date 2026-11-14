"""Reproducible data and research commands."""

import argparse
import json
from datetime import date
from pathlib import Path

from .climate import ROOT, fetch_power, load_climate, save_snapshot
from .models import Comparison
from .replay import replay


def main():
    parser = argparse.ArgumentParser(prog="terraproof")
    commands = parser.add_subparsers(dest="command", required=True)
    fetch = commands.add_parser("fetch-pilot", help="Fetch the real Albay NASA POWER snapshot")
    fetch.add_argument(
        "--output", type=Path, default=ROOT / "data/reference/albay-power-2015-2025.json"
    )
    compare = commands.add_parser("replay", help="Validate a plan and export reproducible results")
    compare.add_argument("--request", type=Path)
    compare.add_argument("--output", type=Path, required=True)
    train = commands.add_parser("train", help="Run the gated offline research pipeline")
    train.add_argument("--outcomes", type=Path, required=True)
    train.add_argument("--manifest", type=Path, required=True)
    train.add_argument("--output", type=Path, required=True)
    train.add_argument("--holdout-groups", nargs="+", required=True)
    train.add_argument("--test-from-year", type=int, required=True)
    args = parser.parse_args()
    if args.command == "fetch-pilot":
        if args.output.exists():
            parser.error("Snapshot already exists; choose a new --output to preserve provenance")
        snapshot = fetch_power(13.1391, 123.7438, date(2015, 1, 1), date(2025, 12, 31))
        save_snapshot(snapshot, args.output)
        print(f"NASA snapshot saved: {args.output}")
    elif args.command == "replay":
        request = (
            Comparison.model_validate_json(args.request.read_text())
            if args.request
            else Comparison()
        )
        rows, quality, provenance = load_climate(request)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(replay(request, rows, quality, provenance), indent=2), encoding="utf-8"
        )
        print(f"Historical replay saved: {args.output}")
    else:
        from .training import ReadinessError, train_research

        try:
            result = train_research(
                args.outcomes, args.manifest, args.output, args.holdout_groups, args.test_from_year
            )
            print(json.dumps(result, indent=2))
        except ReadinessError as exc:
            parser.exit(2, f"Research readiness gate: {exc}\n")


if __name__ == "__main__":
    main()
