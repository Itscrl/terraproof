export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};
export type SoilRequest = Bounds & { depth: string; end_date: string };
export type SoilProperty = {
  id: string;
  label: string;
  unit: string;
  depth: string;
  status: string;
  reason?: string;
  median: number | null;
  p10: number | null;
  p90: number | null;
  valid_samples?: number;
  total_samples?: number;
  sampled_coverage_fraction?: number;
  provenance?: {
    url: string;
    sha256: string;
    bytes: number;
    retrieved_at: string;
  };
};
export type SoilReport = {
  schema: string;
  region: SoilRequest;
  created_at: string;
  status: string;
  properties: SoilProperty[];
  laboratory_references?: {
    id: string;
    label: string;
    unit: string;
    status: string;
    reason?: string;
    possibly_truncated?: boolean;
    limitation?: string;
    observations: {
      profile_id: number;
      layer_id: number;
      source_dataset: string;
      value: number;
      unit: string;
      method: string;
      upper_depth_cm: number;
      lower_depth_cm: number;
      sample_date: string | null;
      licence: string;
      positional_uncertainty: string | null;
    }[];
  }[];
  wetness: {
    status: string;
    reason?: string;
    start?: string;
    end?: string;
    spatial_support?: string;
    daily?: {
      date: string;
      GWETTOP: number | null;
      GWETROOT: number | null;
      TS: number | null;
      PRECTOTCORR: number | null;
    }[];
    provenance?: {
      url: string;
      sha256: string;
      bytes: number;
      retrieved_at: string;
    };
  };
  assessment: {
    model: string;
    source: string;
    statistics: string;
    uncertainty: string;
    limitations: string[];
  };
};
