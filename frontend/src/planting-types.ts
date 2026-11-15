import type { SoilRequest } from "./soil-types";

export type Summary = {
  median: number | null;
  min: number | null;
  max: number | null;
};
export type CropReference = {
  id: string;
  name: string;
  species: string;
  family: string;
  source: string;
  temperature_c: { optimal: number[]; absolute: number[] };
  ph: { optimal: number[]; absolute: number[] };
  indicative_days: number[];
  indicative_water_mm: number[];
  local_checks: string;
};
export type CropClimate = {
  reference_days: number;
  complete_seasons: number;
  excluded_years: number[];
  temperature_c: Summary;
  rainfall_mm: Summary;
  longest_dry_run_days: Summary;
  temperature_matching_seasons: number;
  root_wetness: Summary;
};
export type CropScreen = {
  id: string;
  name: string;
  species: string;
  family: string;
  status:
    | "reference_match"
    | "local_review"
    | "outside_reference"
    | "needs_data";
  checks: { ph: string; temperature: string };
  soil_ph: number | null;
  ph_spatial_range: (number | null)[];
  reference: CropReference;
  climate: CropClimate;
  planting_reference: string;
  indicative_harvest_window: string[];
  needs_checking: string[];
};
export type PlantingRequest = SoilRequest & {
  planting_month: number;
  planning_year: number;
  water_supply: "unknown" | "rainfed" | "irrigation";
  priority: "reference_fit" | "shorter_season" | "legume_options";
};
export type MonthlyClimate = {
  month: number;
  complete_years: number;
  temperature_c: Summary;
  rainfall_mm: Summary;
};
export type PlantingReport = {
  request: PlantingRequest;
  status: string;
  crops: CropScreen[];
  history: {
    first_year: number;
    last_year: number;
    status: string;
    spatial_support: string;
    monthly: MonthlyClimate[];
    failures: { reason: string; years: number[] }[];
  };
  method: {
    cycle_source: string;
    duration_assumption: string;
    water_note: string;
    accuracy: string;
  };
};
export type FutureReport = {
  first_year: number;
  last_year: number;
  scenario: string;
  request: PlantingRequest & { scenario: string };
  models: {
    id: string;
    status: string;
    crops: { id: string; name: string; climate: CropClimate }[];
    failures: { reason: string; year: number; variable: string }[];
  }[];
  limitations: string[];
  source: string;
  paper: string;
};
