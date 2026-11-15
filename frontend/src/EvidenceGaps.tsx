import { ArrowDownToLine } from "lucide-react";
import type { SoilReport } from "./soil-types";

export default function EvidenceGaps({ report }: { report: SoilReport }) {
  const missingMaps = report.properties.filter(
    (item) => item.status !== "available",
  );
  const phosphorus =
    report.laboratory_references
      ?.filter((item) => item.id !== "elcosp")
      .reduce((sum, item) => sum + item.observations.length, 0) ?? 0;
  const salinity =
    report.laboratory_references?.find((item) => item.id === "elcosp")
      ?.observations.length ?? 0;
  const phosphorusUnavailable = report.laboratory_references?.some(
    (item) => item.id !== "elcosp" && item.status === "unavailable",
  );
  const salinityUnavailable =
    report.laboratory_references?.find((item) => item.id === "elcosp")
      ?.status === "unavailable";
  function downloadChecklist() {
    const text = [
      "TERRAPROOF — FIELD CHECKLIST",
      "Regional predictions are a starting point, not a laboratory diagnosis.",
      `Selected box: west ${report.region.west}, south ${report.region.south}, east ${report.region.east}, north ${report.region.north}`,
      `Map horizon: ${report.region.depth}. This is not a full root-zone survey.`,
      "",
      "Ask a local agricultural extension adviser or accredited soil laboratory:",
      "1. What sampling pattern and crop-specific depth represent this field? Keep different soil/management zones separate.",
      "2. Can you test pH in water, plant-available nitrogen, extractable phosphorus and exchangeable potassium using locally calibrated methods?",
      "3. Can you test electrical conductivity/salinity and report the extraction method (for example saturated-paste ECe)?",
      "4. What do field drainage, rooting depth, compaction and irrigation reliability imply for the crop?",
      "5. Which local cultivar and planting calendar fit the site? Check local pest, flood, storm and frost advice near planting.",
      "",
      "Keep sample dates, GPS location, depth, units, laboratory methods and management history with the results.",
      "Different phosphorus/salinity methods cannot be compared or converted blindly. No fertiliser dose follows from this checklist.",
      "Scientific context: https://www.nrcs.usda.gov/conservation-basics/soil/soil-health/soil-health-assessment",
      "Crop/water modeling inputs: https://www.fao.org/aquacrop/overview/input-requirements/",
      "",
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "terraproof-soil-test-checklist.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="evidence-gaps" aria-labelledby="evidence-gaps-title">
      <div className="soil-section-title">
        <h2 id="evidence-gaps-title">
          What do we know—and what should I check?
        </h2>
        <button type="button" onClick={downloadChecklist}>
          <ArrowDownToLine size={16} /> Soil-test checklist
        </button>
      </div>
      <p>
        “Missing” means we do not have enough suitable evidence. It does not
        mean zero nutrients, dry soil or land that cannot be farmed.
      </p>
      <dl className="evidence-next-steps">
        <div>
          <dt>Soil-map estimates</dt>
          <dd>
            {report.properties.length - missingMaps.length} of{" "}
            {report.properties.length} properties returned.{" "}
            {missingMaps.length
              ? "A map source could not provide some values. Try a smaller box or retry later; the other estimates remain available."
              : "These are model estimates. A local soil test can check whether they represent your field."}
          </dd>
        </div>
        <div>
          <dt>Nutrients ready for the crop</dt>
          <dd>
            {phosphorus
              ? `${phosphorus} historical phosphorus observation(s) were returned, using separate lab methods. `
              : phosphorusUnavailable
                ? "Some historical phosphorus sources could not be checked. "
                : "No compatible historical phosphorus samples were returned for this box. "}
            Current plant-available nitrogen, phosphorus and potassium remain
            unknown. Ask a local laboratory for crop-appropriate tests before
            deciding on fertiliser.
          </dd>
        </div>
        <div>
          <dt>Salt and drainage</dt>
          <dd>
            {salinity
              ? `${salinity} older salinity observation(s) were returned. `
              : salinityUnavailable
                ? "The historical salinity source could not be checked. "
                : "No compatible historical salinity samples were returned. "}
            Ask about current salinity testing and check drainage in the field.
            A satellite image cannot establish these conditions.
          </dd>
        </div>
        <div>
          <dt>Water for the full season</dt>
          <dd>
            NASA wetness and rain describe broad environmental conditions. Check
            water access, storage and irrigation reliability. They are not
            measurements of water available to this crop’s roots.
          </dd>
        </div>
      </dl>
      <details className="guide-method">
        <summary>Why we do not fill the gaps with a guessed value</summary>
        <p>
          We use published regional predictions and compatible historical
          records where available. Replacing an unknown nutrient level with
          zero, a distant sample or an incompatible test could lead to the wrong
          crop or fertiliser decision. A trained gap-filling model would need
          independent laboratory data and regional evaluation first.
        </p>
        <p>
          The checklist records your region and specific questions to take to a
          laboratory or extension adviser.
        </p>
      </details>
      <details className="guide-method">
        <summary>
          Will my soil still be healthy after years of planting the same crop?
        </summary>
        <p>
          That is a question TerraProof should help you investigate over time.
          Today’s map and future climate simulations cannot answer it on their
          own. Repeated planting does not by itself prove that soil will
          decline; crop removal, nutrient inputs, residues, water, tillage and
          local soil conditions all matter.
        </p>
        <p>
          Save the plot in your <a href="#farm-notebook">field notebook</a>,
          record what you planted and how you managed it, and keep repeated soil
          tests with matching methods and depths. The crop guide can help you
          discuss alternatives; it does not yet simulate a rotation’s effect on
          future soil health.
        </p>
        <a
          href="https://www.fao.org/conservation-agriculture/overview/conservation-agriculture-principles/en"
          target="_blank"
          rel="noreferrer"
        >
          FAO guidance on crop diversification and soil management
        </a>
      </details>
    </section>
  );
}
