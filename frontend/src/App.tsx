import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  FolderOpen,
  Leaf,
  MapPin,
  Menu,
  Save,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import AlbayData from "./AlbayData";
import PlantingFlow from "./PlantingFlow";
import IncomeFlow from "./IncomeFlow";
import { api, downloadJSON } from "./api";
import { Field } from "./components";
import type { Request, Result, Saved } from "./types";

type View = "compare" | "economics" | "evidence" | "saved" | "data";
const tabs = [
  { id: "compare", label: "Compare dates", icon: CalendarDays },
  { id: "data", label: "Albay data", icon: MapPin },
  { id: "economics", label: "Costs & income", icon: Wallet },
  { id: "evidence", label: "How it works", icon: BookOpen },
  { id: "saved", label: "Saved comparisons", icon: FolderOpen },
] as const;

export default function App() {
  const [request, setRequest] = useState<Request>();
  const [result, setResult] = useState<Result>();
  const [view, setView] = useState<View>("compare");
  const [busy, setBusy] = useState("Loading NASA climate history");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [savedId, setSavedId] = useState("");
  const [hasCompared, setHasCompared] = useState(false);
  const [completedRuns, setCompletedRuns] = useState(0);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const heading = document.querySelector<HTMLHeadingElement>("#workspace h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus();
      window.scrollTo(0, 0);
    }
  }, [view]);
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
    if (!request) return false;
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
      setHasCompared(true);
      setCompletedRuns((n) => n + 1);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
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
      setHasCompared(true);
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
          {tabs
            .filter((tab) => ["compare", "economics", "saved"].includes(tab.id))
            .map((tab) => (
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
          <details className="support-tools">
            <summary>Data &amp; sources</summary>{" "}
            {tabs
              .filter((tab) => ["data", "evidence"].includes(tab.id))
              .map((tab) => (
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
          </details>
        </nav>
        <div className="sidebar-note">
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
            Your planting plan{" "}
            <span className="breadcrumb">
              / {tabs.find((t) => t.id === view)?.label}
            </span>
          </span>
          <span className="local-status">
            <span /> On this computer
          </span>
        </header>
        <main className="sheet" id="workspace">
          {view !== "compare" && view !== "economics" && (
            <div className="page-heading">
              <div>
                <h1>
                  {view === "data"
                    ? "Explore Albay rice data"
                    : view === "evidence"
                      ? "Where the numbers come from"
                      : "Your saved comparisons"}
                </h1>
                <p>
                  {view === "data"
                    ? "Local yield estimates and saved model experiments."
                    : view === "evidence"
                      ? "Sources and limits behind your comparison."
                      : "Reopen a comparison you saved on this computer."}
                </p>
              </div>
              {view !== "data" && (
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
              )}
            </div>
          )}
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
          {dirty && view !== "compare" && view !== "economics" && (
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

          {view === "data" && <AlbayData />}

          {view === "compare" && request && (
            <PlantingFlow
              request={request}
              result={result}
              busy={!!busy}
              dirty={dirty}
              initialStep={hasCompared ? 2 : 0}
              completedRuns={completedRuns}
              update={change}
              compare={() => run()}
              save={() => void run(true)}
              onCosts={() => setView("economics")}
            />
          )}
          {view === "economics" && request && (
            <IncomeFlow
              request={request}
              result={result}
              busy={!!busy}
              update={change}
              calculate={() => run()}
              onDates={() => setView("compare")}
            />
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
