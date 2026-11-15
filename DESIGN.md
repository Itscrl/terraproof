---
name: TerraProof
description: A globe-first regional soil evidence workspace with a retained climate planning view.
colors:
  ground: "#f1f5f2"
  surface: "#fff"
  raised: "#f6f8f7"
  ink: "#18221e"
  muted: "#59665f"
  line: "#e4e9e6"
  accent: "#246c61"
  focus: "#126a82"
  field-border: "#cdd6d0"
  field-hover: "#8b9e91"
  button-hover: "#edf2ef"
  primary-hover: "#32453a"
  nav-hover: "#e8eeea"
  nav-active: "#e0e7e2"
  chart-comparison: "#bdc9c0"
  chart-third: "#716f51"
  chart-fourth: "#3f6171"
  stage-vegetative: "#d4e3db"
  stage-reproductive: "#89b3a1"
  stage-ripening: "#e3e9df"
  stage-ink: "#193d32"
  error-bg: "#fff0ec"
  error-ink: "#802e24"
  pending-bg: "#faf5e7"
  pending-ink: "#73571e"
  success-bg: "#eaf4ee"
  success-ink: "#285e3e"
  loading-bg: "#eef3f1"
  loading-ink: "#3d5e4d"
  globe-ground: "#101816"
  globe-base: "#314b46"
  selection: "#65cbb4"
  map-control: "#24332c"
  map-control-border: "#4f6258"
  map-credit: "#d2dcd6"
typography:
  property-value:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "20px"
    fontWeight: 500
  soil-action:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "14px"
    fontWeight: 500
  headline:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.4
  subheading:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "14px"
    fontWeight: 500
  body:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  button:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "13px"
    fontWeight: 500
  table:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "13px"
    fontWeight: 400
  micro:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "11px"
    fontWeight: 400
  amount:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "30px"
    fontWeight: 500
rounded:
  map-control: "5px"
  map: "10px"
  strip: "3px"
  badge: "4px"
  control: "6px"
  panel: "8px"
  sheet: "16px"
spacing:
  compact: "8px"
  field: "12px"
  group: "16px"
  section: "20px"
  column: "24px"
  wide: "48px"
components:
  soil-assess:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.soil-action}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    width: "100%"
  soil-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "7px 9px"
  region-action:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  region-action-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
  soil-property:
    textColor: "{colors.ink}"
    padding: "12px 0"
  globe-panel:
    backgroundColor: "{colors.globe-ground}"
    rounded: "{rounded.map}"
    height: "650px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.button-hover}"
  button-text:
    textColor: "{colors.ink}"
    padding: "4px 0"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
    height: "39px"
  navigation-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 10px"
  plan-badge:
    textColor: "{colors.accent}"
    rounded: "{rounded.badge}"
    width: "23px"
    height: "23px"
  plan-panel:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.panel}"
    padding: "17px 20px 14px"
  calendar-strip:
    rounded: "{rounded.strip}"
    height: "25px"
---

# Design System: TerraProof

## Overview

**Creative North Star: "The Regional Evidence Sheet"**

A green-grey workspace frames a white evidence sheet. Quiet ink, restrained teal and self-hosted IBM Plex Sans preserve TerraProof's working character while natural Earth imagery gives geographic context. The default entry is a globe beside region controls and a soil report, with the selected rectangle as the working object.

The journey is global globe → region → evidence-backed soil profile. Regional SoilGrids predictions, NASA wetness at the centroid and historical WoSIS point observations remain visually separate. Values carry their units, source scale, coverage and limits; the interface offers neither pinpoint diagnosis nor a universal soil-quality grade. The earlier paired-calendar interface remains a secondary workspace at `?workspace=planning`, available only when the host allows private planning.

**Key Characteristics:**

- Green-grey frame and white evidence sheet.
- Interactive Earth with a restrained teal region overlay.
- Flat report rows, fine separators and explicit units.
- Regional predictions, centroid context and historical measurements presented separately.
- Globe-first mobile stacking and keyboard coordinate entry.
- Retained calendar planning patterns scoped to the secondary workspace.

