import { lazy, Suspense, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Globe2,
  Leaf,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Printer,
  Scan,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { api, downloadJSON } from "./api";
import type { Bounds, SoilReport, SoilRequest } from "./soil-types";
import type { PlantingReport } from "./planting-types";
import "./soil.css";
import PlaceSearch from "./PlaceSearch";
import PlantingGuide from "./PlantingGuide";
import RotationGuide from "./RotationGuide";
import EvidenceGaps from "./EvidenceGaps";
import FarmNotebook from "./FarmNotebook";
import PrintableReport from "./PrintableReport";

const SoilGlobe = lazy(() => import("./SoilGlobe"));
const ALBAY: Bounds = { west: 123.7, south: 13.1, east: 123.8, north: 13.2 };
const explanations: Record<string, string> = {
  phh2o:
    "pH tells you how acidic or alkaline soil is. A value of 7 is neutral; lower numbers are more acidic. Different crops prefer different ranges. This map estimate cannot tell you how much lime to apply.",
  soc: "Carbon is part of the material left by roots, plants and soil life. It helps explain soil functions. g/kg means grams in one kilogram of dry soil. This is carbon concentration, not the percentage of organic matter.",
  clay: "Clay is the finest soil-particle group. A higher share can help soil hold water and nutrients, but drainage also depends on soil structure. 30% means about 30 parts clay in 100 parts of the fine soil material.",
  sand: "Sand is the coarsest particle group measured here. Sandy soils often drain quickly. This percentage describes texture; it does not by itself tell you whether a crop will succeed.",
  silt: "Silt particles are between sand and clay in size. Along with sand and clay, they help describe soil texture and water storage. Soil structure and drainage still need checking in the field.",
  cec: "Cation exchange capacity describes how well soil can hold some positively charged nutrients. The reference test is buffered at pH 7. It does not measure the nitrogen, phosphorus or potassium ready for plants to use.",
  bdod: "Bulk density describes how much dry soil is packed into a volume, excluding coarse fragments. kg/dm³ means kilograms per litre. Whether a value signals harmful compaction depends on texture and other local conditions.",
  nitrogen:
    "Nitrogen supports plant growth, but this estimate includes forms that roots cannot immediately use. g/kg means grams per kilogram of dry soil. A nutrient test is needed before deciding on fertiliser.",
};
const friendlyNames: Record<string, string> = {
  phh2o: "Soil acidity (pH)",
  soc: "Organic carbon",
  clay: "Clay particles",
  sand: "Sand particles",
  silt: "Silt particles",
  cec: "Ability to hold nutrients (CEC)",
  bdod: "How tightly soil is packed",
  nitrogen: "Total nitrogen",
};
const fmt = (value: number | null | undefined) =>
  value == null ? "—" : value.toFixed(1);

export default function SoilExplorer() {
  const [bounds, setBounds] = useState<Bounds>(ALBAY);
  const [depth, setDepth] = useState("0-5cm");
  const [end, setEnd] = useState(() =>
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const [selecting, setSelecting] = useState(false);
  const [focus, setFocus] = useState(0);
  const [mapStyle, setMapStyle] = useState<"satellite" | "roads">("satellite");
  const [zoom, setZoom] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<SoilReport>();
  const [plantingReport, setPlantingReport] = useState<PlantingReport>();
  const [plantingMonth, setPlantingMonth] = useState(
    new Date().getUTCMonth() + 1,
  );
  const [planningYear, setPlanningYear] = useState(
    new Date().getUTCFullYear() + 1,
  );
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const request: SoilRequest = { ...bounds, depth, end_date: end };
  const dirty =
    !!report &&
    (Object.keys(request) as (keyof SoilRequest)[]).some(
      (key) => request[key] !== report.region[key],
    );
  const invalid =
    Object.values(bounds).some((v) => !Number.isFinite(v)) ||
    bounds.west >= bounds.east ||
    bounds.south >= bounds.north ||
    bounds.east - bounds.west > 30 ||
    bounds.north - bounds.south > 30 ||
    bounds.west < -180 ||
    bounds.east > 180 ||
    bounds.south < -85 ||
    bounds.north > 85;

  const areaHa = Math.max(
    0.01,
    ((bounds.east - bounds.west) *
      (bounds.north - bounds.south) *
      111320 ** 2 *
      Math.cos((((bounds.north + bounds.south) / 2) * Math.PI) / 180)) /
      10000,
  );

  function goToStep(step: 1 | 2 | 3, targetId: string) {
    setActiveStep(step);
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function assess() {
    setBusy(true);
    setError("");
    setSelecting(false);
    try {
      setReport(await api<SoilReport>("/soil/assess", request));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const daily = report?.wetness.daily;
  const last = daily?.at(-1);
  const available =
    report?.properties.filter((p) => p.status === "available").length ?? 0;

  return (
    <div className="soil-app">
      <a className="skip-link" href="#soil-region">
        Skip to region controls
      </a>
      <header className="soil-header no-print">
        <a href="/" className="soil-brand">
          <img src="/icon.svg" alt="" width={28} height={28} /> TerraProof
          <span>.</span>
        </a>
        <nav aria-label="Workspace" className="webapp-step-nav">
          <a
            href="#step-pinpoint"
            aria-current={activeStep === 1 ? "page" : undefined}
            onClick={() => setActiveStep(1)}
          >
            <MapPin size={16} /> 1. Pinpoint Location
          </a>
          <a
            href="#planting-guide"
            aria-current={activeStep === 2 ? "page" : undefined}
            onClick={() => setActiveStep(2)}
          >
            <TrendingUp size={16} /> 2. Market & Trends
          </a>
          <a
            href="#step-results"
            aria-current={activeStep === 3 ? "page" : undefined}
            onClick={() => setActiveStep(3)}
          >
            <Printer size={16} /> 3. Results & Print
          </a>
        </nav>
        <div className="header-right-actions">
          <a className="soil-method-link" href="#soil-methods">
            Sources & methods
          </a>
          <button
            type="button"
            className="header-print-cta"
            onClick={() => goToStep(3, "step-results")}
          >
            <Printer size={15} /> Custom Print
          </button>
        </div>
      </header>

      <main className="soil-workspace">
        {/* HERO SECTION: Slogan Top-Left, Real-Life Farmer Right, Workflow Bottom */}
        <section
          className="webapp-hero no-print"
          aria-label="TerraProof overview and guided workflow"
        >
          <div className="hero-top-grid">
            <div className="hero-left-copy">
              <span className="hero-eyebrow">
                <Sparkles size={14} /> SMART AGRONOMY & MARKET INTELLIGENCE
              </span>
              <p className="hero-slogan">
                Plant with Proof. Harvest with Confidence.
              </p>
              <h1>Understand the soil beneath a region.</h1>
              <p className="hero-lead">
                A guided web-app built for farmers and advisers — pinpoint your
                location, uncover crop & market suggestions backed by 10-year
                trends, and print custom-designed field reports without
                information overload.
              </p>
              <div className="hero-cta-row">
                <button
                  type="button"
                  className="hero-btn-primary"
                  onClick={() => goToStep(1, "step-pinpoint")}
                >
                  <LocateFixed size={17} /> Pinpoint a Location
                </button>
                <button
                  type="button"
                  className="hero-btn-secondary"
                  onClick={() => goToStep(2, "step-market")}
                >
                  <TrendingUp size={17} /> Market Trend Suggestions
                </button>
                <button
                  type="button"
                  className="hero-btn-ghost"
                  onClick={() => goToStep(3, "step-results")}
                >
                  <Printer size={16} /> Printable Report Studio
                </button>
              </div>
              <div className="hero-trust-strip">
                <span>
                  <Check size={14} /> 250 m SoilGrids Horizon
                </span>
                <span>
                  <Check size={14} /> 10-Yr NASA Climate Trends
                </span>
                <span>
                  <Check size={14} /> Market Return Benchmarks
                </span>
                <span>
                  <Check size={14} /> 3 Printable Designs
                </span>
              </div>
            </div>

            <div className="hero-right-visual">
              <div className="hero-photo-frame">
                <img
                  src="/farmer-hero.jpg"
                  alt="Filipino farmer smiling while inspecting healthy green rice crops in sunlit terraced paddy fields"
                  className="hero-farmer-img"
                />
                <div className="hero-photo-badge">
                  <Leaf size={16} />
                  <div>
                    <strong>Grounded in Real Field Conditions</strong>
                    <span>
                      Connecting satellite soil & weather trends to practical
                      farm & market decisions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM OF HERO: How It Works & Guided 3-Step Workflow */}
          <div
            className="hero-workflow-bar farmer-start"
            aria-label="How to use TerraProof"
          >
            <div className="workflow-bar-head">
              <div>
                <span className="workflow-kicker">HOW IT WORKS · THE WORKFLOW</span>
                <h2>New here? Follow these three steps</h2>
              </div>
              <a href="#rotation-guide" className="workflow-jump-link">
                Go to crop rotation comparison <ArrowUpRight size={14} />
              </a>
            </div>
            <ol className="workflow-steps-grid">
              <li
                className={`workflow-step-card ${activeStep === 1 ? "is-active" : ""}`}
                onClick={() => goToStep(1, "step-pinpoint")}
              >
                <div className="workflow-step-num">
                  <span>STEP 01</span>
                  <MapPin size={18} />
                </div>
                <strong>Pinpoint a Location</strong>
                <p>
                  Search a village or town, zoom in, and draw a box around your
                  land on the 3D satellite globe to assess mapped soil pH,
                  carbon, and recent wetness.
                </p>
                <span className="workflow-step-status">
                  {report ? "✓ Region Assessed" : "Start Here →"}
                </span>
              </li>
              <li
                className={`workflow-step-card ${activeStep === 2 ? "is-active" : ""}`}
                onClick={() => goToStep(2, "step-market")}
              >
                <div className="workflow-step-num">
                  <span>STEP 02</span>
                  <TrendingUp size={18} />
                </div>
                <strong>Market Analysis Based on Trends</strong>
                <p>
                  Get crop suggestions ranked by 10-year NASA seasonal climate
                  trends, harvest-month market price windows, and estimated net
                  returns per hectare.
                </p>
                <span className="workflow-step-status">
                  {plantingReport
                    ? "✓ Market Trends Ready"
                    : "Explore Trends →"}
                </span>
              </li>
              <li
                className={`workflow-step-card ${activeStep === 3 ? "is-active" : ""}`}
                onClick={() => goToStep(3, "step-results")}
              >
                <div className="workflow-step-num">
                  <span>STEP 03</span>
                  <Printer size={18} />
                </div>
                <strong>Results & Custom Printable Designs</strong>
                <p>
                  Review your synthesized location, soil, and market decision
                  brief, then print or save it using custom templates for field
                  or adviser review.
                </p>
                <span className="workflow-step-status">
                  Open Print Studio →
                </span>
              </li>
            </ol>
          </div>
        </section>

        {/* STEP 1: PINPOINT A LOCATION */}
        <section
          id="step-pinpoint"
          className="webapp-stage-card no-print"
          aria-label="Step 1: Pinpoint a location"
        >
          <div className="stage-card-header">
            <div>
              <span className="stage-badge">STEP 01 OF 03 · LOCATION & SOIL</span>
              <h2>Pinpoint Your Land & Inspect Regional Soil</h2>
              <p>
                Locate your field using search or the interactive globe, then
                run a quick regional soil assessment.
              </p>
            </div>
            <span className="soil-scope">
              Global land coverage · 250 m SoilGrids + NASA wetness
            </span>
          </div>

          <div className="location-utility-bar">
            <PlaceSearch
              onLocate={(next) => {
                setBounds(next);
                setMapStyle("satellite");
                setFocus((f) => Math.abs(f) + 1);
                setSelecting(false);
              }}
            />
            <FarmNotebook
              bounds={bounds}
              depth={depth}
              onOpen={(plot) => {
                setBounds(plot.bounds);
                setDepth(plot.depth);
                setFocus((f) => Math.abs(f) + 1);
                setSelecting(false);
              }}
            />
          </div>

          <div className="soil-layout">
            <section className="soil-map" aria-label="Global region selection">
              <div className="soil-map-toolbar">
                <span>
                  <Globe2 size={16} /> Earth / regional selection
                </span>
                <button
                  type="button"
                  aria-label="Globe view"
                  title="Return to globe view"
                  onClick={() => {
                    setFocus((f) => -Math.abs(f) - 1);
                    setSelecting(false);
                  }}
                >
                  <Globe2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBounds(ALBAY);
                    setFocus((f) => Math.abs(f) + 1);
                    setSelecting(false);
                  }}
                >
                  Albay example <LocateFixed size={15} />
                </button>
              </div>
              <Suspense
                fallback={
                  <div className="globe-loading" role="status">
                    Preparing the interactive globe…
                  </div>
                }
              >
                <SoilGlobe
                  bounds={bounds}
                  selecting={selecting}
                  focus={focus}
                  mapStyle={mapStyle}
                  zoom={zoom}
                  onSelect={setBounds}
                  onFinish={() => setSelecting(false)}
                />
              </Suspense>
              <div className="soil-map-actions">
                <button
                  type="button"
                  className={selecting ? "draw-active" : ""}
                  aria-pressed={selecting}
                  onClick={() => setSelecting(!selecting)}
                >
                  {selecting ? <X size={17} /> : <Scan size={17} />}{" "}
                  {selecting ? "Cancel selection" : "Draw a region"}
                </button>
                <button
                  type="button"
                  onClick={() => setFocus((f) => Math.abs(f) + 1)}
                  disabled={invalid}
                >
                  <LocateFixed size={17} /> View selection
                </button>
              </div>
              <div className="map-navigation">
                <div className="map-style" role="group" aria-label="Map view">
                  <button
                    type="button"
                    aria-pressed={mapStyle === "satellite"}
                    onClick={() => setMapStyle("satellite")}
                  >
                    Satellite
                  </button>
                  <button
                    type="button"
                    aria-pressed={mapStyle === "roads"}
                    onClick={() => setMapStyle("roads")}
                  >
                    Places & roads
                  </button>
                </div>
                <div className="map-zoom" role="group" aria-label="Map zoom">
                  <button
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => setZoom((z) => z + 1)}
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => setZoom((z) => z - 1)}
                  >
                    <Minus size={18} />
                  </button>
                </div>
              </div>
              <p className="soil-map-hint" role="status">
                {selecting
                  ? "Click the first corner, then the opposite corner. Scroll to zoom."
                  : "Drag to rotate · scroll to zoom · select two corners to draw"}
              </p>
              <div className="soil-map-credit">
                NASA GIBS overview · Esri imagery and place labels when zoomed
                in · imagery dates vary
              </div>
            </section>

            <aside className="soil-rail" id="soil-region">
              <section className="region-panel">
                <div className="soil-section-title">
                  <h2>Your region</h2>
                  <span>{depth.replace("cm", " cm")}</span>
                </div>
                <p className="region-position">
                  {bounds.south.toFixed(3)}° to {bounds.north.toFixed(3)}°
                  latitude
                  <br />
                  {bounds.west.toFixed(3)}° to {bounds.east.toFixed(3)}°
                  longitude
                </p>
                <p className="region-size">
                  About{" "}
                  {new Intl.NumberFormat("en", {
                    maximumFractionDigits: 2,
                  }).format(areaHa)}{" "}
                  hectares selected. One hectare is 10,000 m².
                </p>
                <details className="coordinate-editor">
                  <summary>Edit coordinates</summary>
                  <div className="coordinate-grid">
                    {(["west", "south", "east", "north"] as const).map(
                      (key) => (
                        <label key={key}>
                          {key[0].toUpperCase() + key.slice(1)}
                          <input
                            aria-label={`${key[0].toUpperCase() + key.slice(1)} longitude or latitude`}
                            type="number"
                            step="0.001"
                            value={bounds[key]}
                            onChange={(e) =>
                              setBounds({
                                ...bounds,
                                [key]: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                </details>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void assess();
                  }}
                >
                  <div className="soil-options">
                    <label>
                      Soil depth
                      <select
                        value={depth}
                        onChange={(e) => setDepth(e.target.value)}
                      >
                        <option value="0-5cm">0–5 cm</option>
                        <option value="5-15cm">5–15 cm</option>
                        <option value="15-30cm">15–30 cm</option>
                      </select>
                    </label>
                    <label>
                      Wetness through
                      <input
                        aria-label="Wetness through"
                        type="date"
                        value={end}
                        max={new Date(Date.now() - 3 * 86400000)
                          .toISOString()
                          .slice(0, 10)}
                        min="1981-01-14"
                        required
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    </label>
                  </div>
                  {invalid && (
                    <p className="soil-validation" role="alert">
                      Select ordered coordinates within 30° per side and 85°
                      latitude. Split regions crossing the date line.
                    </p>
                  )}
                  <button
                    className="soil-assess"
                    type="submit"
                    disabled={busy || invalid}
                  >
                    {busy
                      ? "Retrieving regional evidence…"
                      : "Assess selected region"}
                    {!busy && <ArrowUpRight size={17} />}
                  </button>
                </form>
                <details className="compact-disclosure">
                  <summary>Scale & resolution notes (250 m grid)</summary>
                  <p className="soil-transfer-note">
                    Small regional extracts. Soil maps are long-term predictions
                    at ~250 m resolution; zooming closer helps you locate land,
                    not measure soil more precisely.
                  </p>
                </details>
                {error && (
                  <div className="soil-error" role="alert">
                    <p>{error}</p>
                    <button onClick={() => void assess()}>
                      Retry assessment
                    </button>
                  </div>
                )}
              </section>

              <section
                className="soil-report"
                aria-live="polite"
                aria-busy={busy}
              >
                <div className="soil-section-title">
                  <h2>Soil evidence</h2>
                  {report && (
                    <button
                      type="button"
                      title="Download soil report JSON"
                      aria-label="Download soil report JSON"
                      onClick={() =>
                        downloadJSON(report, "terraproof-soil-report.json")
                      }
                    >
                      <ArrowDownToLine size={17} />
                    </button>
                  )}
                </div>
                {dirty && (
                  <p className="soil-stale">
                    Selection changed. Run assessment to update this report.
                  </p>
                )}
                {!report ? (
                  <div className="soil-empty">
                    <p>Ready to inspect your pinpointed land.</p>
                    <span>
                      Click <b>Assess selected region</b> above to load mapped
                      soil pH, organic carbon, texture, and recent NASA wetness,
                      then unlock Step 2 market trend suggestions.
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="soil-report-caption">
                      <Check size={14} /> {available} of{" "}
                      {report.properties.length} mapped properties available ·{" "}
                      {report.region.depth.replace("cm", " cm")}
                    </p>
                    <p className="soil-report-caption">
                      Assessed bounds: {report.region.west.toFixed(3)},{" "}
                      {report.region.south.toFixed(3)} →{" "}
                      {report.region.east.toFixed(3)},{" "}
                      {report.region.north.toFixed(3)}
                    </p>
                    <div className="soil-property-list">
                      {report.properties.map((prop) => (
                        <details key={prop.id} className="soil-property">
                          <summary>
                            <span>{friendlyNames[prop.id] ?? prop.label}</span>
                            <strong>
                              {fmt(prop.median)}{" "}
                              <small>
                                {prop.median != null
                                  ? prop.unit
                                  : "unavailable"}
                              </small>
                            </strong>
                          </summary>
                          <p>{explanations[prop.id]}</p>
                          {prop.status === "available" ? (
                            <>
                              <p>
                                Most sampled map values (10th–90th percentiles):{" "}
                                <b>
                                  {fmt(prop.p10)}–{fmt(prop.p90)} {prop.unit}
                                </b>
                                .
                              </p>
                              <p>
                                {prop.valid_samples} / {prop.total_samples}{" "}
                                valid samples;{" "}
                                {Math.round(
                                  (prop.sampled_coverage_fraction ?? 0) * 100,
                                )}
                                % sampled coverage. Native map grid: 250 m.
                              </p>
                              <p>
                                Source: ISRIC SoilGrids 2.0 · Retrieved{" "}
                                {prop.provenance?.retrieved_at.slice(0, 10)}.
                              </p>
                            </>
                          ) : (
                            <>
                              <p>
                                No usable map estimate returned for this
                                property. It does not mean zero or poor soil.
                              </p>
                              <details>
                                <summary>Source details</summary>
                                <p>{prop.reason}</p>
                              </details>
                            </>
                          )}
                        </details>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </aside>
          </div>

          {report && (
            <div className="step-secondary-drawers">
              <section className="soil-moisture">
                <div className="soil-section-title">
                  <h2>Recent soil wetness</h2>
                  <span>NASA POWER · centroid context</span>
                </div>
                {report.wetness.status === "available" ? (
                  <>
                    <p className="wetness-reading">
                      Relative wetness (0 = dry, 1 = saturated) from{" "}
                      {report.wetness.start} to {report.wetness.end}. Dark bars
                      show surface moisture; light bars show root zone.
                    </p>
                    <div className="wetness-layout">
                      <div className="wetness-series">
                        {daily?.map((row) => (
                          <div
                            key={row.date}
                            className="wetness-day"
                            title={`${row.date}: surface ${row.GWETTOP ?? "missing"}, root zone ${row.GWETROOT ?? "missing"}`}
                          >
                            <div className="wetness-bars">
                              <span
                                className={
                                  row.GWETTOP == null
                                    ? "wetness-missing"
                                    : undefined
                                }
                                style={{
                                  height: `${(row.GWETTOP ?? 0) * 100}%`,
                                }}
                              />
                              <span
                                className={
                                  row.GWETROOT == null
                                    ? "wetness-missing"
                                    : undefined
                                }
                                style={{
                                  height: `${(row.GWETROOT ?? 0) * 100}%`,
                                }}
                              />
                            </div>
                            <span>{row.date.slice(8)}</span>
                          </div>
                        ))}
                      </div>
                      <dl className="wetness-last">
                        <div>
                          <dt>Surface / last day</dt>
                          <dd>{last?.GWETTOP?.toFixed(2) ?? "—"}</dd>
                        </div>
                        <div>
                          <dt>Root zone / last day</dt>
                          <dd>{last?.GWETROOT?.toFixed(2) ?? "—"}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="wetness-key">
                      <span>Surface</span>
                      <span>Root zone</span>
                      <span className="missing-key">Missing</span>
                    </div>
                  </>
                ) : (
                  <p className="soil-error">
                    NASA wetness context is unavailable: {report.wetness.reason}
                    . Soil-map results above remain independent.
                  </p>
                )}
              </section>

              {report.laboratory_references && (
                <details className="compact-lab-drawer">
                  <summary>
                    Nearby historical laboratory observations (WoSIS)
                  </summary>
                  <section className="soil-labs">
                    <div className="soil-section-title">
                      <h2>What has actually been sampled nearby?</h2>
                      <a
                        href="https://doi.org/10.5194/essd-16-4735-2024"
                        target="_blank"
                        rel="noreferrer"
                      >
                        WoSIS methods <ArrowUpRight size={14} />
                      </a>
                    </div>
                    {report.laboratory_references.map((method) => (
                      <details key={method.id} className="soil-lab-method">
                        <summary>
                          <span>{method.label}</span>
                          <strong>
                            {method.status === "unavailable"
                              ? "Source unavailable"
                              : `${method.observations.length} compatible records`}
                          </strong>
                        </summary>
                        {method.status === "unavailable" ? (
                          <p>{method.reason}</p>
                        ) : method.observations.length === 0 ? (
                          <p>
                            No compatible CC-BY observations were returned for
                            this region and depth.
                          </p>
                        ) : (
                          <div
                            className="soil-lab-table"
                            tabIndex={0}
                            role="region"
                            aria-label={`${method.label} observations`}
                          >
                            <table>
                              <thead>
                                <tr>
                                  <th>Source / profile</th>
                                  <th>Sample date</th>
                                  <th>Depth (cm)</th>
                                  <th>Value ({method.unit})</th>
                                </tr>
                              </thead>
                              <tbody>
                                {method.observations.map((row) => (
                                  <tr key={`${row.profile_id}-${row.layer_id}`}>
                                    <td>
                                      {row.source_dataset} / {row.profile_id}
                                    </td>
                                    <td>{row.sample_date ?? "Unknown"}</td>
                                    <td>
                                      {row.upper_depth_cm}–{row.lower_depth_cm}
                                    </td>
                                    <td>{row.value.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </details>
                    ))}
                  </section>
                </details>
              )}
            </div>
          )}

          <div className="stage-footer-bar">
            <span>
              {report
                ? "✓ Step 1 Complete: Regional soil profile loaded."
                : "Tip: Click “Assess selected region” to load soil data for Step 2."}
            </span>
            <button
              type="button"
              className="stage-next-btn"
              onClick={() => goToStep(2, "step-market")}
            >
              Next: Market Analysis & Trends <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* STEP 2: MARKET ANALYSIS SUGGESTIONS BASED ON TRENDS */}
        <section
          id="step-market"
          className="webapp-stage-card no-print"
          aria-label="Step 2: Market analysis suggestions based on trends"
        >
          <div className="stage-card-header">
            <div>
              <span className="stage-badge">
                STEP 02 OF 03 · MARKET & TREND ANALYSIS
              </span>
              <h2>Market Analysis Suggestions Based on Trends</h2>
              <p>
                Discover which crops fit your pinpointed soil and 10-year
                seasonal weather trends, paired with harvest-window price trends
                and two-season rotation plans.
              </p>
            </div>
            {!report && (
              <button
                type="button"
                className="stage-quick-action"
                disabled={busy || invalid}
                onClick={() => void assess()}
              >
                <Compass size={16} />{" "}
                {busy ? "Assessing…" : "Assess Region to Unlock"}
              </button>
            )}
          </div>

          <div id="planting-guide-start">
            {report ? (
              <PlantingGuide
                key={JSON.stringify(report.region)}
                region={report.region}
                stale={dirty}
                areaHa={areaHa}
                onReportChange={(nextReport, month, year) => {
                  setPlantingReport(nextReport);
                  setPlantingMonth(month);
                  setPlanningYear(year);
                }}
              />
            ) : (
              <section id="planting-guide" className="planting-guide">
                <h2>What could I plant here?</h2>
                <p>
                  Assess your region in Step 1 first (or click{" "}
                  <b>Assess Region to Unlock</b> above) to generate crop and
                  market trend suggestions for your selected land.
                </p>
              </section>
            )}
          </div>

          {report ? (
            <RotationGuide
              key={`rotation-${JSON.stringify(report.region)}`}
              region={report.region}
              stale={dirty}
            />
          ) : (
            <section id="rotation-guide" className="planting-guide">
              <h2>Compare crops over two seasons</h2>
              <p>
                First select your land and choose “Assess selected region”
                above. Then you can compare your usual crop sequence with two
                alternatives.
              </p>
            </section>
          )}

          {report && <EvidenceGaps report={report} />}

          <div className="stage-footer-bar">
            <span>
              {plantingReport
                ? "✓ Step 2 Complete: Market & seasonal trend suggestions ready."
                : "Run “Explore crops and past seasons” above or proceed directly to the Print Studio."}
            </span>
            <button
              type="button"
              className="stage-next-btn"
              onClick={() => goToStep(3, "step-results")}
            >
              Next: View Final Result & Printable Designs{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* STEP 3: ACTIONABLE RESULTS & CUSTOM PRINTABLE REPORT */}
        <section
          id="step-results"
          className="webapp-stage-card print-stage-card"
          aria-label="Step 3: Actionable results and custom printable report"
        >
          <div className="stage-card-header no-print">
            <div>
              <span className="stage-badge">
                STEP 03 OF 03 · RESULTS & PRINT STUDIO
              </span>
              <h2>Actionable Results & Custom Printable Report</h2>
              <p>
                Review your unified location, soil, and market trend summary.
                Switch between custom printable designs and print or save as a
                PDF.
              </p>
            </div>
          </div>

          <PrintableReport
            bounds={bounds}
            depth={depth}
            areaHa={areaHa}
            soilReport={report}
            plantingReport={plantingReport}
            plantingMonth={plantingMonth}
            planningYear={planningYear}
            onRequestAssess={() => void assess()}
            busy={busy}
          />
        </section>

        {/* COMPACT SOURCES & METHODS FOOTER */}
        <section className="soil-methods no-print" id="soil-methods">
          <div>
            <h2>Evidence has a scale.</h2>
            <p>
              This web-app pairs regional soil and climate evidence with
              transparent market benchmarks so farmers and advisers can make
              informed local decisions.
            </p>
          </div>
          <div>
            <h3>Mapped properties & weather</h3>
            <p>
              ISRIC SoilGrids (250 m) supplies regional soil estimates; NASA
              POWER supplies 10-year seasonal meteorology and surface wetness.
            </p>
            <a
              href="https://doi.org/10.5194/soil-7-217-2021"
              target="_blank"
              rel="noreferrer"
            >
              SoilGrids study <ArrowUpRight size={14} />
            </a>
          </div>
          <div>
            <h3>Turn unknowns into next steps</h3>
            <p>
              Confirm plant-available N-P-K, drainage, and local buyer prices
              with your municipal agricultural office or soil lab.
            </p>
            <a
              href="https://www.nrcs.usda.gov/conservation-basics/soil/soil-health/soil-health-assessment"
              target="_blank"
              rel="noreferrer"
            >
              Soil health indicators <ArrowUpRight size={14} />
            </a>
          </div>
        </section>
      </main>
      <footer className="soil-footer no-print">
        <span>TerraProof · Regional evidence, with its limits intact.</span>
        <a
          href="https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/"
          target="_blank"
          rel="noreferrer"
        >
          NASA wetness methodology <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
