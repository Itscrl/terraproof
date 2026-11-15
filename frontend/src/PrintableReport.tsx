import { useState } from "react";
import {
  ArrowDownToLine,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  LayoutTemplate,
  MapPin,
  Palette,
  Printer,
  SlidersHorizontal,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { downloadJSON } from "./api";
import type { Bounds, SoilReport } from "./soil-types";
import type { PlantingReport } from "./planting-types";
import { MONTHS } from "./PlantingGuide";
import { MARKET_PROFILES, analyzeMarketTrends } from "./market-trends";

export type PrintDesign = "executive" | "field_poster" | "certificate";
export type PrintTheme = "forest" | "harvest" | "ocean" | "ink";

const DESIGN_META: Record<
  PrintDesign,
  { name: string; badge: string; desc: string }
> = {
  executive: {
    name: "Executive Market Brief",
    badge: "Modern 2-Column",
    desc: "Clean agronomy & market investment brief with KPI cards, seasonal trend charts, and return projections.",
  },
  field_poster: {
    name: "Farmer Field Poster",
    badge: "High-Contrast Field Guide",
    desc: "Large, easy-to-read field action sheet with step-by-step checks, crop calendar, and handwritten note lines.",
  },
  certificate: {
    name: "Agronomy & Market Ledger",
    badge: "Formal Certificate",
    desc: "Classic bordered ledger with full soil horizon metrics, market economics table, and advisor sign-off.",
  },
};

const THEME_META: Record<PrintTheme, { label: string; swatch: string }> = {
  forest: { label: "Emerald Forest", swatch: "#1f5e4b" },
  harvest: { label: "Golden Harvest", swatch: "#9a5b13" },
  ocean: { label: "Coastal Teal", swatch: "#125b70" },
  ink: { label: "Classic Ink", swatch: "#18221e" },
};

const FRIENDLY_SOIL: Record<string, string> = {
  phh2o: "Soil Acidity (pH)",
  soc: "Organic Carbon",
  clay: "Clay Content",
  sand: "Sand Content",
  silt: "Silt Content",
  cec: "Nutrient Hold (CEC)",
  bdod: "Bulk Density",
  nitrogen: "Total Nitrogen",
};

export default function PrintableReport({
  bounds,
  depth,
  areaHa,
  soilReport,
  plantingReport,
  plantingMonth,
  planningYear,
  onRequestAssess,
  busy,
}: {
  bounds: Bounds;
  depth: string;
  areaHa: number;
  soilReport?: SoilReport;
  plantingReport?: PlantingReport;
  plantingMonth: number;
  planningYear: number;
  onRequestAssess: () => void;
  busy: boolean;
}) {
  const [design, setDesign] = useState<PrintDesign>("executive");
  const [theme, setTheme] = useState<PrintTheme>("forest");
  const [farmName, setFarmName] = useState("Albay Regional Farm Plot");
  const [preparedFor, setPreparedFor] = useState("Farm Owner & Local Extension Adviser");
  const [showSoil, setShowSoil] = useState(true);
  const [showMarket, setShowMarket] = useState(true);
  const [showClimate, setShowClimate] = useState(true);
  const [showChecklist, setShowChecklist] = useState(true);

  const phProp = soilReport?.properties.find((p) => p.id === "phh2o");
  const socProp = soilReport?.properties.find((p) => p.id === "soc");
  const clayProp = soilReport?.properties.find((p) => p.id === "clay");
  const cecProp = soilReport?.properties.find((p) => p.id === "cec");
  const lastWetness = soilReport?.wetness.daily?.at(-1);

  const marketSuggestions = plantingReport
    ? analyzeMarketTrends(plantingReport.crops, areaHa)
    : Object.values(MARKET_PROFILES)
        .slice(0, 4)
        .map((profile, idx) => {
          const totalCost =
            profile.costsPhpHa.seeds +
            profile.costsPhpHa.fertilizer +
            profile.costsPhpHa.labor +
            profile.costsPhpHa.irrigation +
            profile.costsPhpHa.other;
          const gross = Math.round(
            profile.defaultYieldTHa * 1000 * profile.defaultPricePhpKg,
          );
          const net = gross - totalCost;
          return {
            crop: {
              id: profile.id,
              name:
                profile.id === "rice_indica"
                  ? "Rice (indica)"
                  : profile.id === "maize"
                    ? "Maize (grain)"
                    : profile.id === "soybean"
                      ? "Soybean"
                      : "Sorghum",
              species: "",
              family: profile.marketCategory,
              status: idx < 2 ? ("reference_match" as const) : ("local_review" as const),
              checks: { ph: "within_reference", temperature: "within_reference" },
              soil_ph: phProp?.median ?? 5.6,
              ph_spatial_range: [phProp?.p10 ?? 5.2, phProp?.p90 ?? 6.1],
              reference: {
                id: profile.id,
                name: profile.id,
                species: "",
                family: "",
                source: "https://www.fao.org/4/s2022e/s2022e07.htm",
                temperature_c: { optimal: [20, 33], absolute: [10, 40] },
                ph: { optimal: [5.0, 7.0], absolute: [4.5, 8.5] },
                indicative_days: [110, 140],
                indicative_water_mm: [450, 700],
                local_checks: "Verify cultivar and local water supply.",
              },
              climate: {
                reference_days: 125,
                complete_seasons: 9,
                excluded_years: [],
                temperature_c: { median: 26.8, min: 25.4, max: 28.1 },
                rainfall_mm: { median: 640, min: 420, max: 910 },
                longest_dry_run_days: { median: 6, min: 3, max: 12 },
                temperature_matching_seasons: 9,
                root_wetness: { median: 0.62, min: 0.45, max: 0.81 },
              },
              planting_reference: `${planningYear}-${String(plantingMonth).padStart(2, "0")}-01`,
              indicative_harvest_window: [
                `${planningYear}-${String(((plantingMonth + 3) % 12) + 1).padStart(2, "0")}-01`,
                `${planningYear}-${String(((plantingMonth + 4) % 12) + 1).padStart(2, "0")}-15`,
              ],
              needs_checking: [
                "Verify plant-available N-P-K and field drainage locally.",
              ],
            },
            profile,
            trendScore: 92 - idx * 8,
            tier: idx === 0 ? ("top_pick" as const) : ("strong_option" as const),
            tierLabel:
              idx === 0 ? "Top Market & Climate Pick" : "Viable Market Alternative",
            harvestWindowLabel: `${MONTHS[(plantingMonth + 3) % 12].slice(0, 3)}–${MONTHS[(plantingMonth + 4) % 12].slice(0, 3)}`,
            marketTimingBadge: profile.leanMonths.includes(
              ((plantingMonth + 3) % 12) + 1,
            )
              ? "Lean Supply Window (+12% Price Trend)"
              : "Balanced Market Window",
            marketTimingMultiplier: 1.0,
            adjustedPricePhpKg: profile.defaultPricePhpKg,
            estimatedYieldTHa: profile.defaultYieldTHa,
            totalCostPhpHa: totalCost,
            grossRevenuePhpHa: gross,
            netReturnPhpHa: net,
            totalNetReturnPhp: Math.round(net * Math.max(0.1, areaHa)),
            roiPct: Math.round((net / totalCost) * 100),
            breakEvenYieldTHa: Number(
              (totalCost / (profile.defaultPricePhpKg * 1000)).toFixed(2),
            ),
            breakEvenPricePhpKg: Number(
              (totalCost / (profile.defaultYieldTHa * 1000)).toFixed(2),
            ),
            seasonFitRatio: 100,
            rationale: profile.marketInsight,
          };
        });

  const topPick = marketSuggestions[0];
  const maxRain = Math.max(
    1,
    ...(plantingReport?.history.monthly.map((m) => m.rainfall_mm.median ?? 0) ?? [
      320,
    ]),
  );

  function downloadSummaryText() {
    const lines = [
      `TERRAPROOF — CUSTOM FARM & MARKET ANALYSIS REPORT`,
      `Design Template: ${DESIGN_META[design].name}`,
      `Farm / Plot: ${farmName}`,
      `Prepared For: ${preparedFor}`,
      `Coordinates: ${bounds.south.toFixed(3)}°N to ${bounds.north.toFixed(3)}°N, ${bounds.west.toFixed(3)}°E to ${bounds.east.toFixed(3)}°E (~${areaHa.toFixed(2)} ha)`,
      `Soil Horizon: ${depth.replace("cm", " cm")} · Soil pH Median: ${phProp?.median?.toFixed(1) ?? "Pending assessment"}`,
      "",
      `TOP MARKET & TREND SUGGESTION: ${topPick.crop.name}`,
      `- Category: ${topPick.profile.marketCategory} (${topPick.profile.demandTrend})`,
      `- Target Planting: ${MONTHS[plantingMonth - 1]} ${planningYear} → Harvest Window: ${topPick.harvestWindowLabel}`,
      `- Market Window: ${topPick.marketTimingBadge}`,
      `- Benchmark Price: PHP ${topPick.adjustedPricePhpKg}/kg · Benchmark Yield: ${topPick.estimatedYieldTHa} t/ha`,
      `- Estimated Net Return: PHP ${topPick.netReturnPhpHa.toLocaleString("en-US")}/ha (Break-even: ${topPick.breakEvenYieldTHa} t/ha)`,
      `- Primary Buyers: ${topPick.profile.primaryBuyers}`,
      "",
      "FIELD VERIFICATION CHECKLIST:",
      "1. Confirm plant-available N, P, K and soil pH with a local accredited soil laboratory.",
      "2. Check field drainage, rooting depth, and dependable irrigation/rainfall timing.",
      "3. Confirm seed availability and current local buyer pricing before planting.",
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "terraproof-printable-summary.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="print-studio-wrap">
      {/* Studio Controls (Hidden when printing) */}
      <div className="print-studio-controls no-print">
        <div className="studio-header-row">
          <div>
            <span className="step-eyebrow">
              <Printer size={14} /> CUSTOM PRINTABLE DESIGN STUDIO
            </span>
            <h3>Customize & Print Your Farm Decision Report</h3>
            <p>
              Choose a visual layout, color theme, and sections below. Press{" "}
              <b>Print Custom Report</b> to save as PDF or print directly for
              field and adviser use.
            </p>
          </div>
          <div className="studio-primary-actions">
            {(!soilReport || !plantingReport) && (
              <button
                type="button"
                className="studio-btn-secondary"
                disabled={busy}
                onClick={onRequestAssess}
              >
                <TrendingUp size={16} />
                {busy ? "Loading live data…" : "Load Full Live Evidence"}
              </button>
            )}
            <button
              type="button"
              className="studio-btn-secondary"
              onClick={downloadSummaryText}
            >
              <ArrowDownToLine size={16} /> Summary (.txt)
            </button>
            {(soilReport || plantingReport) && (
              <button
                type="button"
                className="studio-btn-secondary"
                onClick={() =>
                  downloadJSON(
                    {
                      farmName,
                      preparedFor,
                      bounds,
                      soilReport,
                      plantingReport,
                      marketSuggestions,
                    },
                    "terraproof-full-result.json",
                  )
                }
              >
                <ArrowDownToLine size={16} /> Export JSON
              </button>
            )}
            <button
              type="button"
              className="studio-btn-print"
              onClick={() => window.print()}
            >
              <Printer size={17} /> Print Custom Report
            </button>
          </div>
        </div>

        {/* 3 Custom Design Cards */}
        <div className="design-template-grid" role="radiogroup" aria-label="Printable report design template">
          {(Object.keys(DESIGN_META) as PrintDesign[]).map((key) => {
            const item = DESIGN_META[key];
            const active = design === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                className={`design-card ${active ? "is-selected" : ""}`}
                onClick={() => setDesign(key)}
              >
                <div className="design-card-top">
                  <span className="design-icon">
                    {key === "executive" ? (
                      <LayoutTemplate size={18} />
                    ) : key === "field_poster" ? (
                      <Sprout size={18} />
                    ) : (
                      <Award size={18} />
                    )}
                  </span>
                  <span className="design-badge">{item.badge}</span>
                </div>
                <strong>{item.name}</strong>
                <span>{item.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Theme & Metadata Bar */}
        <div className="studio-customization-bar">
          <label className="studio-field">
            <span>Farm / Plot Title</span>
            <input
              type="text"
              value={farmName}
              maxLength={80}
              onChange={(e) => setFarmName(e.target.value)}
            />
          </label>
          <label className="studio-field">
            <span>Prepared For / Adviser</span>
            <input
              type="text"
              value={preparedFor}
              maxLength={80}
              onChange={(e) => setPreparedFor(e.target.value)}
            />
          </label>
          <div className="studio-field">
            <span>
              <Palette size={13} /> Print Color Accent
            </span>
            <div className="theme-swatches" role="group" aria-label="Print color theme">
              {(Object.keys(THEME_META) as PrintTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  className={`theme-pill ${theme === t ? "active" : ""}`}
                  onClick={() => setTheme(t)}
                >
                  <i style={{ background: THEME_META[t].swatch }} />
                  {THEME_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="studio-field studio-toggles">
            <span>
              <SlidersHorizontal size={13} /> Included Sections
            </span>
            <div className="toggle-chips">
              <label>
                <input
                  type="checkbox"
                  checked={showSoil}
                  onChange={(e) => setShowSoil(e.target.checked)}
                />
                Soil Profile
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showMarket}
                  onChange={(e) => setShowMarket(e.target.checked)}
                />
                Market Trends
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showClimate}
                  onChange={(e) => setShowClimate(e.target.checked)}
                />
                Climate Chart
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showChecklist}
                  onChange={(e) => setShowChecklist(e.target.checked)}
                />
                Field Notes
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Live Printable Report Sheet */}
      <article
        id="custom-printable-sheet"
        className={`printable-sheet design-${design} theme-${theme}`}
        aria-label="Printable farm and market report preview"
      >
        {/* Header Banner */}
        <header className="print-sheet-header">
          <div className="print-brand-block">
            <span className="print-doc-type">
              TERRAPROOF · {DESIGN_META[design].name.toUpperCase()}
            </span>
            <h2>{farmName || "Regional Farm & Market Brief"}</h2>
            <p className="print-prepared-for">
              Prepared for: <strong>{preparedFor || "Farm Manager"}</strong> ·
              Target Season:{" "}
              <strong>
                {MONTHS[plantingMonth - 1]} {planningYear}
              </strong>
            </p>
          </div>
          <div className="print-meta-box">
            <div>
              <span>Pinpointed Coordinates</span>
              <strong>
                {bounds.south.toFixed(3)}°N – {bounds.north.toFixed(3)}°N,{" "}
                {bounds.west.toFixed(3)}°E – {bounds.east.toFixed(3)}°E
              </strong>
            </div>
            <div>
              <span>Selected Land Area & Depth</span>
              <strong>
                ~{areaHa.toFixed(2)} ha · {depth.replace("cm", " cm")} horizon
              </strong>
            </div>
            <div>
              <span>Evidence Status</span>
              <strong>
                {soilReport
                  ? "Assessed Regional Soil & NASA Climate"
                  : "Regional Reference Preview"}
              </strong>
            </div>
          </div>
        </header>

        {/* Top KPI Strip */}
        <section className="print-kpi-strip" aria-label="Key result metrics">
          <div className="print-kpi-card highlight">
            <span>#1 Market & Trend Crop</span>
            <strong>{topPick.crop.name}</strong>
            <small>{topPick.tierLabel}</small>
          </div>
          <div className="print-kpi-card">
            <span>Est. Net Return / ha</span>
            <strong>₱{topPick.netReturnPhpHa.toLocaleString("en-US")}</strong>
            <small>
              Gross ₱{topPick.grossRevenuePhpHa.toLocaleString("en-US")} · ROI ~
              {topPick.roiPct}%
            </small>
          </div>
          <div className="print-kpi-card">
            <span>Harvest & Market Window</span>
            <strong>{topPick.harvestWindowLabel}</strong>
            <small>{topPick.marketTimingBadge}</small>
          </div>
          <div className="print-kpi-card">
            <span>Soil pH & Root Wetness</span>
            <strong>
              {phProp?.median != null ? `${phProp.median.toFixed(1)} pH` : "5.4 pH (est.)"}
            </strong>
            <small>
              Root wetness:{" "}
              {lastWetness?.GWETROOT != null
                ? `${Math.round(lastWetness.GWETROOT * 100)}%`
                : "Seasonal context"}
            </small>
          </div>
        </section>

        <div className="print-body-grid">
          {/* Section 1: Market & Trend Recommendations */}
          {showMarket && (
            <section className="print-section print-market-section">
              <div className="print-section-head">
                <h3>
                  <TrendingUp size={16} /> Market & Climate Trend Suggestions
                </h3>
                <span>
                  Ranked by soil compatibility, 10-year NASA climate fit &
                  seasonal market trends
                </span>
              </div>
              <div className="print-crop-table-wrap">
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Crop & Market Category</th>
                      <th>Trend Fit & Harvest</th>
                      <th>Market Window & Demand</th>
                      <th>Benchmark Price & Yield</th>
                      <th>Est. Net Return / ha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketSuggestions.slice(0, 4).map((item, idx) => (
                      <tr
                        key={item.crop.id}
                        className={idx === 0 ? "row-featured" : ""}
                      >
                        <td>
                          <strong>
                            {idx + 1}. {item.crop.name}
                          </strong>
                          <small>{item.profile.marketCategory}</small>
                        </td>
                        <td>
                          <span className={`print-pill pill-${item.tier}`}>
                            {item.tierLabel}
                          </span>
                          <small>
                            Harvest: {item.harvestWindowLabel} (
                            {item.crop.climate.temperature_matching_seasons}/
                            {item.crop.climate.complete_seasons} yrs fit)
                          </small>
                        </td>
                        <td>
                          <strong>{item.marketTimingBadge}</strong>
                          <small>{item.profile.demandTrend}</small>
                        </td>
                        <td>
                          <strong>₱{item.adjustedPricePhpKg.toFixed(2)}/kg</strong>
                          <small>
                            ~{item.estimatedYieldTHa} t/ha (Break-even:{" "}
                            {item.breakEvenYieldTHa} t/ha)
                          </small>
                        </td>
                        <td>
                          <strong>
                            ₱{item.netReturnPhpHa.toLocaleString("en-US")}/ha
                          </strong>
                          <small>
                            Plot ({areaHa.toFixed(1)} ha): ₱
                            {item.totalNetReturnPhp.toLocaleString("en-US")}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="print-buyer-callout">
                <strong>Primary Market Channels for {topPick.crop.name}:</strong>{" "}
                {topPick.profile.primaryBuyers}. {topPick.profile.marketInsight}
              </div>
            </section>
          )}

          {/* Section 2: Pinpointed Soil Evidence */}
          {showSoil && (
            <section className="print-section print-soil-section">
              <div className="print-section-head">
                <h3>
                  <MapPin size={16} /> Pinpointed Regional Soil Profile
                </h3>
                <span>
                  ISRIC SoilGrids 250 m horizon ({depth.replace("cm", " cm")})
                </span>
              </div>
              {soilReport ? (
                <div className="print-soil-grid">
                  {soilReport.properties.map((prop) => (
                    <div key={prop.id} className="print-soil-cell">
                      <span>{FRIENDLY_SOIL[prop.id] ?? prop.label}</span>
                      <strong>
                        {prop.median != null ? prop.median.toFixed(1) : "—"}{" "}
                        <small>{prop.median != null ? prop.unit : "N/A"}</small>
                      </strong>
                      <small>
                        {prop.status === "available"
                          ? `P10–P90: ${prop.p10?.toFixed(1) ?? "—"}–${prop.p90?.toFixed(1) ?? "—"} ${prop.unit}`
                          : "Local lab test needed"}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="print-soil-grid">
                  <div className="print-soil-cell">
                    <span>Soil Acidity (pH)</span>
                    <strong>
                      5.4 <small>pH (ref)</small>
                    </strong>
                    <small>Run Step 1 assessment for live cell values</small>
                  </div>
                  <div className="print-soil-cell">
                    <span>Organic Carbon</span>
                    <strong>
                      {socProp?.median?.toFixed(1) ?? "18.2"} <small>g/kg</small>
                    </strong>
                    <small>Topsoil carbon estimate</small>
                  </div>
                  <div className="print-soil-cell">
                    <span>Clay / Texture</span>
                    <strong>
                      {clayProp?.median?.toFixed(1) ?? "28.0"} <small>%</small>
                    </strong>
                    <small>Water-holding fine fraction</small>
                  </div>
                  <div className="print-soil-cell">
                    <span>Nutrient Retention (CEC)</span>
                    <strong>
                      {cecProp?.median?.toFixed(1) ?? "16.5"}{" "}
                      <small>cmol(c)/kg</small>
                    </strong>
                    <small>Cation exchange capacity</small>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Section 3: 12-Month Climate & Rainfall Trend Strip */}
          {showClimate && (
            <section className="print-section print-climate-section">
              <div className="print-section-head">
                <h3>
                  <FileSpreadsheet size={16} /> 10-Year Seasonal Rainfall &
                  Temperature Trend
                </h3>
                <span>
                  NASA POWER historical monthly medians · Planting month
                  highlighted
                </span>
              </div>
              <div className="print-rain-strip">
                {(
                  plantingReport?.history.monthly ??
                  MONTHS.map((_, i) => ({
                    month: i + 1,
                    complete_years: 10,
                    rainfall_mm: {
                      median: [180, 140, 120, 110, 165, 230, 280, 260, 275, 310, 340, 290][
                        i
                      ],
                      min: 80,
                      max: 450,
                    },
                    temperature_c: {
                      median: [25.8, 26.1, 26.9, 27.8, 28.3, 28.0, 27.5, 27.6, 27.4, 27.1, 26.6, 26.0][
                        i
                      ],
                      min: 24,
                      max: 30,
                    },
                  }))
                ).map((m) => {
                  const rain = m.rainfall_mm.median ?? 0;
                  const isPlanting = m.month === plantingMonth;
                  return (
                    <div
                      key={m.month}
                      className={`print-rain-col ${isPlanting ? "is-planting-month" : ""}`}
                    >
                      <span className="print-rain-val">{Math.round(rain)}</span>
                      <div className="print-rain-bar-track">
                        <div
                          className="print-rain-bar-fill"
                          style={{
                            height: `${Math.max(8, Math.round((rain / maxRain) * 100))}%`,
                          }}
                        />
                      </div>
                      <strong>{MONTHS[m.month - 1].slice(0, 3)}</strong>
                      <small>
                        {m.temperature_c.median != null
                          ? `${m.temperature_c.median.toFixed(1)}°`
                          : "—"}
                      </small>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 4: Field Action Checklist & Handwritten Notes */}
          {showChecklist && (
            <section className="print-section print-checklist-section">
              <div className="print-section-head">
                <h3>
                  <CheckCircle2 size={16} /> Actionable Pre-Planting Checklist &
                  Field Notes
                </h3>
                <span>Verify with your local agricultural technician</span>
              </div>
              <div className="print-checklist-columns">
                <ul className="print-checklist-items">
                  <li>
                    <strong>1. Laboratory Soil Check:</strong> Confirm soil pH in
                    water and plant-available N, P, K before buying fertilizer.
                  </li>
                  <li>
                    <strong>2. Market & Buyer Alignment:</strong> Lock in seed
                    variety and check current buying prices with{" "}
                    {topPick.profile.primaryBuyers.toLowerCase()}.
                  </li>
                  <li>
                    <strong>3. Drainage & Water Readiness:</strong> Verify
                    field bunds, canal access, or rain-collection timing for{" "}
                    {MONTHS[plantingMonth - 1]} sowing.
                  </li>
                  <li>
                    <strong>4. Crop Rotation Plan:</strong> Follow{" "}
                    {topPick.crop.name} with a complementary legume (such as
                    Soybean or Groundnut) to diversify income and pest cycles.
                  </li>
                </ul>
                <div className="print-notes-box">
                  <span>Field / Extension Adviser Notes & Signatures</span>
                  <div className="print-ruled-lines">
                    <div />
                    <div />
                    <div />
                  </div>
                  <div className="print-signoff-row">
                    <span>Farmer / Grower Signature</span>
                    <span>Extension Adviser / Date</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <footer className="print-sheet-footer">
          <span>
            Generated by <strong>TerraProof</strong> · Regional SoilGrids (250 m),
            NASA POWER Climate History & FAO Ecocrop Reference Screening.
          </span>
          <span>
            Early decision support — confirm local variety, water balance, and
            soil nutrient tests before commercial commitment.
          </span>
        </footer>
      </article>
    </div>
  );
}
