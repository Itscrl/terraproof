---
name: TerraProof
description: A calm planning workspace for historical rice-calendar comparisons.
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
typography:
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

**Creative North Star: "The Field Planning Sheet"**

A green-grey workspace frames a white working sheet. Quiet ink, restrained teal marks and compact IBM Plex Sans typography keep the interface practical for farmers and extension advisers working through historical evidence.

The recurring visual signature is a pair of crop calendars with proportional stage strips, followed by shared-year comparisons. Color identifies plans and stages; labels, units and tables carry the meaning. The visual system keeps historical exposure and independent economic assumptions legible without presenting either as a validated crop prediction.

**Key Characteristics:**

- Green-grey frame and white working sheet.
- Flat, softly rounded groups with fine separators.
- Compact labels, tabular numbers and explicit units.
- Teal climate marks paired with muted comparison colors.
- Responsive stacking with discoverable, keyboard-accessible evidence tables.

This document records the implemented system in `frontend/src/styles.css`, `frontend/src/components.tsx` and `frontend/src/App.tsx`. The comparison captures at desktop and mobile widths confirm the framed-sheet and stacked layouts. The sidecar's tonal ramps are preview metadata, not additional application tokens.

## Colors

The palette combines low-chroma green neutrals with a restrained teal data accent. The frontmatter is the normative token inventory.

### Primary

- **Climate Teal** (`accent`): first-plan chart bars, links, brand mark, caret and plan identification.
- **Quiet Ink** (`ink`): primary text and the filled replay action. Its hover companion gives the primary button visible feedback.
- **Focus Blue-Teal** (`focus`): keyboard focus outlines, distinct from the resting accent.

### Secondary

- **Comparison Sage** (`chart-comparison`): second-plan bars, with the plan name retained in the legend.
- **Muted Olive / Slate Blue** (`chart-third`, `chart-fourth`): additional plan series.
- **Crop Stages** (`stage-vegetative`, `stage-reproductive`, `stage-ripening`): the three calendar-strip segments, with dark stage text and visible day counts.

### Neutral

- **Green-Grey Ground** (`ground`): application frame and mobile navigation.
- **White Sheet** (`surface`): main work surface, fields and secondary actions.
- **Raised Mist** (`raised`): calendar editors, economic panels and evidence status containers.
- **Muted Ink / Fine Line** (`muted`, `line`): supporting text and structural separators.
- **Control and Navigation States**: field-border, field-hover, button-hover, nav-hover and nav-active distinguish interaction states without introducing visual elevation.

Error, pending, success and loading pairs apply only to their matching message states. Messages include readable text and semantic alert/status roles.

**The Evidence Label Rule.** Keep plan names, stage labels and units alongside color; color alone does not explain a result.

## Typography

**Display and Body Font:** IBM Plex Sans, with sans-serif fallback. The application self-hosts the Latin font assets through Fontsource imports at weights 400, 500 and 600. There is no separate decorative display face.

The type is compact and workmanlike. Tabular numerals are enabled at the root so chart values, dates and currency comparisons remain aligned. The provenance digest alone uses the system monospace family.

### Hierarchy

- **Headline:** page title; the mobile override reduces it to 24px.
- **Title:** section headings.
- **Subheading:** compact summary headings; plan legends and saved-item titles use 16px.
- **Body:** descriptive paragraphs, with the paragraph line-height captured in frontmatter.
- **Label:** field labels and supporting information.
- **Button:** medium-weight action labels.
- **Table:** data cells; table headers use the micro scale and normal weight.
- **Micro:** chart years, units, stage labels and footer metadata.
- **Amount:** economic subtotal; reduced to 28px on mobile.

Brand lettering uses 24px at weight 600 with slightly tightened tracking; the narrow sidebar reduces it to 22px. These are observed roles, not a mathematical type scale.

## Layout

