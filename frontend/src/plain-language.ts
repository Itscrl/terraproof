import type { Bounds } from "./soil-types";

export function describePlaceFromBounds(
  bounds: Bounds,
  customLabel?: string,
): string {
  if (customLabel && customLabel.trim()) {
    return customLabel.split(",").slice(0, 2).join(", ").trim();
  }
  const lat = (bounds.north + bounds.south) / 2;
  const lon = (bounds.east + bounds.west) / 2;

  // Check Albay / Bicol region
  if (lat >= 12.8 && lat <= 13.6 && lon >= 123.3 && lon <= 124.2) {
    return "Albay, Bicol Farmland";
  }
  // Check Luzon
  if (lat >= 12.0 && lat <= 18.6 && lon >= 119.5 && lon <= 124.5) {
    return "Luzon Farmland Belt";
  }
  // Check Visayas
  if (lat >= 9.0 && lat < 12.0 && lon >= 121.5 && lon <= 126.0) {
    return "Visayas Valley Parcel";
  }
  // Check Mindanao
  if (lat >= 5.5 && lat < 9.0 && lon >= 121.5 && lon <= 126.8) {
    return "Mindanao Highland Plot";
  }
  if (Math.abs(lat) <= 23.5) {
    return "Tropical Farm Parcel";
  }
  return "Regional Farm Parcel";
}

export function describePlotSizeInWords(areaHa: number): string {
  if (areaHa < 1.0) return "Compact Garden Plot";
  if (areaHa <= 3.5) return "Family Farm Plot";
  if (areaHa <= 15) return "Medium Farm Field";
  if (areaHa <= 100) return "Large Farm Estate";
  return "Regional Farmland";
}

export function describeDepthInWords(depth: string): string {
  if (depth === "0-5cm") return "Surface Topsoil";
  if (depth === "5-15cm") return "Shallow Root Layer";
  if (depth === "15-30cm") return "Deep Root Layer";
  return "Topsoil Layer";
}

export function describeLocationBanner(
  bounds: Bounds,
  areaHa: number,
  depth: string,
  customLabel?: string,
): string {
  const place = describePlaceFromBounds(bounds, customLabel);
  const size = describePlotSizeInWords(areaHa);
  const layer = describeDepthInWords(depth);
  return `${place} · ${size} · ${layer}`;
}

export function describePhInWords(ph: number | null | undefined): {
  title: string;
  summary: string;
  tone: "good" | "warm" | "cool";
} {
  if (ph == null) {
    return {
      title: "Balanced Topsoil",
      summary: "Suited for common staple grains and legumes.",
      tone: "good",
    };
  }
  if (ph < 5.3) {
    return {
      title: "Slightly Sour (Acidic) Soil",
      summary: "Good for rice and pineapple; add agricultural lime for corn.",
      tone: "warm",
    };
  }
  if (ph <= 6.8) {
    return {
      title: "Sweet Spot Soil Balance",
      summary: "Roots absorb nutrients easily here — ideal for most crops.",
      tone: "good",
    };
  }
  return {
    title: "Mineral-Rich Alkaline Soil",
    summary: "Add compost and organic mulch to help roots feed.",
    tone: "cool",
  };
}

export function describeCarbonInWords(soc: number | null | undefined): {
  title: string;
  summary: string;
} {
  if (soc == null || soc >= 15) {
    return {
      title: "Rich Organic Matter",
      summary: "Dark, living soil that holds plant food well.",
    };
  }
  if (soc >= 8) {
    return {
      title: "Moderate Soil Fertility",
      summary: "Healthy base; rotating with beans keeps it fertile.",
    };
  }
  return {
    title: "Light Organic Matter",
    summary: "Mix in crop residue or compost before planting.",
  };
}

export function describeClayInWords(clay: number | null | undefined): {
  title: string;
  summary: string;
} {
  if (clay == null || (clay >= 20 && clay <= 38)) {
    return {
      title: "Moisture-Holding Loam",
      summary: "Holds rain well without choking plant roots.",
    };
  }
  if (clay > 38) {
    return {
      title: "Heavy Water-Holding Clay",
      summary: "Great for paddy rice; dig drainage canals for vegetables.",
    };
  }
  return {
    title: "Fast-Draining Sandy Soil",
    summary: "Drains quickly after heavy rain — great for root crops & peanuts.",
  };
}

export function describeWetnessInWords(wetFrac: number | null | undefined): {
  title: string;
  summary: string;
} {
  const v = wetFrac ?? 0.64;
  if (v >= 0.75) {
    return {
      title: "Very Wet Root Zone",
      summary: "Soil is soaked — ready for rice or wait before plowing.",
    };
  }
  if (v >= 0.45) {
    return {
      title: "Healthy Root Moisture",
      summary: "Damp enough for seeds to sprout smoothly.",
    };
  }
  return {
    title: "Dry Surface Soil",
    summary: "Wait for steady rain or prepare irrigation water.",
  };
}

export function describeRainfallInWords(rainMm: number): {
  label: string;
  detail: string;
} {
  if (rainMm >= 250) {
    return {
      label: "Heavy Monsoon Rain",
      detail: "Plenty of natural water for thirsty crops",
    };
  }
  if (rainMm >= 150) {
    return {
      label: "Steady Growing Rain",
      detail: "Balanced rain for grains and vegetables",
    };
  }
  return {
    label: "Sunny & Mild Rain",
    detail: "Best for drought-hardy beans, peanuts, or irrigated plots",
  };
}

export function describeTempInWords(tempC: number): string {
  if (tempC >= 28) return "Warm Sunny Days";
  if (tempC >= 25.5) return "Mild Tropical Warmth";
  return "Cool Breeze Season";
}

export function describeReturnInWords(roiPct: number, tier: string): {
  headline: string;
  subline: string;
} {
  if (tier === "prime" || roiPct >= 80) {
    return {
      headline: "High-Profit Harvest",
      subline: "Strong buyer demand & low seed-to-harvest risk",
    };
  }
  if (tier === "strong" || roiPct >= 55) {
    return {
      headline: "Steady Cash Crop",
      subline: "Reliable local market with dependable farmgate buyers",
    };
  }
  return {
    headline: "Safe Diversifier",
    subline: "Good backup crop for rotation and soil protection",
  };
}
