import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  FlaskConical,
  FolderOpen,
  Leaf,
  MapPin,
  Menu,
  Play,
  Save,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { api, downloadJSON } from "./api";
import {
  Field,
  number,
  peso,
  PlanEditor,
  SeasonEvidence,
  YearChart,
} from "./components";
import type { Economics, Request, Result, Saved } from "./types";

type View = "compare" | "economics" | "evidence" | "saved";
const tabs = [
  { id: "compare", label: "Compare dates", icon: CalendarDays },
  { id: "economics", label: "Costs & income", icon: Wallet },
  { id: "evidence", label: "How it works", icon: BookOpen },
  { id: "saved", label: "Saved comparisons", icon: FolderOpen },
] as const;
const economicFields: [keyof Economics, string, number, number][] = [
  ["area_ha", "Farm area (hectares)", 0.01, 10000],
  ["yield_t_ha", "Expected harvest (tonnes per hectare)", 0, 30],
  ["price_php_kg", "Selling price (pesos per kg)", 0, 1000],
  ["seeds_php_ha", "Seeds (pesos per hectare)", 0, 1e7],
  ["fertilizer_php_ha", "Fertilizer (pesos per hectare)", 0, 1e7],
  ["labor_php_ha", "Labor (pesos per hectare)", 0, 1e7],
  ["irrigation_php_ha", "Irrigation (pesos per hectare)", 0, 1e7],
  ["other_php_ha", "Other costs (pesos per hectare)", 0, 1e7],
];

