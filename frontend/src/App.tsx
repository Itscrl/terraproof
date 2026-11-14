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
  { id: "compare", label: "Planting comparison", icon: CalendarDays },
  { id: "economics", label: "Farm economics", icon: Wallet },
  { id: "evidence", label: "Evidence & methods", icon: BookOpen },
  { id: "saved", label: "Saved comparisons", icon: FolderOpen },
] as const;
const economicFields: [keyof Economics, string, number, number][] = [
  ["area_ha", "Area (ha)", 0.01, 10000],
  ["yield_t_ha", "Assumed yield (t/ha)", 0, 30],
  ["price_php_kg", "Selling price (PHP/kg)", 0, 1000],
  ["seeds_php_ha", "Seeds (PHP/ha)", 0, 1e7],
  ["fertilizer_php_ha", "Fertilizer (PHP/ha)", 0, 1e7],
  ["labor_php_ha", "Labor (PHP/ha)", 0, 1e7],
  ["irrigation_php_ha", "Irrigation (PHP/ha)", 0, 1e7],
  ["other_php_ha", "Other costs (PHP/ha)", 0, 1e7],
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
        : "Replaying historical seasons",
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
            Albay rice pilot<small>Philippines</small>
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
          <strong>Evidence before advice</strong>
          <p>
            Historical replay is available. Predictive crop outcomes still
            require field validation.
          </p>
          <button className="text-button" onClick={() => setView("evidence")}>
            Read the methods <ArrowRight size={15} />
          </button>
        </div>
        <div className="sidebar-footer">
          TerraProof MVP <span>v0.1</span>
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
                  ? "A season starts with a choice."
                  : view === "economics"
                    ? "Make the assumptions yours."
                    : view === "evidence"
                      ? "Follow the evidence."
                      : "Your saved comparisons."}
              </h1>
              <p>
                {view === "compare"
                  ? "Compare rice planting dates against the same climate history."
                  : view === "economics"
                    ? "Separate the climate question from the cost of growing."
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
                  <Download size={16} /> Export JSON
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
              You have changed the inputs. Results below still show the last
              replay.
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
              <div className="context-line">
                <span>
                  <MapPin size={15} /> Albay pilot point · {request.latitude}°
                  N, {request.longitude}° E
                </span>
                <span>Rice · approximate stages from sowing</span>
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
                    <Field label="From planting year">
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
                    <Field label="To planting year">
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
                    One historical window.
                    <br />
                    Two calendars. No forecast.
                  </p>
                  <button
                    className="button primary"
                    disabled={!!busy}
                    type="submit"
                  >
                    <Play size={15} /> Replay seasons
                  </button>
                </div>
              </form>
              {result && (
                <>
                  <section className="results-section">
                    <div className="section-heading">
                      <div>
                        <h2>What changes with the calendar?</h2>
                        <p>
                          {common} complete years shared by every plan ·{" "}
                          {result.request.start_year}–{result.request.end_year}
                        </p>
                      </div>
                      <Field label="Compare exposure">
                        <select
                          value={metric}
                          onChange={(e) =>
                            setMetric(e.target.value as typeof metric)
                          }
                        >
                          <option value="heavy_rain_days">
                            Rain ≥20 mm days
                          </option>
                          <option value="heat_days">
                            Tmax ≥{result.request.heat_threshold_c} °C days
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
                        <h3>Season averages</h3>
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
                              ["reproductive_heat_days", "Reproductive heat"],
                              ["heavy_rain_days", "Rain ≥20 mm"],
                              ["longest_dry_spell_days", "Longest dry spell"],
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
                          Exposure does not establish crop damage or identify a
                          winning plan.
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
                              <th>Shared complete year</th>
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
                  <section className="season-section">
                    <div className="section-heading">
                      <div>
                        <h2>Inside a growing season</h2>
                        <p>
                          Trace each indicator to the crop stage and daily
                          record.
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
                  </section>
                  <div className="closing-note">
                    <BookOpen size={18} />
                    <p>
                      NASA POWER grid estimates, not field measurements. Heat is
                      a screening proxy; rain does not measure flooding or
                      typhoon winds.
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
                <span>PHP · editable scenario assumptions</span>
                <span>
                  Yield is entered by you; exposure does not change it.
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
                      <Field label="Assumption date">
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
                      <Field label="Market / source of assumptions">
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
                          <span>Scenario net return</span>
                          <strong>{peso(result.plans[i].economics.net)}</strong>
                          <dl>
                            <div>
                              <dt>Gross revenue</dt>
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
                    Recalculate assumptions
                  </button>
                </div>
              </form>
            </>
          )}

          {view === "evidence" && request && (
            <>
              <section className="method-intro">
                <div>
                  <h2>A transparent historical replay</h2>
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
                        <dt>Replay period</dt>
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
                          {result.quality.expected_days} source days; no
                          imputation
                        </dd>
                      </div>
                      <div>
                        <dt>Payload SHA-256</dt>
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
                        <option value="bundled">Bundled NASA snapshot</option>
                        <option value="live">Live NASA POWER request</option>
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
                    label="Heat screening threshold (°C)"
                    hint="Default 35 °C is a configurable proxy, not a cultivar-specific injury threshold."
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
                  <h2>What remains outside this MVP</h2>
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
            <span>Historical exposure · Independent economic assumptions</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
