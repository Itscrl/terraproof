"""Two-season reference comparisons, not a soil-change or irrigation model."""

from datetime import date, timedelta
from typing import Literal

import httpx
from pydantic import Field, model_validator

from .climate import DATA
from .planting import PlantingRequest, crop_catalog, crop_screen, power_history
from .soil import map_property

CropId = Literal["maize", "rice_indica", "sorghum", "soybean", "potato", "wheat", "groundnut"]


class RotationRequest(PlantingRequest):
    first_crop: CropId = "rice_indica"
    next_crop: CropId = "rice_indica"
    alternatives: list[CropId] = Field(default=["soybean", "maize"], min_length=2, max_length=2)
    next_month: int = Field(default=12, ge=1, le=12)
    goal: Literal["water", "diversity", "familiar"] = "water"

    @model_validator(mode="after")
    def distinct_choices(self):
        if len({self.next_crop, *self.alternatives}) != 3:
            raise ValueError("Choose three different crops for the next season")
        return self


def compare_rotations(request, soil, history):
    catalog = crop_catalog()
    profiles = {p["id"]: p for p in catalog["profiles"]}
    first = crop_screen(profiles[request.first_crop], soil, history, request)
    next_year = request.planning_year + (request.next_month <= request.planting_month)
    next_request = request.model_copy(
        update={"planting_month": request.next_month, "planning_year": next_year}
    )
    next_start = date(next_year, request.next_month, 1)
    # Use the longest published duration to expose possible overlap, not just the midpoint.
    latest = date.fromisoformat(first["indicative_harvest_window"][1])
    options = []
    for index, crop_id in enumerate([request.next_crop, *request.alternatives]):
        second = crop_screen(profiles[crop_id], soil, history, next_request)
        water = [
            first["reference"]["indicative_water_mm"][i]
            + second["reference"]["indicative_water_mm"][i]
            for i in (0, 1)
        ]
        baseline = profiles[request.next_crop]["indicative_water_mm"]
        alternative = second["reference"]["indicative_water_mm"]
        water_note = (
            "Your current plan is the water-reference baseline."
            if index == 0
            else (
                "The second crop has a lower published water-use range than your usual next crop."
                if alternative[1] < baseline[0]
                else (
                    "The second crop has a higher published water-use range "
                    "than your usual next crop."
                    if alternative[0] > baseline[1]
                    else "Water-use ranges overlap; no clear reduction is established."
                )
            )
        )
        overlap = next_start <= latest
        statuses = {first["status"], second["status"]}
        status = (
            "Potential conflict"
            if overlap or "outside_reference" in statuses
            else ("Needs checking" if statuses != {"reference_match"} else "Worth exploring")
        )
        checks = [
            "Ask a local adviser whether these crops and varieties are grown successfully here.",
            "Confirm seeds, buyers, labor, drainage and dependable water before committing.",
            "Check soil nutrients and pests; pH and average temperature are only two checks.",
        ]
        if overlap:
            checks.insert(
                0, "The first crop may still be growing. Move the next planting month later."
            )
        if "needs_data" in statuses:
            checks.insert(
                0, "Soil or weather evidence is missing. Obtain it before choosing a plan."
            )
        same_family = first["family"] == second["family"]
        options.append(
            {
                "id": f"option-{index}",
                "baseline": index == 0,
                "label": "Your current plan" if index == 0 else f"Alternative {index}",
                "sequence": f"{first['name']} → {second['name']}",
                "status": status,
                "seasons": [first, second],
                "overlap": overlap,
                "gap_days_after_latest_harvest": (next_start - latest - timedelta(days=1)).days,
                "water_reference_mm": water,
                "water_note": water_note,
                "soil_note": (
                    "A legume is included. Nitrogen contribution depends on nodulation, residues "
                    "and management; no fertilizer saving is calculated."
                    if "legume" in {first["family"], second["family"]}
                    else "No legume is included. Soil improvement is not established by this plan."
                ),
                "diversity_note": (
                    "Both crops share a broad crop group; this is limited evidence of diversity."
                    if same_family
                    else "The crop group changes. Pest and soil benefits still need local review."
                ),
                "next_steps": checks,
            }
        )
    return {
        "schema": "rotation-screen-v1",
        "request": request.model_dump(mode="json"),
        "options": options,
        "history": {k: v for k, v in history.items() if k != "rows"},
        "soil": soil,
        "catalog_version": catalog["version"],
        "method": {
            "source": catalog["cycle_water_source"],
            "water": "Published whole-crop water use, not irrigation liters. Rain, soil storage, "
            "delivery losses and extra paddy water are not balanced or subtracted.",
            "climate": "Each crop uses its planting month and reference duration across complete "
            "historical seasons. Counts may differ; they are not success probabilities.",
            "sequence": "Crops are screened separately. Carry-over soil water, nutrients, pests "
            "and changes in soil health are not simulated. No plan is declared the winner.",
        },
    }


def assess_rotations(request: RotationRequest):
    cache = DATA / "cache" / "soil"
    with httpx.Client(timeout=45, follow_redirects=True) as client:
        soil = map_property(client, request, "phh2o", cache)
        history = power_history(client, request, cache)
    return compare_rotations(request, soil, history)
