# TerraProof

## Platform
Web, local-first pilot.

## Stack
Python and React are explicit user requirements. FastAPI, SQLite, Pydantic,
scikit-learn, TypeScript and Vite are implementation choices.

## Users and purpose
Farmers and extension advisers comparing planting dates through historical climate
replay and transparent economic assumptions. The proposed pilot is rice in Albay.
The initial audience and advisory workflow come from the repository's preparation plan.

## Evidence boundaries
Historical exposure, observed outcomes and user-entered economics are separate.
No validated yield prediction, damage estimate, weather forecast or crop recommendation.
No supplied observed outcome labels. Training must fail closed until eligible data exists.

## Assumptions selected for this MVP
Legazpi-area point 13.1391 N, 123.7438 E, not an Albay administrative boundary;
2015–2024 planting years with source data through 2025; illustrative 115-day rice,
55/30/30-day stages from sowing, not a certified cultivar calendar. PHP example
economics are editable assumptions, not current price observations.
2026 Field Shift challenge alignment is inferred pending an explicit challenge ID.

## Delivery
Verify locally before deployment. Keep a changelog, professional commits, reproducible
data provenance, documented thresholds, and a connected research pipeline.
