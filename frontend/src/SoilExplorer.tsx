import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  Check,
  ChevronRight,
  Compass,
  Globe2,
  Layers,
  Leaf,
  LocateFixed,
  MapPin,
  Minus,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Printer,
  Scan,
  Sparkles,
  Sun,
  TrendingUp,
  X,
} from "lucide-react";
import { api, downloadJSON } from "./api";
import type { Bounds, SoilReport, SoilRequest } from "./soil-types";
import type { PlantingReport } from "./planting-types";
import "./soil.css";
import PlaceSearch from "./PlaceSearch";
import PlantingGuide, { type RotationFollowCropId } from "./PlantingGuide";
import FarmNotebook from "./FarmNotebook";
import PrintableReport from "./PrintableReport";
import {
  BrandIcon,
  ClimateMarketGraphic,
  PrintableBriefGraphic,
  SatelliteSoilGraphic,
  SoilHorizonIllustration,
  WorkflowPipelineGraphic,
} from "./LandingGraphics";
import {
  describeCarbonInWords,
  describeClayInWords,
  describeDepthInWords,
  describeLocationBanner,
  describePhInWords,
  describePlaceFromBounds,
  describePlotSizeInWords,
  describeWetnessInWords,
} from "./plain-language";
import { springScrollToElement, springScrollToY } from "./spring-scroll";

const SoilGlobe = lazy(() => import("./SoilGlobe"));

export type AppView = "landing" | "globe" | "market" | "result";

const ALBAY: Bounds = { west: 123.7, south: 13.1, east: 123.8, north: 13.2 };
const explanations: Record<string, string> = {
  phh2o:
    "Shows if soil is sour or sweet. Balanced soil helps roots drink up plant food easily.",
  soc: "Dark organic material left by plants and roots that keeps soil fertile and alive.",
  clay: "Fine soil particles that hold rainwater around plant roots during dry spells.",
  sand: "Coarse grains that help excess rain drain away so roots can breathe.",
  silt: "Smooth particles that make soil soft and easy for young roots to spread.",
  cec: "How well your soil holds onto plant nutrients between rains.",
  bdod: "How loosely or tightly the soil is packed for root growth.",
  nitrogen:
    "Natural plant food in the soil that supports green leaf growth.",
};
const friendlyNames: Record<string, string> = {
  phh2o: "Soil Balance (Acidity)",
  soc: "Natural Organic Matter",
  clay: "Water-Holding Clay",
  sand: "Drainage Sand",
  silt: "Soft Silt",
  cec: "Nutrient Holding Power",
  bdod: "Soil Looseness",
  nitrogen: "Natural Leaf Food",
};

function describePropertyValueInWords(
  id: string,
  val: number | null | undefined,
): string {
  if (val == null) return "Needs Local Check";
  if (id === "phh2o") return describePhInWords(val).title;
  if (id === "soc") return describeCarbonInWords(val).title;
  if (id === "clay") return describeClayInWords(val).title;
  if (id === "sand") return val > 45 ? "Fast-Draining" : "Balanced Drainage";
  if (id === "silt") return "Soft Loamy Feel";
  if (id === "cec") return val >= 12 ? "Holds Nutrients Well" : "Light Nutrient Hold";
  if (id === "bdod") return val <= 1.35 ? "Loose & Root-Friendly" : "Firm Ground";
  if (id === "nitrogen") return "Healthy Base Level";
  return "Balanced";
}

