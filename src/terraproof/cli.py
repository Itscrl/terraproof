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
    inspect = commands.add_parser("inspect-h5", help="Audit local HDF5 metadata without training")
    inspect.add_argument("files", nargs="+", type=Path)
    inspect.add_argument("--output", type=Path, required=True)
    inspect.add_argument("--metadata", nargs="+", type=Path, help="NASA CMR UMM-G JSON files")
    rain = commands.add_parser("train-rainfall", help="Train a retrospective POWER research model")
    rain.add_argument(
        "--snapshot", type=Path, default=ROOT / "data/reference/albay-power-2015-2025.json"
    )
    rain.add_argument("--output", type=Path, required=True)
    rain.add_argument("--validation-year", type=int, default=2021)
    rain.add_argument("--test-year", type=int, default=2023)
    predict = commands.add_parser(
        "predict-rainfall", help="Predict with a trusted research JSON model"
    )
    predict.add_argument("--model", type=Path, required=True)
    predict.add_argument(
        "--snapshot", type=Path, default=ROOT / "data/reference/albay-power-2015-2025.json"
    )
    predict.add_argument("--issue-date", type=date.fromisoformat, required=True)
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
    elif args.command == "inspect-h5":
        from .satellite import inspect_hdf5

        if args.output.exists():
            parser.error("Audit already exists; choose a new --output")
        try:
            records = {}
            for metadata in args.metadata or []:
                contents = json.loads(metadata.read_text(encoding="utf-8"))
                for record in contents["DataGranule"]["ArchiveAndDistributionInformation"]:
                    if record["Name"] in records:
                        raise ValueError("Duplicate archive record; supply each granule only once")
                    records[record["Name"]] = record
            if args.metadata and any(path.name not in records for path in args.files):
                raise ValueError("Source metadata must identify every supplied input file")
            reports = [
                inspect_hdf5(path, archive_record=records.get(path.name)) for path in args.files
            ]
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(json.dumps(reports, indent=2), encoding="utf-8")
            print(f"HDF5 audit saved: {args.output}")
            if any(report["errors"] for report in reports):
                parser.exit(2, "HDF5 integrity checks failed; see the audit report\n")
        except (OSError, ValueError, KeyError, TypeError) as exc:
            parser.exit(2, f"HDF5 input unavailable: {exc}\n")
    elif args.command in {"train-rainfall", "predict-rainfall"}:
        from .climate import ClimateError
        from .forecast import predict_rainfall, train_rainfall

        try:
            if args.command == "train-rainfall":
                result = train_rainfall(
                    args.snapshot, args.output, args.validation_year, args.test_year
                )
            else:
                result = predict_rainfall(args.model, args.snapshot, args.issue_date)
            print(json.dumps(result, indent=2, allow_nan=False))
        except (ClimateError, OSError) as exc:
            parser.exit(2, f"Rainfall research gate: {exc}\n")
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
