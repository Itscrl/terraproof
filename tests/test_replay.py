from datetime import date

import pytest
from pydantic import ValidationError

from terraproof.climate import ClimateError, days_between, normalize, read_snapshot, unique_keys
from terraproof.models import Comparison, Economics, Plan
from terraproof.replay import economics, replay, summarize


def row(day, heat=35, rain=20):
    return {"date": day, "tmax_c": heat, "tmin_c": 24, "rain_mm": rain, "quality_flags": []}


def test_threshold_boundaries_and_dry_spell():
    days = [
        row("2024-01-01", 34.99, 0.99),
        row("2024-01-02", 35, 0),
        row("2024-01-03", 35.01, 1),
        row("2024-01-04", 30, 20),
    ]
    actual = summarize(days, 35)
    assert actual["heat_days"] == 2
    assert actual["heavy_rain_days"] == 1
    assert actual["longest_dry_spell_days"] == 2
    assert actual["observed_heat_dates"] == ["2024-01-02", "2024-01-03"]


def test_missing_value_is_not_zero_or_complete_summary():
    actual = summarize([row("2024-01-01", None, None), row("2024-01-02", 36, 0)], 35)
    assert actual["heat_days"] is None
    assert actual["longest_dry_spell_days"] is None
    assert actual["valid_heat_days"] == 1
    assert actual["observed_heat_dates"] == ["2024-01-02"]


def test_cross_year_and_leap_day_calendar():
    request = Comparison(
        start_year=2019,
        end_year=2020,
        plans=[
            Plan(name="Winter", planting_month=12, planting_day=1),
            Plan(name="Early", planting_month=1, planting_day=1),
        ],
    )
    rows = [row(d.isoformat()) for d in days_between(date(2019, 1, 1), date(2021, 12, 31))]
    result = replay(request, rows, {}, {})
    winter = result["plans"][0]["seasons"][0]
    assert len(winter["daily"]) == 115
    assert "2020-02-29" in [d["date"] for d in winter["daily"]]
    assert winter["harvest_date"] == "2020-03-24"
    assert result["common_complete_years"] == [2019, 2020]


def test_only_common_complete_years_enter_comparison():
    request = Comparison(start_year=2024, end_year=2024)
    rows = [row(d.isoformat()) for d in days_between(date(2024, 1, 1), date(2025, 12, 31))]
    next(r for r in rows if r["date"] == "2024-06-01")["rain_mm"] = None
    result = replay(request, rows, {}, {})
    assert result["common_complete_years"] == []
    assert all(p["average"]["heat_days"] is None for p in result["plans"])


@pytest.mark.parametrize(
    "kwargs",
    [
        {"planting_month": 2, "planting_day": 29},
        {"planting_month": 4, "planting_day": 31},
    ],
)
def test_invalid_recurring_dates(kwargs):
    with pytest.raises(ValidationError):
        Plan(**kwargs)


def test_economics_units_scaling_and_undefined_break_even():
    result = economics(Economics(area_ha=2))
    assert result["harvest_kg"] == 9000
    assert result["revenue"] == 180000
    assert result["total_cost"] == 90000
    assert result["net"] == 90000
    assert result["break_even_price_php_kg"] == 10
    assert economics(Economics(yield_t_ha=0))["break_even_price_php_kg"] is None
    assert economics(Economics(price_php_kg=0))["break_even_yield_t_ha"] is None


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -1])
def test_nonfinite_and_negative_economics_rejected(value):
    with pytest.raises(ValidationError):
        Economics(yield_t_ha=value)


def payload():
    return {
        "header": {"fill_value": -999},
        "parameters": {
            "T2M_MAX": {"units": "C"},
            "T2M_MIN": {"units": "C"},
            "PRECTOTCORR": {"units": "mm/day"},
        },
        "properties": {
            "parameter": {
                "T2M_MAX": {"20240101": -999, "20240102": 21},
                "T2M_MIN": {"20240101": 24, "20240102": 25},
                "PRECTOTCORR": {"20240101": 0, "20240102": -1},
            }
        },
    }


def test_normalization_preserves_zero_flags_fill_and_invalid_pairs():
    rows, quality = normalize(payload(), date(2024, 1, 1), date(2024, 1, 3))
    assert rows[0]["rain_mm"] == 0
    assert rows[0]["tmax_c"] is None
    assert rows[1]["tmin_c"] is None
    assert rows[1]["rain_mm"] is None
    assert quality["flagged_days"] == 3


def test_unit_mismatch_fails_closed():
    data = payload()
    data["parameters"]["PRECTOTCORR"]["units"] = "in/day"
    with pytest.raises(ClimateError, match="Unexpected source unit"):
        normalize(data, date(2024, 1, 1), date(2024, 1, 1))


def test_duplicate_dates_and_corrupt_cache_rejected(tmp_path):
    with pytest.raises(ClimateError, match="Duplicate"):
        unique_keys([("20240101", 10), ("20240101", 20)])
    path = tmp_path / "bad.json"
    path.write_text("{truncated")
    with pytest.raises(ClimateError, match="restore or reacquire"):
        read_snapshot(path)