export default function SoilExplorer() {
  const globeToolbar = useRef<HTMLElement | null>(null);
  const [view, setView] = useState<AppView>("landing");
  useEffect(() => {
    const toolbar = globeToolbar.current;
    if (view !== "globe" || !toolbar) return;
    const positionPanel = () => {
      document.documentElement.style.setProperty(
        "--globe-panel-top",
        `${Math.ceil(toolbar.getBoundingClientRect().bottom) + 12}px`,
      );
    };
    const observer = new ResizeObserver(positionPanel);
    observer.observe(toolbar);
    positionPanel();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--globe-panel-top");
    };
  }, [view]);
  const [colorMode, setColorMode] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("terraproof-color-mode");
      if (saved === "dark" || saved === "light") return saved;
      if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch {
      /* ignore */
    }
    return "light";
  });
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
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [savedPlotsOpen, setSavedPlotsOpen] = useState(false);
  const [placeLabel, setPlaceLabel] = useState<string>("");
  const [selectedRotation, setSelectedRotation] =
    useState<RotationFollowCropId>("soybean");
  const [selectedPrimaryCropId, setSelectedPrimaryCropId] =
    useState<string>("rice_indica");
  const [themeWave, setThemeWave] = useState<"to-light" | "to-dark" | null>(
    null,
  );

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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorMode);
    try {
      localStorage.setItem("terraproof-color-mode", colorMode);
    } catch {
      /* ignore */
    }
  }, [colorMode]);

  useEffect(() => {
    springScrollToY(0, { stiffness: 175, damping: 21 });
    if ((view === "market" || view === "result") && !report && !busy && !invalid) {
      void assess();
    }
  }, [view]);

  function toggleColorMode(e?: React.MouseEvent<HTMLButtonElement>) {
    const nextMode = colorMode === "dark" ? "light" : "dark";
    const rect = e?.currentTarget.getBoundingClientRect();
    const x = rect ? Math.round(rect.left + rect.width / 2) : window.innerWidth - 120;
    const y = rect ? Math.round(rect.top + rect.height / 2) : 38;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const root = document.documentElement;
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${Math.ceil(maxRadius)}px`);
    root.classList.add(
      nextMode === "light" ? "transitioning-to-light" : "transitioning-to-dark",
    );

    setThemeWave(nextMode === "light" ? "to-light" : "to-dark");

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (
      docWithVT.startViewTransition &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      docWithVT.startViewTransition(() => {
        root.setAttribute("data-theme", nextMode);
        setColorMode(nextMode);
      });
    } else {
      setColorMode(nextMode);
    }

    window.setTimeout(() => {
      setThemeWave(null);
      root.classList.remove("transitioning-to-light", "transitioning-to-dark");
    }, 780);
  }

  async function assess() {
    setBusy(true);
    setError("");
    setSelecting(false);
    try {
      const soilRes = await api<SoilReport>("/soil/assess", request);
      setReport(soilRes);
      if (!plantingReport) {
        api<PlantingReport>("/planting/assess", {
          ...request,
          planting_month: plantingMonth,
          planning_year: planningYear,
          water_supply: "unknown",
          priority: "reference_fit",
        })
          .then((plantRes) => setPlantingReport(plantRes))
          .catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleAdvanceToMarket() {
    if (!report && !busy && !invalid) {
      void assess();
    }
    setView("market");
  }

  const daily = report?.wetness.daily;
  const last = daily?.at(-1);
  const soilPhMedian =
    report?.properties.find((p) => p.id === "phh2o")?.median ?? 5.6;

  return (
    <div
      className={`soil-app view-mode-${view} ${colorMode === "dark" ? "dark-mode" : "light-mode"} ${themeWave ? `theme-wave-${themeWave}` : ""}`}
      data-theme={colorMode}
    >
      {themeWave && (
        <div
          className={`theme-sunburst-overlay ${themeWave}`}
          aria-hidden="true"
        >
          <span className="sunburst-core" />
          <span className="sunburst-ring" />
        </div>
      )}
      {/* =====================================================================
          VIEW 0: DEDICATED LANDING PAGE
         ===================================================================== */}
      {view === "landing" && (
        <div className="landing-page no-print">
          <header className="landing-navbar">
            <a
              href="#top"
              className="soil-brand"
              onClick={(e) => {
                e.preventDefault();
                setView("landing");
              }}
            >
              <BrandIcon size={36} /> TerraProof<span>.</span>
            </a>

            <nav className="landing-nav-links" aria-label="Landing sections">
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  springScrollToElement("how-it-works", 86);
                }}
              >
                How It Works
              </a>
              <a
                href="#visual-workflow"
                onClick={(e) => {
                  e.preventDefault();
                  springScrollToElement("visual-workflow", 86);
                }}
              >
                Visual Process
              </a>
              <a
                href="#data-pipeline"
                onClick={(e) => {
                  e.preventDefault();
                  springScrollToElement("data-pipeline", 86);
                }}
              >
                Evidence Pipeline
              </a>
            </nav>

            <div className="landing-header-right">
              <button
                type="button"
                className="theme-mode-toggle"
                onClick={toggleColorMode}
                aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
                title={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
              >
                {colorMode === "dark" ? (
                  <>
                    <Sun size={16} aria-hidden="true" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon size={16} aria-hidden="true" />
                    <span>Dark</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="landing-cta-pill"
                onClick={() => setView("globe")}
              >
                <LocateFixed size={16} aria-hidden="true" /> Pinpoint Your Land
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </header>

          <main className="landing-main" id="top">
            {/* TOP HERO FOLD: Left Slogan, Right Real Farmer Photo */}
            <section
              className="landing-hero-fold"
              aria-label="TerraProof introduction"
            >
              <div className="landing-hero-grid">
                <div className="landing-hero-left animate-fade-up">
                  <div className="biophilic-eyebrow">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>SOIL HEALTH · SEASONAL WEATHER · CROP MARKET</span>
                  </div>

                  <p className="landing-slogan">
                    TerraProof, Understand the evidence. Discuss what comes next.
                  </p>

                  <h1 className="landing-headline">
                    Simple Visual Guidance for What to Plant &amp; When to Sell.
                  </h1>

                  <p className="landing-lead">
                    Pinpoint your farm on a 3D globe, see illustrated crops
                    matched to your soil and weather, and print a clean farm
                    guide in plain language.
                  </p>

                  <div className="landing-hero-actions">
                    <button
                      type="button"
                      className="btn-launch-globe"
                      onClick={() => setView("globe")}
                    >
                      <Globe2 size={19} aria-hidden="true" />
                      <span>Pinpoint Your Land</span>
                      <ArrowRight size={18} aria-hidden="true" />
                    </button>

                    <a
                      href="#how-it-works"
                      className="btn-scroll-story"
                      onClick={(e) => {
                        e.preventDefault();
                        springScrollToElement("how-it-works", 86);
                      }}
                    >
                      <span>See Visual Guide</span>
                      <ArrowDown size={17} aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <div className="landing-hero-right animate-fade-up-delayed">
                  <div className="farmer-showcase-frame">
                    <img
                      src="/farmer-hero.jpg"
                      alt="Filipino farmer smiling while inspecting healthy green rice crops in sunlit terraced paddy fields"
                      className="farmer-showcase-img"
                    />

                    <div className="floating-telemetry-card card-top-left animate-float-slow">
                      <span className="telemetry-dot" aria-hidden="true" />
                      <div>
                        <strong>Albay Sample Farmland · Surface Topsoil</strong>
                        <span>Healthy Soil Balance &amp; Root Moisture</span>
                      </div>
                    </div>

                    <div className="floating-telemetry-card card-bottom-right">
                      <Leaf size={18} aria-hidden="true" />
                      <div>
                        <strong>Made for Farmers &amp; Local Advisers</strong>
                        <span>
                          Plain-language guidance from map to harvest market
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="scroll-cue-bar">
                <a
                  href="#how-it-works"
                  className="scroll-cue-link"
                  onClick={(e) => {
                    e.preventDefault();
                    springScrollToElement("how-it-works", 86);
                  }}
                >
                  <span>Scroll to explore our 3-step visual process</span>
                  <ArrowDown size={15} aria-hidden="true" />
                </a>
              </div>
            </section>

            {/* SCROLL SECTION 1: VISUAL PROCESS WITH CUSTOM GRAPHICS */}
            <section
              id="how-it-works"
              className="landing-graphics-section"
              aria-label="How TerraProof works in three visual stages"
            >
              <div className="section-heading-block">
                <span className="section-kicker">
                  HOW IT WORKS · VISUAL WORKFLOW
                </span>
                <h2>Three Simple Screens. Explained in Plain Words.</h2>
                <p>
                  Find your land, compare illustrated crops for your season, and
                  print a clear farm guide.
                </p>
              </div>

              <div id="visual-workflow" className="graphic-story-grid">
                <article className="graphic-story-card">
                  <div className="graphic-illustration-box">
                    <SatelliteSoilGraphic />
                  </div>
                  <div className="graphic-card-body">
                    <div className="graphic-step-header">
                      <span className="graphic-step-pill">STEP 1</span>
                      <span className="graphic-step-tag">
                        Full-Screen 3D Globe
                      </span>
                    </div>
                    <h3>Pinpoint Your Land &amp; Check Soil Health</h3>
                    <p>
                      Search your town or draw a box around your field to see
                      soil fertility, root moisture, and drainage in plain
                      words.
                    </p>
                    <ul className="graphic-bullet-list">
                      <li>
                        <Check size={15} aria-hidden="true" /> Quick town search
                        &amp; saved farm plots
                      </li>
                      <li>
                        <Check size={15} aria-hidden="true" /> Visual soil
                        balance &amp; moisture guide
                      </li>
                    </ul>
                    <button
                      type="button"
                      className="graphic-card-cta"
                      onClick={() => setView("globe")}
                    >
                      <span>Open 3D Globe</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </article>

                <article className="graphic-story-card">
                  <div className="graphic-illustration-box">
                    <ClimateMarketGraphic />
                  </div>
                  <div className="graphic-card-body">
                    <div className="graphic-step-header">
                      <span className="graphic-step-pill">STEP 2</span>
                      <span className="graphic-step-tag">
                        Weather + Buyer Demand
                      </span>
                    </div>
                    <h3>Compare Illustrated Crops &amp; Market Windows</h3>
                    <p>
                      Pick your planting month to see which crops match local
                      rain and when buyer prices are strongest.
                    </p>
                    <ul className="graphic-bullet-list">
                      <li>
                        <Check size={15} aria-hidden="true" /> Illustrated crop
                        cards &amp; seasonal chart
                      </li>
                      <li>
                        <Check size={15} aria-hidden="true" /> Two-season bean
                        &amp; grain rotations
                      </li>
                    </ul>
                    <button
                      type="button"
                      className="graphic-card-cta"
                      onClick={() => setView("market")}
                    >
                      <span>Explore Crops &amp; Market</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </article>

                <article className="graphic-story-card">
                  <div className="graphic-illustration-box">
                    <PrintableBriefGraphic />
                  </div>
                  <div className="graphic-card-body">
                    <div className="graphic-step-header">
                      <span className="graphic-step-pill">STEP 3</span>
                      <span className="graphic-step-tag">
                        Custom Print Guide
                      </span>
                    </div>
                    <h3>Print Your Visual Farm Story</h3>
                    <p>
                      Get a clean one-page summary with crop pictures, soil
                      graphics, and an AI helper that customizes the print for
                      you.
                    </p>
                    <ul className="graphic-bullet-list">
                      <li>
                        <Check size={15} aria-hidden="true" /> Story Brief,
                        Field Poster &amp; Loan Ledger
                      </li>
                      <li>
                        <Check size={15} aria-hidden="true" /> Floating AI
                        Print Customizer bubble
                      </li>
                    </ul>
                    <button
                      type="button"
                      className="graphic-card-cta"
                      onClick={() => setView("result")}
                    >
                      <span>Open Final Result Story</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              </div>
            </section>

            {/* SCROLL SECTION 2: DATA PIPELINE GRAPHIC & HONEST LIMITS */}
            <section
              id="data-pipeline"
              className="landing-pipeline-section"
              aria-label="How TerraProof connects satellite evidence to local farm decisions"
            >
              <div className="section-heading-block">
                <span className="section-kicker">
                  CLEAR &amp; HONEST FARM GUIDANCE
                </span>
                <h2>How Your Location Becomes a Field Guide</h2>
                <p>
                  We translate satellite soil and weather maps into everyday
                  farming words.
                </p>
              </div>

              <div className="pipeline-graphic-container">
                <WorkflowPipelineGraphic />
              </div>

              <div className="bento-proof-grid">
                <div className="bento-proof-card">
                  <span className="bento-eyebrow">SOIL HEALTH MAP</span>
                  <h3>Topsoil Balance &amp; Fertility</h3>
                  <p>
                    Checks soil acidity, natural organic matter, and clay so you
                    know how well your ground holds water and plant food.
                  </p>
                </div>
                <div className="bento-proof-card">
                  <span className="bento-eyebrow">SEASONAL WEATHER</span>
                  <h3>Typical Rain &amp; Warmth</h3>
                  <p>
                    Shows which months are rainy, balanced, or sunny so you can
                    time your planting with confidence.
                  </p>
                </div>
                <div className="bento-proof-card">
                  <span className="bento-eyebrow">CROP &amp; BUYER MATCH</span>
                  <h3>Harvest Timing &amp; Rotations</h3>
                  <p>
                    Highlights when local buyer demand is strong and which bean
                    or grain crop should follow next season.
                  </p>
                </div>
                <div className="bento-proof-card highlight-bento">
                  <span className="bento-eyebrow">LOCAL FIELD CHECKS</span>
                  <h3>3 Quick Steps on the Ground</h3>
                  <p>
                    Reminds you to check fertilizer bags with a quick soil kit,
                    clear field drainage, and confirm local buyer prices.
                  </p>
                </div>
              </div>
            </section>

            {/* BOTTOM CLIMAX CTA BANNER */}
            <section
              className="landing-bottom-cta"
              aria-label="Start using TerraProof"
            >
              <div className="bottom-cta-inner">
                <div>
                  <span className="biophilic-eyebrow light-eyebrow">
                    <Sparkles size={14} aria-hidden="true" /> READY TO INSPECT
                    YOUR FIELD?
                  </span>
                  <h2>Launch the Full-Screen 3D Globe &amp; Pinpoint Your Land</h2>
                  <p>
                    Start with our pre-loaded Albay sample region or search any
                    town, village, or farm coordinate worldwide.
                  </p>
                </div>
                <div className="bottom-cta-buttons">
                  <button
                    type="button"
                    className="btn-launch-globe btn-launch-large"
                    onClick={() => setView("globe")}
                  >
                    <LocateFixed size={20} aria-hidden="true" />
                    <span>Pinpoint Your Land Now</span>
                    <ArrowRight size={19} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          </main>

          <footer className="landing-footer">
            <span>TerraProof · Regional soil, climate &amp; market intelligence.</span>
            <div className="landing-footer-links">
              <a
                href="https://doi.org/10.5194/soil-7-217-2021"
                target="_blank"
                rel="noreferrer"
              >
                ISRIC SoilGrids 2.0 <ArrowUpRight size={13} aria-hidden="true" />
              </a>
              <a
                href="https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/"
                target="_blank"
                rel="noreferrer"
              >
                NASA POWER Methodology{" "}
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
          </footer>
        </div>
      )}

      {/* =====================================================================
          VIEW 1: FULL-VIEWPORT 3D GLOBE WORKSPACE ("PINPOINT LOCATION")
         ===================================================================== */}
      {view === "globe" && (
        <div
          className="globe-fullscreen-stage no-print"
          aria-label="Step 1: Full-screen interactive 3D globe"
        >
          <div className="globe-fullscreen-canvas-wrap">
            <Suspense
              fallback={
                <div className="globe-loading" role="status">
                  Preparing the full-screen 3D globe…
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
          </div>

          <header className="globe-hud-top-bar" ref={globeToolbar}>
            <div className="globe-hud-brand-cluster">
              <button
                type="button"
                className="hud-back-landing-btn"
                onClick={() => setView("landing")}
                title="Return to TerraProof Landing Page"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                <BrandIcon size={26} />
                <span>Return to Landing Page</span>
              </button>

              <nav
                className="hud-stepper-pills"
                aria-label="Application workflow steps"
              >
                <button
                  type="button"
                  className="hud-step-pill is-active"
                  aria-current="step"
                  onClick={() => setView("globe")}
                >
                  <MapPin size={14} aria-hidden="true" />
                  <span>1. Pinpoint Land</span>
                </button>
                <ChevronRight
                  size={14}
                  className="hud-step-sep"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="hud-step-pill"
                  onClick={handleAdvanceToMarket}
                >
                  <TrendingUp size={14} aria-hidden="true" />
                  <span>2. Market Analysis</span>
                </button>
                <ChevronRight
                  size={14}
                  className="hud-step-sep"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="hud-step-pill"
                  onClick={() => setView("result")}
                >
                  <Printer size={14} aria-hidden="true" />
                  <span>3. Final Result</span>
                </button>
              </nav>
            </div>

            <div className="globe-hud-search-cluster">
              <div className="hud-search-box">
                <PlaceSearch
                  onLocate={(next, label) => {
                    setBounds(next);
                    if (label) setPlaceLabel(label);
                    setMapStyle("satellite");
                    setFocus((f) => Math.abs(f) + 1);
                    setSelecting(false);
                  }}
                />
              </div>

              <div className="hud-notebook-wrapper">
                <button
                  type="button"
                  className={`hud-icon-btn ${savedPlotsOpen ? "is-open" : ""}`}
                  aria-expanded={savedPlotsOpen}
                  onClick={() => setSavedPlotsOpen((o) => !o)}
                >
                  <BookMarked size={16} aria-hidden="true" />
                  <span>Saved Plots</span>
                </button>
                {savedPlotsOpen && (
                  <div className="hud-notebook-popover">
                    <FarmNotebook
                      bounds={bounds}
                      depth={depth}
                      onOpen={(plot) => {
                        setBounds(plot.bounds);
                        setDepth(plot.depth);
                        setFocus((f) => Math.abs(f) + 1);
                        setSelecting(false);
                        setSavedPlotsOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                className="hud-icon-btn"
                onClick={toggleColorMode}
                aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
              >
                {colorMode === "dark" ? (
                  <Sun size={16} aria-hidden="true" />
                ) : (
                  <Moon size={16} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                className="hud-toggle-drawer-btn"
                onClick={() => setDrawerOpen((o) => !o)}
                aria-expanded={drawerOpen}
                title={
                  drawerOpen ? "Collapse soil panel" : "Expand soil panel"
                }
              >
                {drawerOpen ? (
                  <>
                    <PanelRightClose size={16} aria-hidden="true" />
                    <span>Hide Panel</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen size={16} aria-hidden="true" />
                    <span>Soil Panel</span>
                  </>
                )}
              </button>
            </div>
          </header>

          <div
            className="globe-hud-bottom-left"
            role="region"
            aria-label="Globe drawing and camera controls"
          >
            <div className="hud-control-row">
              <button
                type="button"
                className={`hud-tool-btn ${selecting ? "draw-active" : ""}`}
                aria-pressed={selecting}
                onClick={() => setSelecting(!selecting)}
              >
                {selecting ? (
                  <X size={16} aria-hidden="true" />
                ) : (
                  <Scan size={16} aria-hidden="true" />
                )}
                <span>{selecting ? "Cancel box" : "Draw a region"}</span>
              </button>

              <button
                type="button"
                className="hud-tool-btn"
                onClick={() => setFocus((f) => Math.abs(f) + 1)}
                disabled={invalid}
              >
                <LocateFixed size={16} aria-hidden="true" />
                <span>Zoom to Box</span>
              </button>

              <button
                type="button"
                className="hud-tool-btn"
                onClick={() => {
                  setBounds(ALBAY);
                  setFocus((f) => Math.abs(f) + 1);
                  setSelecting(false);
                }}
              >
                <Compass size={16} aria-hidden="true" />
                <span>Albay Sample</span>
              </button>

              <button
                type="button"
                className="hud-tool-btn"
                title="Return to full Earth view"
                onClick={() => {
                  setFocus((f) => -Math.abs(f) - 1);
                  setSelecting(false);
                }}
              >
                <Globe2 size={16} aria-hidden="true" />
                <span>Earth View</span>
              </button>
            </div>

            <div className="hud-control-row">
              <div
                className="hud-segmented-toggle"
                role="group"
                aria-label="Map layer style"
              >
                <button
                  type="button"
                  aria-pressed={mapStyle === "satellite"}
                  onClick={() => setMapStyle("satellite")}
                >
                  <Layers size={14} aria-hidden="true" /> Satellite
                </button>
                <button
                  type="button"
                  aria-pressed={mapStyle === "roads"}
                  onClick={() => setMapStyle("roads")}
                >
                  Places &amp; roads
                </button>
              </div>

              <div
                className="hud-zoom-group"
                role="group"
                aria-label="Globe zoom"
              >
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => z + 1)}
                >
                  <Plus size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => z - 1)}
                >
                  <Minus size={17} aria-hidden="true" />
                </button>
              </div>

              <span className="hud-hint-pill" role="status">
                {selecting
                  ? "Click first corner on the globe, then click opposite corner."
                  : "Drag to rotate · Scroll to zoom · Use 'Draw a region' to select land"}
              </span>
            </div>
          </div>

          {drawerOpen && (
            <aside
              className="globe-hud-right-drawer animate-slide-left"
              id="soil-region"
              aria-label="Selected region and soil assessment panel"
            >
              <div className="hud-drawer-scroll">
                <section className="region-panel hud-region-section">
                  <button
                    type="button"
                    className="drawer-return-landing-btn"
                    onClick={() => setView("landing")}
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    <span>Return to Landing Page</span>
                  </button>
                  <div className="soil-section-title">
                    <div>
                      <span className="hud-eyebrow">STEP 1 OF 3 · PINPOINT</span>
                      <h2>Your Selected Farmland</h2>
                    </div>
                    <span className="hud-depth-badge">
                      {describeDepthInWords(depth)}
                    </span>
                  </div>

                  <div className="hud-coords-summary">
                    <div>
                      <span>Location</span>
                      <strong>
                        {describePlaceFromBounds(bounds, placeLabel)}
                      </strong>
                    </div>
                    <div>
                      <span>Field Size</span>
                      <strong>{describePlotSizeInWords(areaHa)}</strong>
                    </div>
                    <div>
                      <span>Soil Layer</span>
                      <strong>{describeDepthInWords(depth)}</strong>
                    </div>
                  </div>

                  <details className="coordinate-editor">
                    <summary>Adjust map boundary manually</summary>
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
                        Soil root layer
                        <select
                          value={depth}
                          onChange={(e) => setDepth(e.target.value)}
                        >
                          <option value="0-5cm">Surface Topsoil</option>
                          <option value="5-15cm">Shallow Root Layer</option>
                          <option value="15-30cm">Deep Root Layer</option>
                        </select>
                      </label>
                      <label>
                        Recent weather date
                        <input
                          aria-label="Recent weather date"
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
                        Please draw a smaller box around your farm area.
                      </p>
                    )}
                    <button
                      className="soil-assess"
                      type="submit"
                      disabled={busy || invalid}
                    >
                      <span>
                        {busy
                          ? "Checking soil health & root moisture…"
                          : report && !dirty
                            ? "Refresh Soil Check"
                            : "Check Soil Health"}
                      </span>
                      {!busy && <ArrowUpRight size={17} aria-hidden="true" />}
                    </button>
                  </form>

                  {error && (
                    <div className="soil-error" role="alert">
                      <p>{error}</p>
                      <button type="button" onClick={() => void assess()}>
                        Try again
                      </button>
                    </div>
                  )}
                </section>

                <section
                  className="soil-report hud-soil-report"
                  aria-live="polite"
                  aria-busy={busy}
                >
                  <div className="soil-section-title">
                    <h2>Soil &amp; Root Health</h2>
                    {report && (
                      <button
                        type="button"
                        title="Save soil summary file"
                        aria-label="Save soil summary file"
                        onClick={() =>
                          downloadJSON(report, "terraproof-soil-report.json")
                        }
                      >
                        <ArrowDownToLine size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* ILLUSTRATED SOIL HORIZON & ROOT GRAPHIC */}
                  <SoilHorizonIllustration
                    balanceLabel={describePhInWords(soilPhMedian).title}
                    fertilityLabel={
                      describeCarbonInWords(
                        report?.properties.find((p) => p.id === "soc")?.median,
                      ).title
                    }
                    moistureLabel={describeWetnessInWords(last?.GWETROOT).title}
                  />

                  {dirty && (
                    <p className="soil-stale">
                      Location changed. Tap “Check Soil Health” above to update.
                    </p>
                  )}

                  {!report ? (
                    <div className="soil-empty hud-empty-box">
                      <p>Ready to check the ground beneath your farm box.</p>
                      <span>
                        Tap <b>Check Soil Health</b> above or continue directly
                        to <b>Crops &amp; Market</b> below.
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="soil-report-caption">
                        <Check size={14} aria-hidden="true" /> Soil &amp;
                        moisture summary for {describeDepthInWords(report.region.depth)}
                      </p>
                      <div className="soil-property-list">
                        {report.properties.map((prop) => (
                          <details key={prop.id} className="soil-property">
                            <summary>
                              <span>{friendlyNames[prop.id] ?? prop.label}</span>
                              <strong>
                                {describePropertyValueInWords(
                                  prop.id,
                                  prop.median,
                                )}
                              </strong>
                            </summary>
                            <p>{explanations[prop.id]}</p>
                          </details>
                        ))}
                      </div>

                      {report.wetness.status === "available" && (
                        <div className="hud-wetness-mini">
                          <div className="hud-wetness-head">
                            <strong>Recent Root Moisture</strong>
                            <span>
                              {describeWetnessInWords(last?.GWETROOT).title}
                            </span>
                          </div>
                          <div className="wetness-series hud-wetness-bars">
                            {daily?.slice(-10).map((row) => (
                              <div
                                key={row.date}
                                className="wetness-day"
                                title={
                                  describeWetnessInWords(row.GWETROOT).title
                                }
                              >
                                <div className="wetness-bars">
                                  <span
                                    style={{
                                      height: `${(row.GWETTOP ?? 0) * 100}%`,
                                    }}
                                  />
                                  <span
                                    style={{
                                      height: `${(row.GWETROOT ?? 0) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span>Day</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>

              <div className="hud-drawer-footer">
                <button
                  type="button"
                  className="hud-next-stage-btn"
                  onClick={handleAdvanceToMarket}
                >
                  <div>
                    <small>NEXT STEP · STAGE 02</small>
                    <strong>Market &amp; Trend Analysis</strong>
                  </div>
                  <ArrowRight size={19} aria-hidden="true" />
                </button>
              </div>
            </aside>
          )}

          {!drawerOpen && (
            <div className="globe-hud-bottom-right">
              <button
                type="button"
                className="hud-next-stage-btn floating-standalone"
                onClick={handleAdvanceToMarket}
              >
                <div>
                  <small>NEXT STEP · STAGE 02</small>
                  <strong>Market &amp; Trend Analysis</strong>
                </div>
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          VIEW 2: DEDICATED MARKET & TREND ANALYSIS WORKSPACE
         ===================================================================== */}
      {view === "market" && (
        <div className="DedicatedStageView market-stage-view no-print">
          <header className="stage-sticky-topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="topbar-back-btn"
                onClick={() => setView("landing")}
                title="Return to Landing Page"
              >
                <BrandIcon size={22} />
                <span>Landing Page</span>
              </button>

              <button
                type="button"
                className="topbar-back-btn"
                onClick={() => setView("globe")}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                <span>1. Pinpoint Land</span>
              </button>

              <div className="topbar-brand-divider" aria-hidden="true" />

              <div className="topbar-step-indicator">
                <button
                  type="button"
                  className="step-pill-done"
                  onClick={() => setView("globe")}
                >
                  <Check size={13} aria-hidden="true" /> 1. Pinpoint Land
                </button>
                <ChevronRight size={14} aria-hidden="true" />
                <span className="step-pill-current">
                  <TrendingUp size={14} aria-hidden="true" /> 2. Market &amp;
                  Trends
                </span>
                <ChevronRight size={14} aria-hidden="true" />
                <button
                  type="button"
                  className="step-pill-upcoming"
                  onClick={() => setView("result")}
                >
                  <Printer size={14} aria-hidden="true" /> 3. Final Result
                </button>
              </div>
            </div>

            <div className="topbar-right">
              <div className="region-context-chip">
                <MapPin size={14} aria-hidden="true" />
                <span>
                  {describeLocationBanner(bounds, areaHa, depth, placeLabel)}
                </span>
              </div>

              <button
                type="button"
                className="theme-mode-toggle"
                onClick={toggleColorMode}
                aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
              >
                {colorMode === "dark" ? (
                  <Sun size={16} aria-hidden="true" />
                ) : (
                  <Moon size={16} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                className="topbar-next-cta"
                onClick={() => setView("result")}
              >
                <span>Next: Final Result Story</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </header>

          <main className="stage-view-container market-wizard-container animate-fade-up">
            {/* STEP-BY-STEP MARKET & SEASONAL TREND WIZARD (No Scroll Overload) */}
            <div className="stage-card-wrapper market-wizard-card">
              <PlantingGuide
                key={JSON.stringify(report?.region ?? request)}
                region={report?.region ?? request}
                stale={dirty}
                areaHa={areaHa}
                soilPh={soilPhMedian}
                initialReport={plantingReport}
                selectedRotation={selectedRotation}
                onSelectRotation={setSelectedRotation}
                onSelectPrimaryCrop={setSelectedPrimaryCropId}
                onReportChange={(nextReport, month, year) => {
                  setPlantingReport(nextReport);
                  setPlantingMonth(month);
                  setPlanningYear(year);
                }}
                onFinishToResult={() => setView("result")}
              />
            </div>
          </main>
        </div>
      )}

      {/* =====================================================================
          VIEW 3: MINIMALIST FINAL RESULT STORY & CUSTOM PRINT STUDIO
         ===================================================================== */}
      {view === "result" && (
        <div className="DedicatedStageView result-stage-view">
          <main className="stage-view-container minimal-result-stage animate-fade-up">
            <PrintableReport
              bounds={bounds}
              depth={depth}
              areaHa={areaHa}
              placeLabel={placeLabel}
              soilReport={report}
              plantingReport={plantingReport}
              plantingMonth={plantingMonth}
              planningYear={planningYear}
              selectedRotation={selectedRotation}
              selectedPrimaryCropId={selectedPrimaryCropId}
              colorMode={colorMode}
              onToggleColorMode={toggleColorMode}
              onBackToMarket={() => setView("market")}
              onReturnToLanding={() => setView("landing")}
              onRequestAssess={() => void assess()}
              busy={busy}
            />
          </main>
        </div>
      )}
    </div>
  );
}