This document records `SoilExplorer.tsx`, `SoilGlobe.tsx`, `RootApp.tsx`, `soil.css` and the retained planning files `styles.css`, `components.tsx` and `App.tsx` under `frontend/src/`. The five reviewed soil captures cover initial desktop, assessed desktop, 768px, 390px and 320px. The sidecar's synthesized tonal ramps are preview metadata, not additional application tokens.

## Colors

The palette combines low-chroma green neutrals with a restrained teal data accent. The frontmatter is the normative token inventory.

### Primary

- **Evidence Teal** (`accent`): active region-selection action, surface-wetness bars, links, current navigation underline, brand mark and caret; also first-plan chart bars in planning.
- **Quiet Ink** (`ink`): primary text, map toolbar and filled assessment action; also the retained replay action. Its hover companion gives the primary button visible feedback.
- **Focus Blue-Teal** (`focus`): keyboard focus outlines, distinct from the resting accent.

### Secondary

- **Comparison Sage** (`chart-comparison`): root-zone wetness bars and retained second-plan bars, with text legends.
- **Muted Olive / Slate Blue** (`chart-third`, `chart-fourth`): additional plan series.
- **Crop Stages** (`stage-vegetative`, `stage-reproductive`, `stage-ripening`): the three calendar-strip segments, with dark stage text and visible day counts.

- **Region Mint** (`selection`): translucent globe rectangle, with a white outline; 25% opacity during preview and 30% after selection. It is a boundary marker, not a soil classification.

### Neutral

- **Green-Grey Ground** (`ground`): application frame and mobile navigation.
- **White Sheet** (`surface`): main work surface, fields and secondary actions.
- **Raised Mist** (`raised`): calendar editors, economic panels and evidence status containers.
- **Muted Ink / Fine Line** (`muted`, `line`): supporting text and structural separators.
- **Control and Navigation States**: field-border, field-hover, button-hover, nav-hover and nav-active distinguish interaction states without introducing visual elevation.

**Globe Ground / Base** (`globe-ground`, `globe-base`) support the imagery canvas and unloaded Earth. Map controls use their dark fill and border; source credits use the light map-credit token. NASA GIBS Blue Marble is static reference imagery, explicitly labeled as not a live camera.

Error, pending, success and loading pairs apply only to their matching message states. Messages include readable text and semantic alert/status roles.

**The Evidence Label Rule.** Keep property units, series names, region bounds and source scale alongside color; color alone does not explain a result.

## Typography

**Display and Body Font:** IBM Plex Sans, with sans-serif fallback. The application self-hosts the Latin font assets through Fontsource imports at weights 400, 500 and 600. There is no separate decorative display face.

The type is compact and workmanlike. Tabular numerals are enabled at the root so chart values, dates and currency comparisons remain aligned. The retained planning provenance digest uses the system monospace family.

### Hierarchy

- **Headline:** page title; the mobile override reduces it to 24px.
- **Title:** section headings.
- **Subheading:** compact summary headings; plan legends and saved-item titles use 16px.
- **Body:** descriptive paragraphs, with the paragraph line-height captured in frontmatter.
- **Label:** field labels and supporting information.
- **Button:** medium-weight action labels.
- **Table:** data cells; table headers use the micro scale and normal weight.
- **Micro:** chart years, units, stage labels and footer metadata.
- **Property value:** regional medians in expandable report rows, with smaller unit text.
- **Soil action:** full-width assessment action.
- **Amount:** retained economic subtotal; reduced to 28px on planning mobile. Wetness last-day numbers independently use 30px at regular weight.

Brand lettering uses 24px at weight 600 with slightly tightened tracking; the soil header reduces it to 23px at 540px and below. The retained narrow planning sidebar uses 22px. These are observed roles, not a mathematical type scale.

## Layout

### Default global soil explorer

A compact horizontal header precedes the rounded white workspace. At the 1440px review viewport, the source uses a 360px report rail beside a flexible globe, a 24px gap, 12px workspace side margins and 28px 24px 32px workspace padding. The globe is sticky at 16px and 650px tall. Region controls precede the soil report in the rail; NASA wetness, historical measurements and methods sit below the globe/report grid.

