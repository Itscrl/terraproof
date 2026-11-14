"""Shared, strict API and pipeline contracts. Units are part of field names."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Stage(Contract):
    name: str = Field(min_length=1, max_length=40)
    days: int = Field(ge=1, le=150)


def default_stages() -> list[Stage]:
    return [
        Stage(name="Vegetative", days=55),
        Stage(name="Reproductive", days=30),
        Stage(name="Ripening", days=30),
    ]


class Economics(Contract):
    area_ha: float = Field(default=1, gt=0, le=10000)
    yield_t_ha: float = Field(default=4.5, ge=0, le=30)
    price_php_kg: float = Field(default=20, ge=0, le=1000)
    seeds_php_ha: float = Field(default=3500, ge=0, le=1e7)
    fertilizer_php_ha: float = Field(default=12000, ge=0, le=1e7)
    labor_php_ha: float = Field(default=18000, ge=0, le=1e7)
    irrigation_php_ha: float = Field(default=5000, ge=0, le=1e7)
    other_php_ha: float = Field(default=6500, ge=0, le=1e7)
    assumption_date: date = date(2026, 11, 14)
    market: str = Field(
        default="Illustrative PHP assumptions; replace with local quotes", max_length=200
    )


class Plan(Contract):
    name: str = Field(default="June planting", min_length=1, max_length=80)
    planting_month: int = Field(default=6, ge=1, le=12)
    planting_day: int = Field(default=1, ge=1, le=31)
    variety: str = Field(default="Illustrative 115-day rice", min_length=1, max_length=100)
    stages: list[Stage] = Field(default_factory=default_stages, min_length=3, max_length=3)
    economics: Economics = Field(default_factory=Economics)

    @model_validator(mode="after")
    def calendar_valid(self):
        # A recurring annual plan must exist in every replay year.
        date(2001, self.planting_month, self.planting_day)
        if [stage.name for stage in self.stages] != ["Vegetative", "Reproductive", "Ripening"]:
            raise ValueError("Stages must be Vegetative, Reproductive, Ripening in that order")
        if sum(stage.days for stage in self.stages) > 240:
            raise ValueError("Total season duration must be at most 240 days")
        return self


class Comparison(Contract):
    title: str = Field(default="Albay rice comparison", min_length=1, max_length=100)
    latitude: float = Field(default=13.1391, ge=12.7, le=13.6)
    longitude: float = Field(default=123.7438, ge=123.2, le=124.2)
    start_year: int = Field(default=2015, ge=1981, le=2024)
    end_year: int = Field(default=2024, ge=1981, le=2024)
    source: Literal["bundled", "live"] = "bundled"
    heat_threshold_c: float = Field(default=35, ge=30, le=42)
    plans: list[Plan] = Field(
        default_factory=lambda: [Plan(), Plan(name="July planting", planting_month=7)],
        min_length=2,
        max_length=4,
    )

    @model_validator(mode="after")
    def ordered(self):
        if self.end_year < self.start_year or self.end_year - self.start_year > 19:
            raise ValueError("Choose an ordered historical window of at most 20 years")
        if len({p.name for p in self.plans}) != len(self.plans):
            raise ValueError("Plan names must be unique")
        if self.source == "bundled" and (
            self.latitude != 13.1391 or self.longitude != 123.7438 or self.start_year < 2015
        ):
            raise ValueError("Bundled NASA data covers only the Albay pilot point, 2015–2025")
        return self