export default function App() {
  const [request, setRequest] = useState<Request>();
  const [result, setResult] = useState<Result>();
  const [view, setView] = useState<View>("compare");
  const [busy, setBusy] = useState("Loading NASA climate history");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [savedId, setSavedId] = useState("");
  const [year, setYear] = useState(2024);
  const [planIndex, setPlanIndex] = useState(0);
  const [metric, setMetric] = useState<"heat_days" | "heavy_rain_days">(
    "heavy_rain_days",
  );
  const [menu, setMenu] = useState(false);
  const dirty =
    !!request &&
    !!result &&
    JSON.stringify(request) !== JSON.stringify(result.request);

  async function initialize() {
    setBusy("Loading NASA climate history");
    setError("");
    try {
      const config = await api<{ defaults: Request }>("/config");
      setRequest(config.defaults);
      const replay = await api<Result>("/compare", config.defaults);
      setResult(replay);
      setSaved(await api<Saved[]>("/comparisons"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  useEffect(() => {
    void initialize();
  }, []);

  async function run(save = false) {
    if (!request) return;
    setBusy(
      save
        ? "Saving comparison with source evidence"
        : "Comparing past weather",
    );
    setError("");
    setNotice("");
    try {
      if (save) {
        const entry = await api<Saved>("/comparisons", request);
        const stored = await api<Saved & { result: Result }>(
          `/comparisons/${entry.id}`,
        );
        setResult(stored.result);
        setSavedId(entry.id);
        setNotice("Comparison saved on this computer.");
        setSaved(await api<Saved[]>("/comparisons"));
      } else {
        setResult(await api<Result>("/compare", request));
        setSavedId("");
      }
      setYear(Math.min(Math.max(year, request.start_year), request.end_year));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function openSaved(id: string) {
    setBusy("Opening saved evidence");
    setError("");
    try {
      const stored = await api<Saved & { result: Result }>(
        `/comparisons/${id}`,
      );
      setResult(stored.result);
      setRequest(stored.result.request);
      setSavedId(id);
      setYear(stored.result.request.end_year);
      setView("compare");
      setNotice("Loaded the saved snapshot and its original assumptions.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function remove(id: string) {
    setBusy("Removing saved comparison");
    setError("");
    try {
      await api(`/comparisons/${id}`, undefined, "DELETE");
      setSaved(saved.filter((s) => s.id !== id));
      if (savedId === id) setSavedId("");
      setNotice("Saved comparison removed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const change = (next: Request) => {
    setRequest(next);
    setNotice("");
  };
  const selected = result?.plans[planIndex]?.seasons.find(
    (s) => s.year === year,
  );
  const common = result?.common_complete_years.length ?? 0;

  return (
    <div className="app-shell">
      <a href="#workspace" className="skip-link">
        Skip to workspace
      </a>
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <a className="brand" href="#" onClick={() => setView("compare")}>
          <Leaf size={27} strokeWidth={1.7} />
          <span>
            TerraProof<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">
          <span className="location-dot" />
          <div>
            Rice in Albay<small>Philippines</small>
          </div>
        </div>
        <nav aria-label="Workspace">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={view === tab.id ? "nav-active" : ""}
              aria-current={view === tab.id ? "page" : undefined}
              onClick={() => {
                setView(tab.id);
                setMenu(false);
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <FlaskConical size={20} />
          <strong>Based on past weather</strong>
          <p>
            Explore past seasons to prepare for planting. These results do not
            predict your harvest.
          </p>
          <button className="text-button" onClick={() => setView("evidence")}>
            About these results <ArrowRight size={15} />
          </button>
        </div>
        <div className="sidebar-footer">
          TerraProof <span>v0.1</span>
        </div>
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <button
            className="menu-button"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <span>
            Planning workspace{" "}
            <span className="breadcrumb">
              / {tabs.find((t) => t.id === view)?.label}
            </span>
          </span>
          <span className="local-status">
            <span /> Local workspace
          </span>
        </header>
        <main className="sheet" id="workspace">
          <div className="page-heading">
            <div>
              <h1>
                {view === "compare"
                  ? "Compare two planting dates"
                  : view === "economics"
                    ? "Estimate your costs and income"
                    : view === "evidence"
                      ? "Where the numbers come from"
                      : "Your saved comparisons."}
              </h1>
              <p>
                {view === "compare"
                  ? "Choose two sowing dates. See how hot days and heavy rain differed in past years."
                  : view === "economics"
                    ? "Enter your expected harvest, selling price and costs for each plan."
                    : view === "evidence"
                      ? "Sources, rules and limits behind every result."
                      : "Reopen the exact history and assumptions you reviewed."}
              </p>
            </div>
            <div className="heading-actions">
              {result && (
                <button
                  className="button secondary"
                  onClick={() =>
                    downloadJSON(result, "terraproof-comparison.json")
                  }
                  disabled={!!busy || dirty}
                >
                  <Download size={16} /> Download results
                </button>
              )}
              <button
                className="button secondary"
                disabled={!request || !!busy}
                onClick={() => void run(true)}
              >
                <Save size={16} /> Save comparison
              </button>
            </div>
          </div>
          {error && (
            <div className="message error" role="alert">
              <strong>Couldn’t complete that action.</strong> {error}
              <button
                className="text-button"
                onClick={() => void (request ? run() : initialize())}
              >
                Retry
              </button>
            </div>
          )}
          {notice && (
            <div className="message success" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {busy && (
            <div className="message loading" role="status">
              <span className="loading-dot" />
              {busy}…
            </div>
          )}
          {dirty && (
            <div className="message pending" role="status">
              You have changed the inputs. Update the comparison to see your new
              results.
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() => void run()}
              >
                Update results
              </button>
            </div>
          )}
          {!request && !busy && (
            <div className="empty-state">
              <h2>The workspace is not connected</h2>
              <p>Start the Python server, then retry to load the pilot.</p>
              <button className="button" onClick={() => void initialize()}>
                Retry connection
              </button>
            </div>
          )}

          {view === "compare" && request && (
            <>
              <div
                className="quick-start"
                aria-label="How to compare planting dates"
              >
                <span>
                  <b>1</b> Choose two dates
                </span>
                <span>
                  <b>2</b> Compare past weather
                </span>
                <span>
                  <b>3</b> Check costs &amp; income
                </span>
              </div>
              <div className="context-line">
                <span>
                  <MapPin size={15} /> Near Legazpi, Albay · {request.latitude}°
                  N, {request.longitude}° E
                </span>
                <span>Dates count from sowing seeds</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                <div className="plan-grid">
                  {request.plans.map((plan, i) => (
                    <PlanEditor
                      key={i}
                      plan={plan}
                      index={i}
                      update={(p) =>
                        change({
                          ...request,
                          plans: request.plans.map((s, j) => (i === j ? p : s)),
                        })
                      }
                    />
                  ))}
                </div>
                <div className="replay-controls">
                  <div className="year-controls">
                    <Field label="First year">
                      <input
                        type="number"
                        min={request.source === "bundled" ? 2015 : 1981}
                        max={2024}
                        required
                        value={request.start_year}
                        onChange={(e) =>
                          change({ ...request, start_year: +e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Last year">
                      <input
                        type="number"
                        min={request.start_year}
                        max={2024}
                        required
                        value={request.end_year}
                        onChange={(e) =>
                          change({ ...request, end_year: +e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <p>
                    Same past years.
                    <br />A fair comparison of both dates.
                  </p>
                  <button
                    className="button primary"
                    disabled={!!busy}
                    type="submit"
                  >
                    <Play size={15} /> Compare weather
                  </button>
                </div>
              </form>
              {result && (
                <>
                  <section className="results-section">
                    <div className="section-heading">
                      <div>
                        <h2>How did the two dates compare?</h2>
                        <p>
                          {common} years with weather data for both plans ·{" "}
                          {result.request.start_year}–{result.request.end_year}
                        </p>
                      </div>
                      <Field label="Weather to compare">
                        <select
                          value={metric}
                          onChange={(e) =>
                            setMetric(e.target.value as typeof metric)
                          }
                        >
                          <option value="heavy_rain_days">
                            Heavy-rain days (20 mm or more)
                          </option>
                          <option value="heat_days">
                            Hot days ({result.request.heat_threshold_c} °C or
                            more)
                          </option>
                        </select>
                      </Field>
                    </div>
                    {common === 0 && (
                      <p className="message pending">
                        No common complete seasons. Summary averages are
                        unavailable; inspect source coverage.
                      </p>
                    )}
                    <div className="plain-results">
                      {result.plans.map((plan, i) => (
                        <article
                          key={plan.name}
                          className={`result-card result-${i}`}
                        >
                          <span>
                            Plan {String.fromCharCode(65 + i)} · {plan.name}
                          </span>
                          <strong>
                            {number(plan.average[metric])}{" "}
                            <small>days per season</small>
                          </strong>
                          <p>
                            {metric === "heat_days"
                              ? `At ${result.request.heat_threshold_c} °C or hotter`
                              : "With 20 mm of rain or more"}
                          </p>
                        </article>
                      ))}
                    </div>
                    <p className="result-explainer">
                      These are averages from past years, not a forecast.
                      Compare both weather measures before making a decision.
                    </p>
                    <div className="results-grid">
                      <div>
                        <div className="chart-legend">
                          {result.plans.map((p, i) => (
                            <span key={p.name}>
                              <i className={`swatch bar-${i}`} />
                              {p.name}
                            </span>
                          ))}
                          <small>Days per season</small>
                        </div>
                        <YearChart result={result} metric={metric} />
                      </div>
                      <div className="comparison-summary">
                        <h3>Average days per season</h3>
                        <table>
                          <thead>
                            <tr>
                              <th>Indicator</th>
                              {result.plans.map((p, i) => (
                                <th key={p.name} title={p.name}>
                                  Plan {String.fromCharCode(65 + i)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              [
                                "heat_days",
                                `Heat ≥${result.request.heat_threshold_c} °C`,
                              ],
                              [
                                "reproductive_heat_days",
                                "Hot days during flowering",
                              ],
                              ["heavy_rain_days", "Rain ≥20 mm"],
                              [
                                "longest_dry_spell_days",
                                "Longest run of dry days",
                              ],
                            ].map(([key, label]) => (
                              <tr key={key}>
                                <th scope="row">
                                  {label}
                                  <small>days / season</small>
                                </th>
                                {result.plans.map((p) => (
                                  <td key={p.name}>{number(p.average[key])}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="muted">
                          Fewer hot or rainy days does not guarantee a better
                          harvest.
                        </p>
                      </div>
                    </div>
                    <details className="year-table">
                      <summary>
                        View exact values for all planting years
                      </summary>
                      <div
                        className="table-wrap"
                        tabIndex={0}
                        role="region"
                        aria-label="Scrollable evidence table"
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>Planting year</th>
                              {result.plans.map((p) => (
                                <th key={p.name}>{p.name} · days</th>
                              ))}
                              <th>Data for both plans</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.plans[0].seasons.map((s) => (
                              <tr key={s.year}>
                                <th scope="row">{s.year}</th>
                                {result.plans.map((p) => (
                                  <td key={p.name}>
                                    {number(
                                      p.seasons.find((t) => t.year === s.year)!
                                        .summary[metric],
                                      0,
                                    )}
                                  </td>
                                ))}
                                <td>
                                  {result.common_complete_years.includes(s.year)
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </section>
                  <details className="season-section season-disclosure">
                    <summary>Explore dates and weather within a season</summary>
                    <div className="section-heading">
                      <div>
                        <h2>Look closer at one season</h2>
                        <p>
                          See when hot days and heavy rain occurred during
                          growth.
                        </p>
                      </div>
                      <div className="inline-fields">
                        <Field label="Plan">
                          <select
                            value={planIndex}
                            onChange={(e) => setPlanIndex(+e.target.value)}
                          >
                            {result.plans.map((p, i) => (
                              <option key={p.name} value={i}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Year">
                          <select
                            value={year}
                            onChange={(e) => setYear(+e.target.value)}
                          >
                            {result.plans[0].seasons.map((s) => (
                              <option key={s.year}>{s.year}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </div>
                    {selected && (
                      <SeasonEvidence
                        season={selected}
                        threshold={result.request.heat_threshold_c}
                      />
                    )}
                  </details>
                  <div className="next-step">
                    <div>
                      <h2>What would each plan cost?</h2>
                      <p>
                        Add your expected harvest and expenses to compare
                        income.
                      </p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => setView("economics")}
                    >
                      Estimate costs &amp; income <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="closing-note">
                    <BookOpen size={18} />
                    <p>
                      Weather comes from NASA estimates near Legazpi. Conditions
                      on your farm may differ.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setView("evidence")}
                    >
                      Sources & limits <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {view === "economics" && request && (
            <>
              <div className="context-line">
                <span>
                  Amounts in Philippine pesos · replace the examples with your
                  own numbers
                </span>
                <span>
                  Expected harvest is your estimate, not a prediction.
                </span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                <div className="economics-grid">
                  {request.plans.map((plan, i) => (
                    <section className="economic-plan" key={i}>
                      <h2>
                        <span className={`plan-mark plan-${i}`}>
                          {String.fromCharCode(65 + i)}
                        </span>{" "}
                        {plan.name}
                      </h2>
                      <div className="economics-fields">
                        {economicFields.map(([key, label, min, max]) => (
                          <Field key={key} label={`${plan.name}: ${label}`}>
                            <input
                              type="number"
                              required
                              step="0.01"
                              min={min}
                              max={max}
                              value={plan.economics[key]}
                              onChange={(e) =>
                                change({
                                  ...request,
                                  plans: request.plans.map((p, j) =>
                                    i === j
                                      ? {
                                          ...p,
                                          economics: {
                                            ...p.economics,
                                            [key]: +e.target.value,
                                          },
                                        }
                                      : p,
                                  ),
                                })
                              }
                            />
                          </Field>
                        ))}
                      </div>
                      <Field label="Date of your estimate">
                        <input
                          type="date"
                          required
                          value={plan.economics.assumption_date}
                          onChange={(e) =>
                            change({
                              ...request,
                              plans: request.plans.map((p, j) =>
                                i === j
                                  ? {
                                      ...p,
                                      economics: {
                                        ...p.economics,
                                        assumption_date: e.target.value,
                                      },
                                    }
                                  : p,
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label="Market or source of your prices">
                        <input
                          required
                          maxLength={200}
                          value={plan.economics.market}
                          onChange={(e) =>
                            change({
                              ...request,
                              plans: request.plans.map((p, j) =>
                                i === j
                                  ? {
                                      ...p,
                                      economics: {
                                        ...p.economics,
                                        market: e.target.value,
                                      },
                                    }
                                  : p,
                              ),
                            })
                          }
                        />
                      </Field>
                      {result && (
                        <div className="money-summary">
                          <span>Estimated income after costs</span>
                          <strong>{peso(result.plans[i].economics.net)}</strong>
                          <dl>
                            <div>
                              <dt>Harvest sales</dt>
                              <dd>{peso(result.plans[i].economics.revenue)}</dd>
                            </div>
                            <div>
                              <dt>Total costs</dt>
                              <dd>
                                {peso(result.plans[i].economics.total_cost)}
                              </dd>
                            </div>
                            <div>
                              <dt>Break-even selling price / kg</dt>
                              <dd>
                                {peso(
                                  result.plans[i].economics
                                    .break_even_price_php_kg,
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Break-even yield / ha</dt>
                              <dd>
                                {number(
                                  result.plans[i].economics
                                    .break_even_yield_t_ha,
                                  3,
                                )}{" "}
                                t
                              </dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </section>
                  ))}
                </div>
                <div className="form-footer">
                  <p>
                    Revenue = hectares × tonnes per hectare × 1,000 × PHP per
                    kilogram.
                    <br />
                    Net return = revenue − itemized costs. No price or yield
                    forecast is implied.
                  </p>
                  <button className="button primary" disabled={!!busy}>
                    Update estimate
                  </button>
                </div>
              </form>
            </>
          )}

          {view === "evidence" && request && (
            <>
              <section className="method-intro">
                <div>
                  <h2>The same past weather for both plans</h2>
                  <p>
                    Each plan is applied to the same past planting years. We
                    count exposure within approximate crop stages and keep the
                    daily values available for inspection.
                  </p>
                </div>
                <div className="status-panel">
                  <FlaskConical size={20} />
                  <div>
                    <strong>Outcome models: not deployed</strong>
                    <p>
                      The research pipeline requires measured yield, consent,
                      documented location linkage, and independent time and
                      location holdouts. There are no supplied field labels.
                    </p>
                  </div>
                </div>
              </section>
              <section className="method-row">
                <div>
                  <h2>Source & coverage</h2>
                  <p>Albay demonstration point, not a provincial average.</p>
                </div>
                <div>
                  {result && (
                    <dl className="source-list">
                      <div>
                        <dt>Dataset</dt>
                        <dd>
                          <a
                            href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            NASA POWER daily meteorology
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt>Years compared</dt>
                        <dd>
                          {result.request.start_year}–{result.request.end_year}{" "}
                          planting years
                        </dd>
                      </div>
                      <div>
                        <dt>Grid resolution</dt>
                        <dd>{result.provenance.spatial_resolution}</dd>
                      </div>
                      <div>
                        <dt>Day boundary</dt>
                        <dd>
                          Local solar time (LST), not Philippine civil time
                        </dd>
                      </div>
                      <div>
                        <dt>Retrieved</dt>
                        <dd>{result.provenance.retrieved_at}</dd>
                      </div>
                      <div>
                        <dt>Quality</dt>
                        <dd>
                          {result.quality.flagged_days} flagged /{" "}
                          {result.quality.expected_days} source days; missing
                          readings left blank
                        </dd>
                      </div>
                      <div>
                        <dt>Download fingerprint</dt>
                        <dd className="digest">{result.provenance.sha256}</dd>
                      </div>
                    </dl>
                  )}
                  <details>
                    <summary>Change historical source settings</summary>
                    <p>
                      Bundled mode works offline at the pilot point. Live mode
                      retrieves NASA POWER for a point within the pilot bounding
                      box; it may take several minutes.
                    </p>
                    <Field label="Data source">
                      <select
                        value={request.source}
                        onChange={(e) =>
                          change({
                            ...request,
                            source: e.target.value as Request["source"],
                            ...(e.target.value === "bundled"
                              ? {
                                  latitude: 13.1391,
                                  longitude: 123.7438,
                                  start_year: Math.max(
                                    2015,
                                    request.start_year,
                                  ),
                                }
                              : {}),
                          })
                        }
                      >
                        <option value="bundled">
                          Saved NASA data (works offline)
                        </option>
                        <option value="live">
                          Fetch data from NASA (internet needed)
                        </option>
                      </select>
                    </Field>
                    <div className="input-pair">
                      <Field label="Latitude">
                        <input
                          disabled={request.source === "bundled"}
                          type="number"
                          step="0.0001"
                          min={12.7}
                          max={13.6}
                          value={request.latitude}
                          onChange={(e) =>
                            change({ ...request, latitude: +e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Longitude">
                        <input
                          disabled={request.source === "bundled"}
                          type="number"
                          step="0.0001"
                          min={123.2}
                          max={124.2}
                          value={request.longitude}
                          onChange={(e) =>
                            change({ ...request, longitude: +e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <button
                      className="button secondary"
                      disabled={!!busy}
                      onClick={() => void run()}
                    >
                      Apply source settings
                    </button>
                  </details>
                </div>
              </section>
              <section className="method-row">
                <div>
                  <h2>Thresholds & interpretation</h2>
                  <p>
                    Published evidence informs the indicators. It does not
                    validate farm-level damage predictions.
                  </p>
                </div>
                <div>
                  {result &&
                    Object.entries(result.rules).map(([key, rule]) => (
                      <article className="rule" key={key}>
                        <h3>
                          {key === "heat"
                            ? `Heat screening: Tmax ≥${result.request.heat_threshold_c} °C`
                            : key === "heavy_rain"
                              ? "Heavy rain: ≥20 mm/day"
                              : "Dry day: <1 mm/day"}
                        </h3>
                        <p>{rule.limitation}</p>
                        <a href={rule.source} target="_blank" rel="noreferrer">
                          {key === "heat"
                            ? "Jagadish et al. (2007)"
                            : "ETCCDI indicator definitions"}{" "}
                          <span aria-hidden="true">↗</span>
                        </a>
                      </article>
                    ))}
                  <Field
                    label="Count a day as hot at (°C)"
                    hint="Starts at 35 °C. This is a weather indicator, not a damage prediction for your variety."
                  >
                    <input
                      type="number"
                      step="0.1"
                      min={30}
                      max={42}
                      value={request.heat_threshold_c}
                      onChange={(e) =>
                        change({
                          ...request,
                          heat_threshold_c: +e.target.value,
                        })
                      }
                    />
                  </Field>
                  <button
                    className="button secondary"
                    disabled={!!busy}
                    onClick={() => void run()}
                  >
                    Apply threshold
                  </button>
                </div>
              </section>
              <section className="method-row">
                <div>
                  <h2>What this tool cannot tell you</h2>
                </div>
                <div>
                  <p>
                    Soil moisture, irrigation adequacy, typhoon wind, crop
                    rotation, cultivar-specific losses and future prices need
                    their own data and validation. Rainfall alone cannot answer
                    these questions.
                  </p>
                  <p>
                    TerraProof is a rice-calendar subset of the 2026 Field Shift
                    challenge. Broader rotation decisions need soil, management,
                    farmer priorities and multiple locally reviewed crop
                    calendars.
                  </p>
                  <a
                    href="https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the NASA Space Apps challenge ↗
                  </a>
                </div>
              </section>
            </>
          )}

          {view === "saved" && (
            <>
              <div className="save-title">
                {request && (
                  <Field label="Comparison title">
                    <input
                      maxLength={100}
                      value={request.title}
                      onChange={(e) =>
                        change({ ...request, title: e.target.value })
                      }
                    />
                  </Field>
                )}
                <p>
                  Saved locally on this computer. Export a JSON file to retain a
                  portable copy.
                </p>
              </div>
              {saved.length === 0 ? (
                <div className="empty-state">
                  <FolderOpen size={30} />
                  <h2>No saved comparisons yet</h2>
                  <p>
                    Replay your planting plans, then save the comparison with
                    its source evidence.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => setView("compare")}
                  >
                    Return to planting comparison
                  </button>
                </div>
              ) : (
                <div className="saved-list">
                  {saved.map((s) => (
                    <article key={s.id}>
                      <div>
                        <h2>{s.title}</h2>
                        <p>{new Date(s.created_at).toLocaleString("en-PH")}</p>
                      </div>
                      <div className="row-actions">
                        <button
                          className="button secondary"
                          disabled={!!busy}
                          onClick={() => void openSaved(s.id)}
                        >
                          Open comparison
                        </button>
                        <a
                          className="button secondary"
                          href={`/api/comparisons/${s.id}/daily.csv`}
                        >
                          <Download size={16} /> Daily CSV
                        </a>
                        <button
                          className="icon-button"
                          disabled={!!busy}
                          aria-label={`Delete ${s.title}`}
                          onClick={() => void remove(s.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {savedId && (
                <p className="muted">Current saved record: {savedId}</p>
              )}
            </>
          )}
          <footer className="sheet-footer">
            <span>Built on NASA Earth science data.</span>
            <span>Past weather · Your own cost estimates</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