| Condition | Implemented soil behavior |
| --- | --- |
| At least 1550px | Workspace caps at 1760px; report rail becomes 384px and globe height becomes 720px. |
| 1440px baseline | Flexible globe plus 360px rail; 650px globe height. This is a review viewport, not a media-query breakpoint. |
| At most 1100px | Rail becomes 320px with a 20px grid gap; globe is 620px tall; workspace padding becomes 24px 20px; scope note is hidden. |
| At most 800px | Globe precedes the rail; it becomes non-sticky and 480px tall. Controls and report share two rail columns. Header navigation wraps to its own row; wetness and methods stack. |
| At most 540px | Rail becomes one column; globe is 400px tall. Workspace has 16px side padding and rounded top corners. Fields and map actions have a 44px minimum height. Lab headings, method summaries and footer stack. |
| 320px verification | Uses the same at-most-540px rules, with no dedicated 320px query. Coordinate and depth/date fields retain two columns; property names wrap while values and units stay together. |

The opening 1440px comment in `soil.css` is not the sizing authority; the declarations above are the implemented values. Coordinate editing does not move the camera. The report remains visible when selections change, with an explicit stale-report notice and assessed bounds.

Historical laboratory tables retain a 550px minimum width inside named, keyboard-focusable scroll regions. The current soil implementation does not reuse the planning stage-table scroll cue.

### Retained climate planning workspace

The following layout applies only to `?workspace=planning`, not the default globe entry. Public-mode hosts hide its navigation link and deny access to private planning records.

The planning desktop view uses a sticky sidebar (228px wide, viewport height), a top bar (64px high), and a fluid white sheet. The sheet has an outer border, a 16px corner, an 8px right/bottom inset and default padding of 30px 32px 20px.

Plan and economics editors use two equal, shrinkable columns with a 24px gutter. Results use a wider chart beside the summary table, with a 28px gap. Method sections pair explanatory text and evidence using uneven columns. Tables align text labels left and numerical columns right.

Responsive behavior follows the implemented media queries:

| Condition | Observed behavior |
| --- | --- |
| At least 1600px | Sheet padding grows to 36px 48px; chart/summary ratio becomes 1.5:1 and the chart grows. |
| At most 1200px | Heading actions move below the title; results become one column; sheet padding becomes 26px 24px. |
| At most 900px | Sidebar narrows to 200px; plan, economics and method grids become one column; saved rows and footer stack. |
| At most 680px | Sidebar becomes a toggled 250px fixed panel below a 56px top bar; sheet is edge-to-edge with 23px 18px 20px padding and no outer rounding. Plan gaps reduce to 16px, replay fills the width, stage inputs stack and action groups wrap. |

The desktop editor's month/day pair retains a 100px day column. Mobile economics fields retain two columns. Evidence tables scroll inside their own container; on mobile they retain a 470px minimum width while the compact averages table can fit its container.

The stage evidence table displays “Scroll horizontally to see all stage indicators.” at mobile widths. Scroll regions are focusable and named for assistive technology. Keep this cue next to the table it describes.

## Elevation & Depth

The interface uses tonal layering and thin borders rather than box shadows. The application frame, white sheet and pale editor panels establish grouping without implying floating cards. The default soil navigation uses an underline for the current view. Globe controls and hints overlay imagery with solid backgrounds; no backdrop blur or box shadow is added. In the retained planning view, navigation hover and selection use background changes. Its mobile navigation overlays the sheet at z-index 10; the focusable skip link sits above it at z-index 20.

There are no decorative transition effects. Requested globe focus uses a one-second camera flight with padding to preserve geographic context, reduced to zero duration when reduced motion is requested. Returning to the globe is immediate. The retained planning loading dot pulses over 1.3 seconds with ease-in-out, and the reduced-motion query disables it.

## Shapes

The globe clips to a 10px rounded rectangle. Toolbar controls use 5px corners; the mobile sheet uses 12px top corners. The selection uses a translucent geographic rectangle with a white outline and a 2px boundary polyline. Controls and messages have gently curved corners; panels are a little softer, and the desktop sheet has the broadest corner. Calendar strips are clipped into a shallow rounded rectangle with small gaps between proportional segments. Plan identifiers are square badges with a fine outline. Status dots are circles. Tables use horizontal separators without a surrounding card treatment.

