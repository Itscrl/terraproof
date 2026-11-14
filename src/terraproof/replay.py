"""Pure deterministic replay. Exposure is never translated into damage or yield."""

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from statistics import mean

from .models import Comparison, Economics

FEATURE_VERSION = "replay-v1"
RULES = {
    "heat": {
        "default": 35,
        "unit": "°C",
        "operator": ">=",
        "variable": "daily Tmax",
        "source": "https://doi.org/10.1093/jxb/erm003",
        "limitation": "Screening proxy; daily air maxima are not panicle temperature at anthesis.",
    },
    "heavy_rain": {
        "value": 20,
        "unit": "mm/day",
        "operator": ">=",
        "source": "https://etccdi.pacificclimate.org/list_27_indices.shtml",
        "limitation": "R20mm climate index; not a flood or rice-damage threshold.",
    },
    "dry_day": {
        "value": 1,
        "unit": "mm/day",
        "operator": "<",
        "source": "https://etccdi.pacificclimate.org/list_27_indices.shtml",
        "limitation": "Meteorological dry spell; irrigation and soil water are not modeled.",
    },
}


def money(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def economics(values: Economics) -> dict:
    d = {k: Decimal(str(v)) for k, v in values.model_dump().items() if isinstance(v, (int, float))}
    costs = {
        key.removesuffix("_php_ha"): money(v * d["area_ha"])
        for key, v in d.items()
        if key.endswith("_php_ha")
    }
    total = sum(Decimal(str(v)) for v in costs.values())
    harvest = d["yield_t_ha"] * d["area_ha"] * 1000
    revenue = Decimal(str(money(harvest * d["price_php_kg"])))
    return {
        "currency": "PHP",
        "costs": costs,
        "total_cost": money(total),
        "harvest_kg": float(harvest),
        "revenue": money(revenue),
        "net": money(revenue - total),
        "break_even_price_php_kg": money(total / harvest) if harvest else None,
        "break_even_yield_t_ha": float(total / (d["area_ha"] * d["price_php_kg"] * 1000))
        if d["price_php_kg"]
        else None,
        "assumptions": values.model_dump(mode="json"),
        "status": "User assumptions; not a market forecast or climate-adjusted yield",
    }


def summarize(days: list[dict], threshold: float) -> dict:
    heat_valid = [d for d in days if d["tmax_c"] is not None]
    rain_valid = [d for d in days if d["rain_mm"] is not None]
    heat = [d["date"] for d in heat_valid if d["tmax_c"] >= threshold]
    rain = [d["date"] for d in rain_valid if d["rain_mm"] >= 20]
    longest = run = 0
    for row in days:
        run = run + 1 if row["rain_mm"] is not None and row["rain_mm"] < 1 else 0
        longest = max(run, longest)
    complete_heat, complete_rain = len(heat_valid) == len(days), len(rain_valid) == len(days)
    return {
        "expected_days": len(days),
        "valid_heat_days": len(heat_valid),
        "valid_rain_days": len(rain_valid),
        "heat_days": len(heat) if complete_heat else None,
        "heavy_rain_days": len(rain) if complete_rain else None,
        "rain_total_mm": round(sum(d["rain_mm"] for d in rain_valid), 2) if complete_rain else None,
        "longest_dry_spell_days": longest if complete_rain else None,
        "observed_heat_dates": heat,
        "observed_heavy_rain_dates": rain,
        "complete": complete_heat and complete_rain,
    }


def replay(request: Comparison, rows: list[dict], quality: dict, provenance: dict) -> dict:
    indexed = {row["date"]: row for row in rows}
    plans = []
    for plan in request.plans:
        seasons = []
        for year in range(request.start_year, request.end_year + 1):
            start = date(year, plan.planting_month, plan.planting_day)
            cursor = start
            stages = []
            all_days = []
            for stage in plan.stages:
                daily = []
                for offset in range(stage.days):
                    key = (cursor + timedelta(days=offset)).isoformat()
                    daily.append(
                        indexed.get(
                            key,
                            {
                                "date": key,
                                "tmax_c": None,
                                "tmin_c": None,
                                "rain_mm": None,
                                "quality_flags": ["missing_date"],
                            },
                        )
                    )
                stages.append(
                    {
                        "name": stage.name,
                        "start": cursor.isoformat(),
                        "end": daily[-1]["date"],
                        **summarize(daily, request.heat_threshold_c),
                    }
                )
                all_days.extend(daily)
                cursor += timedelta(days=stage.days)
            seasons.append(
                {
                    "year": year,
                    "planting_date": start.isoformat(),
                    "harvest_date": (cursor - timedelta(days=1)).isoformat(),
                    "stages": stages,
                    "daily": all_days,
                    "summary": summarize(all_days, request.heat_threshold_c),
                }
            )
        plans.append(
            {
                "name": plan.name,
                "variety": plan.variety,
                "seasons": seasons,
                "economics": economics(plan.economics),
            }
        )
    # Compare only years complete for every plan, never unequal denominators.
    common = [
        year
        for year in range(request.start_year, request.end_year + 1)
        if all(
            next(s for s in p["seasons"] if s["year"] == year)["summary"]["complete"] for p in plans
        )
    ]
    for plan in plans:
        valid = [s for s in plan["seasons"] if s["year"] in common]
        keys = ("heat_days", "heavy_rain_days", "rain_total_mm", "longest_dry_spell_days")
        plan["average"] = {
            k: round(mean(s["summary"][k] for s in valid), 2) if valid else None for k in keys
        }
        plan["average"]["reproductive_heat_days"] = (
            round(mean(s["stages"][1]["heat_days"] for s in valid), 2) if valid else None
        )
    return {
        "feature_version": FEATURE_VERSION,
        "request": request.model_dump(mode="json"),
        "rules": RULES,
        "provenance": provenance,
        "quality": quality,
        "common_complete_years": common,
        "plans": plans,
        "warnings": [
            "Historical exposure is not a weather forecast or measured crop damage.",
            "Stage dates are approximate and start at sowing, not transplanting.",
            "No outcome model is deployed. Economics are independent assumptions.",
            "Rainfall does not measure typhoon winds, flooding, or soil-water stress.",
        ],
    }
