import { lazy, Suspense, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Globe2,
  Leaf,
  LocateFixed,
  Scan,
  Plus,
  Minus,
  X,
} from "lucide-react";
import { api, downloadJSON } from "./api";
import type { Bounds, SoilReport, SoilRequest } from "./soil-types";
import "./soil.css";
import PlaceSearch from "./PlaceSearch";
import PlantingGuide from "./PlantingGuide";
import EvidenceGaps from "./EvidenceGaps";
import FarmNotebook from "./FarmNotebook";

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
      <header className="soil-header">
        <a href="/" className="soil-brand">
          <Leaf size={25} strokeWidth={1.6} /> TerraProof<span>.</span>
        </a>
        <nav aria-label="Workspace">
          <span aria-current="page">
            <Globe2 size={17} /> Soil explorer
          </span>
          <a href="#planting-guide">
            Crops & seasons <ArrowUpRight size={15} />
          </a>
        </nav>
        <a className="soil-method-link" href="#soil-methods">
          Sources & methods
        </a>
      </header>
      <main className="soil-workspace">
        <div className="soil-title">
          <div>
            <h1>Understand the soil beneath a region.</h1>
            <p>
              Find your land. Understand the soil. Explore crops and seasons.
            </p>
          </div>
          <span className="soil-scope">
            Global land coverage · source-dependent availability
          </span>
        </div>
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
              NASA GIBS overview · Esri imagery and place labels when zoomed in
              · imagery dates vary
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
                {bounds.west.toFixed(3)}° to {bounds.east.toFixed(3)}° longitude
              </p>
              <p className="region-size">
                About{" "}
                {new Intl.NumberFormat("en", {
                  maximumFractionDigits: 2,
                }).format(
                  ((bounds.east - bounds.west) *
                    (bounds.north - bounds.south) *
                    111320 ** 2 *
                    Math.cos(
                      (((bounds.north + bounds.south) / 2) * Math.PI) / 180,
                    )) /
                    10000,
                )}{" "}
                hectares selected. One hectare is 10,000 m².
              </p>
              <details className="coordinate-editor">
                <summary>Edit coordinates</summary>
                <div className="coordinate-grid">
                  {(["west", "south", "east", "north"] as const).map((key) => (
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
                  ))}
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
              <p className="soil-transfer-note">
                Small regional extracts. No full-scene satellite download.
              </p>
              <p className="soil-transfer-note">
                Soil maps are long-term predictions. The date applies to NASA
                wetness only.
              </p>
              <p className="soil-transfer-note">
                You can draw a small farm. The soil map still represents
                approximately 250 m cells; zooming closer helps you find land,
                not measure its soil more precisely.
              </p>
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
                  <p>What does this region’s soil support?</p>
                  <span>
                    Your assessment will show mapped pH, carbon, texture and
                    nutrient-retention capacity, alongside recent NASA wetness
                    context.
                  </span>
                  <ul>
                    <li>Source and depth for every property</li>
                    <li>Regional variation and data coverage</li>
                    <li>What is still unknown, and what to test next</li>
                  </ul>
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
                              {prop.median != null ? prop.unit : "unavailable"}
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
                              . Values vary across the selected area. This range
                              is not the prediction’s margin of error.
                            </p>
                            <p>
                              {prop.valid_samples} / {prop.total_samples} valid
                              samples;{" "}
                              {Math.round(
                                (prop.sampled_coverage_fraction ?? 0) * 100,
                              )}
                              % sampled coverage. Native map grid: 250 m.
                            </p>
                            <p>
                              Source: ISRIC SoilGrids 2.0 · model estimates.
                              <br />
                              Retrieved{" "}
                              {prop.provenance?.retrieved_at.slice(0, 10)}.
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              We could not obtain a usable map estimate for this
                              property. It does not mean the value is zero or
                              the soil is poor.
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
                  <p className="soil-evidence-note">
                    Regional medians of predicted properties. The spatial range
                    is not a model confidence interval or a laboratory test.
                  </p>
                </>
              )}
            </section>
          </aside>
        </div>
        {report && <EvidenceGaps report={report} />}
        <div id="planting-guide-start">
          {report ? (
            <PlantingGuide
              key={JSON.stringify(report.region)}
              region={report.region}
              stale={dirty}
            />
          ) : (
            <section id="planting-guide" className="planting-guide">
              <h2>What could I plant here?</h2>
              <p>
                Assess your region first. Then explore crop options, typical
                time to harvest and past NASA weather for that same selection.
              </p>
            </section>
          )}
        </div>
        {report && (
          <section className="soil-moisture">
            <div className="soil-section-title">
              <h2>Recent soil wetness</h2>
              <span>NASA POWER · centroid context</span>
            </div>
            {report.wetness.status === "available" ? (
              <>
                <p className="wetness-reading">
                  How to read this: taller bars mean wetter modeled soil. 0
                  means water-free; 1 means saturated. Dark bars show the
                  surface and light bars show the deeper root zone. A wetter
                  value is not automatically better for a crop.
                </p>
                <p>
                  {report.wetness.start} to {report.wetness.end} · relative
                  wetness, 0–1 · 0.5° × 0.625° source grid
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
                            style={{ height: `${(row.GWETTOP ?? 0) * 100}%` }}
                          />
                          <span
                            className={
                              row.GWETROOT == null
                                ? "wetness-missing"
                                : undefined
                            }
                            style={{ height: `${(row.GWETROOT ?? 0) * 100}%` }}
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
                <p>
                  {report.wetness.spatial_support}. An outlined gap means NASA
                  did not return a usable value for that day. It does not mean
                  dry soil. These values describe a large grid cell around the
                  selection.
                </p>
                <details className="guide-method">
                  <summary>Read the daily wetness numbers</summary>
                  <div
                    className="guide-table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Daily soil wetness data"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Surface wetness (0–1)</th>
                          <th>Root-zone wetness (0–1)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daily?.map((row) => (
                          <tr key={row.date}>
                            <th>{row.date}</th>
                            <td>
                              {row.GWETTOP?.toFixed(2) ?? "No usable value"}
                            </td>
                            <td>
                              {row.GWETROOT?.toFixed(2) ?? "No usable value"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <p className="soil-error">
                NASA wetness context is unavailable: {report.wetness.reason}.
                Soil-map results above remain independent.
              </p>
            )}
          </section>
        )}
        {report?.laboratory_references && (
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
            <p>
              These are older laboratory observations inside your selected box,
              where published. They may help you ask better questions, but
              cannot tell you what your whole farm’s soil is like today.
              Different laboratory methods are kept separate because their
              numbers are not interchangeable.
            </p>
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
                    No compatible CC-BY observations were returned for this
                    region and depth. This is a data gap, not a zero
                    concentration.
                  </p>
                ) : (
                  <>
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
                    <p>
                      Horizons overlap the selection but are not converted to an
                      exact map-depth interval. Positional uncertainty and each
                      record’s licence are retained in the JSON report.
                    </p>
                  </>
                )}
                {method.possibly_truncated && (
                  <p>
                    The 64-record limit was reached. The returned observations
                    are not a complete regional inventory.
                  </p>
                )}
                <p>{method.limitation}</p>
              </details>
            ))}
            <p>
              WoSIS can overlap SoilGrids training data. These references do not
              establish independent validation of TerraProof predictions.
            </p>
          </section>
        )}
        <section className="soil-methods" id="soil-methods">
          <div>
            <h2>Evidence has a scale.</h2>
            <p>
              Soil quality combines chemical, physical and biological
              properties. This explorer reports available evidence; a single
              worldwide “healthy soil” score would hide differences in soil
              type, land use and crop needs.
            </p>
          </div>
          <div>
            <h3>Mapped properties</h3>
            <p>
              ISRIC’s published SoilGrids model supplies soil estimates. NASA
              wetness supplies changing environmental context.
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
              Ask a local soil laboratory or extension adviser about
              plant-available nitrogen, phosphorus and potassium, salinity and a
              drainage check. The checklist above records your selected region
              and the questions to take with you.
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
      <footer className="soil-footer">
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