## Components

### Globe Selection and Camera Controls

Earth starts at a global view using NASA GIBS Blue Marble reference imagery. “Draw a region” becomes “Cancel selection,” exposes `aria-pressed`, applies the teal selected fill and switches the canvas cursor from grab to crosshair. Drawing disables camera rotation while retaining zoom. The first click anchors a corner; pointer movement previews the rectangle; the opposite-corner click updates bounds and exits drawing.

Cancel clears the in-progress anchor and preview without replacing the existing region. “View selection” explicitly focuses valid bounds; “Globe view” returns to the global view and exits drawing. “Albay example” restores example bounds and focuses them. Coordinate edits update bounds without automatically moving the camera. Focus keeps at least 0.25° padding around the region, reflecting the imagery's regional role.

The globe description points keyboard users to coordinate fields; the skip link targets region controls. Imagery failure retains selection and numerical analysis, while a WebGL-start failure directs users to coordinate entry. Do not describe canvas pointer selection as the keyboard path.

### Region Controls and Assessment

Native coordinate fields and depth/date controls have visible labels with a 6px gap. Soil fields are 40px tall with 7px 9px padding and 13px type; at 540px and below they grow to a 44px minimum and 14px type. Input focus uses a 2px outline with 2px offset. Soil buttons, links and summaries use a 3px focus offset.

The full-width ink assessment action has a 44px minimum height. It shows retrieval text while busy and disables invalid or concurrent submission; disabled soil buttons use 0.55 opacity and a not-allowed cursor. Validation explains ordered bounds, the 30° per-side limit, latitude limits and date-line splitting. Soil maps are labeled long-term predictions; the date control applies to NASA wetness only. Retry, stale-result, unavailable-source and partial-coverage states remain explicit.

### Eight-Property Soil Report

Eight expandable rows present pH in water, soil organic carbon, clay, sand, silt, cation exchange capacity, bulk density and total nitrogen. Each summary pairs a wrapping label and plus/minus indicator with a prominent median and small unit. Fine horizontal rules separate rows; there are no rating badges or confidence meters.

Expanded rows show explanatory text, sampled spatial P10–P90, valid/total samples, sampled coverage, native 250m grid and source/retrieval information, or an explicit unavailability reason. The report uses a polite live region with busy state, includes assessed bounds/depth and provides JSON export.

**The Regional Evidence Rule.** Spatial P10–P90 describes variation across sampled map predictions, not confidence intervals or field accuracy. Do not present regional medians as pinpoint soil diagnoses. Total nitrogen is not plant-available nitrogen; carbon concentration is not organic matter percentage; CEC is not available N/P/K.

### NASA Centroid Wetness

This separate section identifies NASA POWER, the selected date span, relative wetness on a 0–1 scale and the 0.5° × 0.625° source grid. Paired bars use teal for surface and sage for root zone. Missing values use dashed empty bars and a labeled missing key, with em dashes for absent last-day numbers. The source is centroid context, not a regional average or fertility grade. Daily values remain in the JSON export. Failure here does not invalidate independent soil-map results.

### Historical WoSIS Measurements

“Published soil measurements” is a separate section below mapped soil and wetness evidence. Expandable method rows distinguish Olsen, Bray I and Mehlich 3 extractable phosphorus, and saturated-paste electrical conductivity. Point samples within bounds and overlapping depth retain their extraction method, sample date, profile and source; methods are not merged.

Empty results explicitly mean no compatible published CC-BY observations, not zero concentration. Unavailability, overlapping rather than exact depth intervals, positional uncertainty, licences and the 64-record truncation limit remain visible in the appropriate text or export. These historical observations are not current regional measurements and can overlap SoilGrids training data; they do not independently validate TerraProof.

### Global Header and Empty Report

The horizontal header uses a text-and-icon current view with a teal underline, a conditional link to climate/economics and a sources anchor. The empty report is left-aligned explanatory text with a compact list of expected evidence, on the white sheet. It does not borrow the centered planning empty-state panel.

### Retained Planning Components

