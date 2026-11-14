export type Economics = {
  area_ha: number;
  yield_t_ha: number;
  price_php_kg: number;
  seeds_php_ha: number;
  fertilizer_php_ha: number;
  labor_php_ha: number;
  irrigation_php_ha: number;
  other_php_ha: number;
  assumption_date: string;
  market: string;
};
export type Plan = {
  name: string;
  planting_month: number;
  planting_day: number;
  variety: string;
  stages: { name: string; days: number }[];
  economics: Economics;
};
export type Request = {
  title: string;
  latitude: number;
  longitude: number;
  start_year: number;
  end_year: number;
  source: "bundled" | "live";
  heat_threshold_c: number;
  plans: Plan[];
};
export type Daily = {
  date: string;
  tmax_c: number | null;
  tmin_c: number | null;
  rain_mm: number | null;
  quality_flags: string[];
};
export type Summary = {
  expected_days: number;
  valid_heat_days: number;
  valid_rain_days: number;
  heat_days: number | null;
  heavy_rain_days: number | null;
  rain_total_mm: number | null;
  longest_dry_spell_days: number | null;
  complete: boolean;
  observed_heat_dates: string[];
  observed_heavy_rain_dates: string[];
};
export type Season = {
  year: number;
  planting_date: string;
  harvest_date: string;
  stages: (Summary & { name: string; start: string; end: string })[];
  daily: Daily[];
  summary: Summary;
};
export type MoneyResult = {
  currency: string;
  costs: Record<string, number>;
  total_cost: number;
  harvest_kg: number;
  revenue: number;
  net: number;
  break_even_price_php_kg: number | null;
  break_even_yield_t_ha: number | null;
  status: string;
  assumptions: Economics;
};
export type Rule = {
  default?: number;
  value?: number;
  unit: string;
  operator: string;
  source: string;
  limitation: string;
};
export type Result = {
  feature_version: string;
  request: Request;
  rules: Record<string, Rule>;
  provenance: {
    dataset: string;
    sha256: string;
    retrieved_at: string;
    request_url: string;
    spatial_resolution: string;
    spatial_method: string;
    time_standard: string;
    source_mode: string;
    header: Record<string, unknown>;
  };
  quality: { expected_days: number; flagged_days: number; imputation: string };
  common_complete_years: number[];
  warnings: string[];
  plans: {
    name: string;
    variety: string;
    seasons: Season[];
    economics: MoneyResult;
    average: Record<string, number | null>;
  }[];
};
export type Saved = { id: string; title: string; created_at: string };