The desktop app uses a sticky sidebar (228px wide, viewport height), a top bar (64px high), and a fluid white sheet. The sheet has an outer border, a 16px corner, an 8px right/bottom inset and default padding of 30px 32px 20px.

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

The interface uses tonal layering and thin borders rather than box shadows. The application frame, white sheet and pale editor panels establish grouping without implying floating cards. Navigation hover and selection use background changes. The mobile navigation overlays the sheet at z-index 10; the focusable skip link sits above it at z-index 20.

There are no decorative transition effects. The loading dot pulses over 1.3 seconds with ease-in-out, and the reduced-motion query disables animation.

## Shapes

Controls and messages have gently curved corners; panels are a little softer, and the desktop sheet has the broadest corner. Calendar strips are clipped into a shallow rounded rectangle with small gaps between proportional segments. Plan identifiers are square badges with a fine outline. Status dots are circles. Tables use horizontal separators without a surrounding card treatment.

## Components

### Buttons

Primary actions use quiet ink with white text; secondary actions use a white surface and fine control border. Both have a minimum height of 38px and compact icon/label spacing. Hover changes the fill. Text actions use an underline and compact padding; icon-only buttons retain accessible labels. Disabled buttons use half opacity and a waiting cursor.

All focus-visible elements receive a 2px focus outline; buttons, links and fields offset it by 4px. Mobile heading actions reduce label size and padding and wrap when needed. There is no custom active-press animation.

### Fields

Inputs and native selects use white surfaces, fine borders and control corners. A label sits above each field with a 7px gap. Optional help text uses muted ink and a relaxed line-height. Hover strengthens the field border; focus uses the shared outline. Disabled inputs use a muted background. Native validation and select behavior remain visible.

### Navigation

Workspace navigation uses icon-and-label buttons in a vertical list with a 6px gap. Hover adds a pale fill; the selected view uses the stronger neutral fill, dark text, medium weight and `aria-current="page"`. The mobile menu button exposes its expanded state and toggles the fixed navigation panel.

### Panels and Plan Badges

Calendar editors are fieldsets with legends, pale backgrounds and panel corners. Desktop padding is captured in the component token; at 900px and below it becomes 18px. Economic panels use 22px padding, reduced to 18px on mobile. The A/B plan badge identifies the calendar in text as well as color; B uses a quieter grey border and text. These badges are identifiers, not filter chips.

### Paired Calendar Strips

Each strip has three segments weighted by stage duration, with visible day counts and a stage-name legend. The full strip has an accessible description listing stage names and durations. A native disclosure reveals editable calendar details.

### Charts and Evidence Tables

Year bars share one scale and show plan-colored series with a text legend. The chart has an accessible image description directing readers to exact values. Tables preserve readable headers, units and missing-value notation; narrow screens reveal remaining columns through the named, focusable scroll region. Stage evidence retains its mobile scroll cue.

### Messages and Empty States

Messages use a matching background/text color pair and wrap at narrow widths. Loading uses the small pulsing dot; success/loading/pending are status regions and errors are alerts. Empty states sit on a pale panel with a centered title, explanation and action. Supporting evidence notes are quiet grouped content, with links to sources and limits.

## Do's and Don'ts

### Do:

- **Do** preserve the green-grey frame, white sheet and flat pale panels.
- **Do** use self-hosted IBM Plex Sans and tabular numbers for the working interface.
- **Do** retain plan names, units and exact-value tables alongside chart colors.
- **Do** keep keyboard focus visible and scrollable evidence regions named and focusable.
- **Do** retain the mobile horizontal-scroll cue beside the stage evidence table.
- **Do** keep source limits and the distinction between exposure and economics visible.

### Don't:

- **Don't** add shadows or decorative gradients to the existing panel hierarchy.
- **Don't** encode a winning plan or predicted crop damage through the comparison palette.
- **Don't** shrink wide evidence tables until their units and dates become unreadable.
- **Don't** replace visible field labels with placeholder-only controls.
- **Don't** add motion that ignores the existing reduced-motion preference.