The following primitives remain in `?workspace=planning`; their original tokens are preserved for that view.

#### Planning Buttons

Primary actions use quiet ink with white text; secondary actions use a white surface and fine control border. Both have a minimum height of 38px and compact icon/label spacing. Hover changes the fill. Text actions use an underline and compact padding; icon-only buttons retain accessible labels. Disabled buttons use half opacity and a waiting cursor.

All focus-visible elements receive a 2px focus outline; buttons, links and fields offset it by 4px. Mobile heading actions reduce label size and padding and wrap when needed. There is no custom active-press animation.

#### Planning Fields

Inputs and native selects use white surfaces, fine borders and control corners. A label sits above each field with a 7px gap. Optional help text uses muted ink and a relaxed line-height. Hover strengthens the field border; focus uses the shared outline. Disabled inputs use a muted background. Native validation and select behavior remain visible.

#### Planning Navigation

Workspace navigation uses icon-and-label buttons in a vertical list with a 6px gap. Hover adds a pale fill; the selected view uses the stronger neutral fill, dark text, medium weight and `aria-current="page"`. The mobile menu button exposes its expanded state and toggles the fixed navigation panel.

#### Panels and Plan Badges

Calendar editors are fieldsets with legends, pale backgrounds and panel corners. Desktop padding is captured in the component token; at 900px and below it becomes 18px. Economic panels use 22px padding, reduced to 18px on mobile. The A/B plan badge identifies the calendar in text as well as color; B uses a quieter grey border and text. These badges are identifiers, not filter chips.

#### Paired Calendar Strips

Each strip has three segments weighted by stage duration, with visible day counts and a stage-name legend. The full strip has an accessible description listing stage names and durations. A native disclosure reveals editable calendar details.

#### Planning Charts and Evidence Tables

Year bars share one scale and show plan-colored series with a text legend. The chart has an accessible image description directing readers to exact values. Tables preserve readable headers, units and missing-value notation; narrow screens reveal remaining columns through the named, focusable scroll region. Stage evidence retains its mobile scroll cue.

#### Planning Messages and Empty States

Messages use a matching background/text color pair and wrap at narrow widths. Loading uses the small pulsing dot; success/loading/pending are status regions and errors are alerts. Empty states sit on a pale panel with a centered title, explanation and action. Supporting evidence notes are quiet grouped content, with links to sources and limits.

## Do's and Don'ts

### Do:

- **Do** preserve the green-grey frame, white sheet, IBM Plex Sans and quiet teal across both workspaces.
- **Do** lead the default entry with the globe and selected-region report; scope the sidebar and calendars to planning.
- **Do** keep regional map predictions, NASA centroid wetness and historical WoSIS observations separate.
- **Do** retain source scale, sampled coverage, missing values, assessed bounds and stale-result notices.
- **Do** use self-hosted IBM Plex Sans and tabular numbers for the working interface.
- **Do** retain plan names, units and exact-value tables alongside chart colors.
- **Do** keep keyboard focus visible and scrollable evidence regions named and focusable.
- **Do** retain the mobile horizontal-scroll cue beside the stage evidence table.
- **Do** keep source limits and the distinction between exposure and economics visible.

### Don't:

- **Don't** claim field accuracy percentages, confidence intervals from spatial P10–P90, pinpoint diagnoses or a universal soil-quality score.
- **Don't** imply the Blue Marble reference imagery is live or that historical WoSIS samples validate current regional predictions.
- **Don't** add shadows or decorative gradients to the existing panel hierarchy.
- **Don't** encode a winning plan or predicted crop damage through the comparison palette.
- **Don't** shrink wide evidence tables until their units and dates become unreadable.
- **Don't** replace visible field labels with placeholder-only controls.
- **Don't** add motion that ignores the existing reduced-motion preference.


## Guided rotation extension

Existing palette and typography are retained. The flow uses three ordered user
steps, native labeled selectors with 46px controls and 16px explanatory text.
Three sequence articles read vertically on mobile, with the current plan first;
there is no computed winner or decorative score. Text explains every status and
names checks before action. The primary download is readable text; technical JSON
is secondary. Inputs changing invalidate downloads and visibly mark older results.
