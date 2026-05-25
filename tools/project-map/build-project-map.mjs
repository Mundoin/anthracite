#!/usr/bin/env node
// Build standalone interactive Anthracite project map (V1AT-era).
//
// Reads the Codex-extracted project-status source JSON, validates its
// shape, writes a snapshot for traceability, then generates a single
// standalone HTML file with the JSON embedded inline. No fetch, no
// CDN, no npm runtime dependency — the output must open directly
// from Windows file explorer.
//
// Run:
//   node tools/project-map/build-project-map.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");

const SOURCE_PATH = resolve(
  REPO_ROOT,
  "parser-lab",
  "_project_status_map",
  "anthracite-status-map-source.json",
);
const OUT_DIR = resolve(REPO_ROOT, "docs", "project-map");
const OUT_HTML = resolve(OUT_DIR, "anthracite-project-map.html");
const OUT_SNAPSHOT = resolve(OUT_DIR, "project-map-source.snapshot.json");

const REQUIRED_KEYS = [
  "metadata",
  "arcs",
  "stages",
  "current_state",
  "capability_map",
  "deferred_or_left_undone",
  "safety_boundaries",
  "open_questions",
];

function fail(msg) {
  console.error(`build-project-map: ${msg}`);
  process.exit(1);
}

if (!existsSync(SOURCE_PATH)) {
  fail(`source JSON not found at ${SOURCE_PATH}`);
}

const rawText = readFileSync(SOURCE_PATH, "utf8");
let data;
try {
  data = JSON.parse(rawText);
} catch (err) {
  fail(`source JSON failed to parse: ${err.message}`);
}

for (const key of REQUIRED_KEYS) {
  if (!(key in data)) {
    fail(`source JSON missing required key: ${key}`);
  }
}

// Light shape checks; do not mutate source.
if (!Array.isArray(data.stages) || data.stages.length === 0) {
  fail("stages must be a non-empty array");
}
if (!Array.isArray(data.arcs) || data.arcs.length === 0) {
  fail("arcs must be a non-empty array");
}

mkdirSync(OUT_DIR, { recursive: true });

// Snapshot first — reproducible record of the input that produced
// this HTML. Pretty-printed for diff-friendliness.
writeFileSync(OUT_SNAPSHOT, JSON.stringify(data, null, 2) + "\n", "utf8");

// Build manifest carried in the HTML page footer for traceability.
const buildManifest = {
  generated_at_utc: new Date().toISOString(),
  generator: "tools/project-map/build-project-map.mjs",
  source_path: "parser-lab/_project_status_map/anthracite-status-map-source.json",
  snapshot_path: "docs/project-map/project-map-source.snapshot.json",
  source_metadata: data.metadata ?? null,
};

// Embed JSON safely inside a <script> tag. Escapes < / > / &, and the
// two U+2028 / U+2029 line separators that valid JSON does not escape
// but that break inline scripts when interpreted as JS line terminators.
const LS_RE = new RegExp(String.fromCharCode(0x2028), "g");
const PS_RE = new RegExp(String.fromCharCode(0x2029), "g");
function htmlSafeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LS_RE, "\\u2028")
    .replace(PS_RE, "\\u2029");
}

/* eslint-disable */ /* dead-code-removed: see htmlSafeJson above */ function _ignored1_DEAD() { /* removed */ } /*
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/ /g, "\\u2028")
    .replace(/ /g, "\\u2029");
}

function _htmlSafeJsonOld(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/ /g, "\\u2028")
    .replace(/ /g, "\\u2029");
}

*/

function rel(p) {
  return p.replace(REPO_ROOT + "\\", "").replace(REPO_ROOT + "/", "");
}

function main() {
  const html = renderHtml(data, buildManifest);
  writeFileSync(OUT_HTML, html, "utf8");

  const stats = {
    stages: data.stages.length,
    arcs: data.arcs.length,
    capabilities: (data.capability_map ?? []).length,
    deferred: (data.deferred_or_left_undone ?? []).length,
    safety_boundaries: (data.safety_boundaries ?? []).length,
    open_questions: (data.open_questions ?? []).length,
    dependency_edges: (data.dependency_edges ?? []).length,
    halted: (data.halted_or_superseded ?? []).length,
    next_candidates: (data.next_candidates ?? []).length,
  };

  console.log("Anthracite project map generated.");
  console.log(`  source:   ${rel(SOURCE_PATH)}`);
  console.log(`  snapshot: ${rel(OUT_SNAPSHOT)}`);
  console.log(`  output:   ${rel(OUT_HTML)}`);
  console.log("");
  console.log("  counts:");
  for (const [k, v] of Object.entries(stats)) {
    console.log(`    ${k.padEnd(20)} ${v}`);
  }
}

// ---------------------------------------------------------------------
// HTML renderer
// ---------------------------------------------------------------------

function renderHtml(payload, manifest) {
  const dataJson = htmlSafeJson(payload);
  const manifestJson = htmlSafeJson(manifest);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Anthracite V1 Project Map</title>
<style>${CSS}</style>
</head>
<body>
<header class="apm-header">
  <div class="apm-header-row">
    <h1 class="apm-title">Anthracite V1 Project Map</h1>
    <div class="apm-header-meta" id="apm-header-meta"></div>
  </div>
  <p class="apm-header-note">
    Generated visualisation. Source of truth is
    <code>parser-lab/_project_status_map/anthracite-status-map-source.json</code>.
    Update the source JSON, then re-run
    <code>node tools/project-map/build-project-map.mjs</code>.
  </p>
</header>

<section class="apm-summary" id="apm-summary"></section>

<nav class="apm-tabs" role="tablist" id="apm-tabs"></nav>

<section class="apm-controls">
  <div class="apm-controls-row">
    <label class="apm-control">
      <span class="apm-control-label">Search</span>
      <input type="text" id="apm-search" class="apm-input" placeholder="stage id, capability, text…" />
    </label>
    <div class="apm-control apm-control--chips">
      <span class="apm-control-label">Status</span>
      <div class="apm-chip-row" id="apm-status-chips"></div>
    </div>
    <div class="apm-control apm-control--chips">
      <span class="apm-control-label">Arc</span>
      <div class="apm-chip-row" id="apm-arc-chips"></div>
    </div>
    <button class="apm-reset" id="apm-reset" type="button">Reset filters</button>
  </div>
</section>

<main class="apm-main" id="apm-main"></main>

<aside class="apm-detail" id="apm-detail" aria-hidden="true">
  <div class="apm-detail-inner">
    <button class="apm-detail-close" id="apm-detail-close" type="button">Close</button>
    <div id="apm-detail-content"></div>
  </div>
</aside>

<footer class="apm-footer" id="apm-footer"></footer>

<script id="apm-data" type="application/json">${dataJson}</script>
<script id="apm-manifest" type="application/json">${manifestJson}</script>
<script>${JS}</script>
</body>
</html>
`;
}

// CSS — vanilla, no external font, no CDN. Industrial light tone.
const CSS = `
:root {
  --apm-ivory: #f5f1e6;
  --apm-ivory-2: #ece6d4;
  --apm-paper: #fbf8f0;
  --apm-line: #d8d1bd;
  --apm-line-soft: #e3ddca;
  --apm-text-1: #1d242c;
  --apm-text-2: #43505b;
  --apm-text-3: #6a7682;
  --apm-accent: #2b4a6a;
  --apm-done: #3a6a4b;
  --apm-current: #a26b18;
  --apm-prep: #2f5a82;
  --apm-planned: #5a3c7a;
  --apm-deferred: #5d5a52;
  --apm-halted: #8a2f2f;
  --apm-decision: #a85a18;
  --apm-safety: #6b1f1f;
  --apm-mono: ui-monospace, "Cascadia Mono", "Consolas", "Menlo", monospace;
  --apm-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--apm-ivory);
  color: var(--apm-text-1);
  font-family: var(--apm-sans);
  font-size: 13px;
  line-height: 1.4;
}
code { font-family: var(--apm-mono); font-size: 12px; }
.apm-header {
  background:
    repeating-linear-gradient(
      to right,
      transparent 0 24px,
      rgba(0,0,0,0.018) 24px 25px
    ),
    var(--apm-paper);
  border-bottom: 1px solid var(--apm-line);
  padding: 14px 22px 10px;
}
.apm-header-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}
.apm-title {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.apm-header-meta {
  font-size: 11px;
  color: var(--apm-text-3);
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-family: var(--apm-mono);
}
.apm-header-meta span { white-space: nowrap; }
.apm-header-meta strong {
  color: var(--apm-text-2);
  font-weight: 600;
}
.apm-header-note {
  margin: 6px 0 0 0;
  font-size: 11px;
  color: var(--apm-text-3);
}
.apm-header-note code {
  background: var(--apm-ivory-2);
  padding: 1px 4px;
  border: 1px solid var(--apm-line-soft);
}
.apm-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  padding: 10px 22px;
  background: var(--apm-paper);
  border-bottom: 1px solid var(--apm-line);
}
.apm-summary-card {
  border: 1px solid var(--apm-line);
  padding: 8px 10px;
  background: var(--apm-ivory);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.apm-summary-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--apm-text-3);
}
.apm-summary-value {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--apm-text-1);
  font-weight: 600;
}
.apm-summary-sub {
  font-size: 11px;
  color: var(--apm-text-2);
  font-family: var(--apm-mono);
}
.apm-tabs {
  display: flex;
  gap: 0;
  background: var(--apm-paper);
  border-bottom: 1px solid var(--apm-line);
  padding: 0 22px;
  overflow-x: auto;
}
.apm-tab {
  appearance: none;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  color: var(--apm-text-2);
  padding: 10px 14px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}
.apm-tab:hover { color: var(--apm-text-1); }
.apm-tab[aria-selected="true"] {
  color: var(--apm-text-1);
  border-bottom-color: var(--apm-accent);
  font-weight: 600;
}
.apm-controls {
  background: var(--apm-paper);
  border-bottom: 1px solid var(--apm-line);
  padding: 8px 22px;
}
.apm-controls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px 16px;
}
.apm-control {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.apm-control-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--apm-text-3);
}
.apm-input {
  font-family: inherit;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--apm-line);
  background: var(--apm-paper);
  color: var(--apm-text-1);
  min-width: 240px;
}
.apm-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.apm-chip {
  appearance: none;
  border: 1px solid var(--apm-line);
  background: var(--apm-paper);
  font-family: inherit;
  font-size: 11px;
  color: var(--apm-text-2);
  padding: 2px 8px;
  cursor: pointer;
}
.apm-chip[aria-pressed="true"] {
  background: var(--apm-ivory-2);
  color: var(--apm-text-1);
  font-weight: 600;
}
.apm-reset {
  appearance: none;
  border: 1px solid var(--apm-line);
  background: var(--apm-paper);
  color: var(--apm-text-2);
  font-family: inherit;
  font-size: 11px;
  padding: 4px 10px;
  cursor: pointer;
  align-self: end;
}
.apm-reset:hover { background: var(--apm-ivory-2); }
.apm-main {
  padding: 14px 22px 64px;
  background: var(--apm-ivory);
  min-height: 50vh;
}
.apm-view-heading {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--apm-text-1);
  letter-spacing: 0.3px;
}
.apm-view-sub {
  font-size: 11px;
  color: var(--apm-text-3);
  margin: 0 0 10px;
}
.apm-swimlane {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 8px 12px;
  margin-bottom: 6px;
  align-items: start;
}
.apm-swimlane-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--apm-text-2);
  font-weight: 600;
  padding-top: 4px;
  border-right: 1px dashed var(--apm-line);
  padding-right: 8px;
}
.apm-swimlane-label small {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: var(--apm-text-3);
  text-transform: none;
  letter-spacing: 0;
  font-family: var(--apm-mono);
}
.apm-swimlane-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.apm-stage-chip {
  appearance: none;
  border: 1px solid var(--apm-line);
  background: var(--apm-paper);
  font-family: inherit;
  font-size: 11px;
  color: var(--apm-text-1);
  padding: 3px 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.apm-stage-chip:hover {
  background: var(--apm-ivory-2);
}
.apm-stage-chip[data-hidden="1"] {
  opacity: 0.25;
  pointer-events: none;
}
.apm-stage-chip-id {
  font-family: var(--apm-mono);
  font-size: 11px;
  font-weight: 600;
}
.apm-stage-chip-title {
  font-size: 11px;
  color: var(--apm-text-2);
}
.apm-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.apm-status-done { background: var(--apm-done); }
.apm-status-current { background: var(--apm-current); }
.apm-status-prep { background: var(--apm-prep); }
.apm-status-planned { background: var(--apm-planned); }
.apm-status-deferred { background: var(--apm-deferred); }
.apm-status-halted { background: var(--apm-halted); }
.apm-status-decision { background: var(--apm-decision); }
.apm-status-pill {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border: 1px solid currentColor;
  font-weight: 600;
}
.apm-status-pill--done    { color: var(--apm-done); }
.apm-status-pill--current { color: var(--apm-current); }
.apm-status-pill--prep    { color: var(--apm-prep); }
.apm-status-pill--planned { color: var(--apm-planned); }
.apm-status-pill--deferred{ color: var(--apm-deferred); }
.apm-status-pill--halted  { color: var(--apm-halted); }
.apm-status-pill--decision{ color: var(--apm-decision); }

.apm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: var(--apm-paper);
  border: 1px solid var(--apm-line);
}
.apm-table th, .apm-table td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--apm-line-soft);
  vertical-align: top;
}
.apm-table th {
  background: var(--apm-ivory-2);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--apm-text-2);
}
.apm-table tr:last-child td { border-bottom: 0; }
.apm-table-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.apm-table-list code {
  display: inline-block;
  padding: 1px 5px;
  border: 1px solid var(--apm-line);
  background: var(--apm-ivory);
}
.apm-group-heading {
  margin: 14px 0 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--apm-text-3);
}
.apm-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}
.apm-card {
  border: 1px solid var(--apm-line);
  background: var(--apm-paper);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.apm-card-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
}
.apm-card-sub {
  font-size: 11px;
  color: var(--apm-text-3);
}
.apm-card-body {
  font-size: 12px;
  color: var(--apm-text-2);
}
.apm-card-list {
  margin: 0;
  padding-left: 18px;
  font-size: 11px;
  color: var(--apm-text-2);
}
.apm-card--safety {
  border: 2px solid var(--apm-safety);
  background:
    repeating-linear-gradient(
      45deg,
      rgba(107, 31, 31, 0.04) 0 6px,
      transparent 6px 12px
    ),
    var(--apm-paper);
}
.apm-card--decision {
  border-left: 4px solid var(--apm-decision);
}
.apm-detail {
  position: fixed;
  top: 0;
  right: 0;
  width: min(420px, 92vw);
  height: 100vh;
  background: var(--apm-paper);
  border-left: 1px solid var(--apm-line);
  box-shadow: -4px 0 14px rgba(0,0,0,0.08);
  transform: translateX(100%);
  transition: transform 0.15s ease;
  overflow-y: auto;
  z-index: 50;
}
.apm-detail[data-open="1"] {
  transform: translateX(0);
}
.apm-detail-inner {
  padding: 14px 18px 40px;
}
.apm-detail-close {
  appearance: none;
  border: 1px solid var(--apm-line);
  background: var(--apm-paper);
  font-family: inherit;
  font-size: 11px;
  color: var(--apm-text-2);
  padding: 3px 9px;
  cursor: pointer;
  margin-bottom: 8px;
}
.apm-detail-h {
  margin: 0 0 4px;
  font-size: 15px;
}
.apm-detail-sub {
  font-size: 11px;
  color: var(--apm-text-3);
  margin-bottom: 8px;
  font-family: var(--apm-mono);
}
.apm-detail-section {
  margin-top: 10px;
}
.apm-detail-section h4 {
  margin: 0 0 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--apm-text-3);
}
.apm-detail-section ul,
.apm-detail-section ol {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--apm-text-2);
}
.apm-detail-section p {
  margin: 0;
  font-size: 12px;
  color: var(--apm-text-2);
}
.apm-source-ref {
  font-family: var(--apm-mono);
  font-size: 11px;
  color: var(--apm-text-2);
}
.apm-edges-svg {
  width: 100%;
  height: 480px;
  background: var(--apm-paper);
  border: 1px solid var(--apm-line);
}
.apm-edges-svg line {
  stroke: var(--apm-text-3);
  stroke-width: 1.2;
  opacity: 0.6;
}
.apm-edges-svg .apm-edge-label {
  font-family: var(--apm-mono);
  font-size: 10px;
  fill: var(--apm-text-3);
}
.apm-edges-svg circle {
  fill: var(--apm-paper);
  stroke: var(--apm-text-2);
  stroke-width: 1.4;
}
.apm-edges-svg text.apm-node-id {
  font-family: var(--apm-mono);
  font-size: 11px;
  fill: var(--apm-text-1);
  pointer-events: none;
}
.apm-edge-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 4px 14px;
  font-family: var(--apm-mono);
  font-size: 11px;
  color: var(--apm-text-2);
}
.apm-edge-list li {
  border-bottom: 1px dashed var(--apm-line-soft);
  padding: 2px 0;
}
.apm-evidence-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 4px 12px;
  font-family: var(--apm-mono);
  font-size: 11px;
  color: var(--apm-text-2);
}
.apm-footer {
  border-top: 1px solid var(--apm-line);
  background: var(--apm-paper);
  padding: 8px 22px;
  font-size: 11px;
  color: var(--apm-text-3);
  font-family: var(--apm-mono);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.apm-empty {
  font-size: 12px;
  color: var(--apm-text-3);
  font-style: italic;
  padding: 8px 0;
}
@media (max-width: 720px) {
  .apm-swimlane { grid-template-columns: 1fr; }
  .apm-swimlane-label { border-right: 0; border-bottom: 1px dashed var(--apm-line); padding-right: 0; padding-bottom: 4px; }
}

/* ---- Roadmap view ---- */
.apm-roadmap-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--apm-line);
  background: var(--apm-bg-2, var(--apm-bg));
  margin-bottom: 16px;
}
.apm-roadmap-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  align-items: center;
  font-size: 12px;
}
.apm-roadmap-count { color: var(--apm-text-3); }
.apm-roadmap-count strong { color: var(--apm-text-1, var(--apm-text-2)); margin-right: 4px; font-size: 14px; }
.apm-roadmap-count--done strong { color: #3a6a4b; }
.apm-roadmap-count--prog strong { color: #a26b18; }
.apm-roadmap-count--plan strong { color: var(--apm-text-3); }
.apm-roadmap-count--pct strong { color: #0E72A0; }
.apm-roadmap-actions { margin-left: auto; display: flex; gap: 6px; }
.apm-roadmap-btn {
  font: inherit;
  font-size: 11px;
  padding: 3px 8px;
  border: 1px solid var(--apm-line);
  background: transparent;
  color: var(--apm-text-2);
  cursor: pointer;
}
.apm-roadmap-btn:hover { background: var(--apm-bg-3, var(--apm-line)); }
.apm-roadmap-bar {
  position: relative;
  height: 6px;
  border: 1px solid var(--apm-line);
  background: var(--apm-bg);
  overflow: hidden;
}
.apm-roadmap-bar-done {
  position: absolute; top: 0; left: 0; bottom: 0;
  background: #3a6a4b;
}
.apm-roadmap-bar-prog {
  position: absolute; top: 0; bottom: 0;
  left: 0;
  background: #a26b18;
  mix-blend-mode: multiply;
  opacity: 0.55;
  margin-left: 0;
}
.apm-roadmap-bar-done + .apm-roadmap-bar-prog {
  /* prog overlays after done — JS sets widths separately; visually layered */
}

.apm-roadmap-block,
.apm-roadmap-campaign,
.apm-roadmap-endgame,
.apm-roadmap-tail {
  border: 1px solid var(--apm-line);
  padding: 12px 14px;
  margin-bottom: 14px;
  background: var(--apm-bg-2, var(--apm-bg));
}

.apm-roadmap-section-head {
  margin: 0 0 6px 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--apm-text-2);
  font-weight: 600;
}

.apm-roadmap-endgame-line {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--apm-text-1, var(--apm-text-2));
}
.apm-roadmap-endgame-sub {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--apm-text-2);
}
.apm-roadmap-endgame-questions {
  margin: 6px 0 6px 18px;
  padding: 0;
  font-size: 12px;
  color: var(--apm-text-2);
}
.apm-roadmap-endgame-questions li { margin: 2px 0; }
.apm-roadmap-endgame-loop {
  margin: 8px 0 0;
  font-size: 11px;
  font-family: var(--apm-font-mono, monospace);
  color: var(--apm-text-3);
  padding: 6px 8px;
  background: var(--apm-bg);
  border: 1px dashed var(--apm-line);
}

.apm-roadmap-lanes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.apm-roadmap-lane {
  border: 1px solid var(--apm-line);
  padding: 10px 12px;
  background: var(--apm-bg);
}
.apm-roadmap-lane-title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--apm-text-1, var(--apm-text-2));
}
.apm-roadmap-lane-goal {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--apm-text-2);
}
.apm-roadmap-lane-includes {
  margin: 0 0 0 16px;
  padding: 0;
  font-size: 11px;
  color: var(--apm-text-2);
}
.apm-roadmap-lane-includes li { margin: 1px 0; }

.apm-roadmap-campaign-head { margin-bottom: 8px; }
.apm-roadmap-campaign-theme,
.apm-roadmap-campaign-goal {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--apm-text-2);
}

.apm-roadmap-item {
  display: block;
  border: 1px solid var(--apm-line);
  padding: 8px 12px;
  margin: 6px 0;
  background: var(--apm-bg);
  cursor: pointer;
  transition: background 80ms, border-color 80ms;
  outline: none;
}
.apm-roadmap-item:hover,
.apm-roadmap-item:focus-visible {
  background: var(--apm-bg-3, var(--apm-line));
  border-color: var(--apm-text-3);
}

.apm-roadmap-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.apm-roadmap-tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--apm-text-3);
  font-size: 12px;
  font-weight: 600;
  color: var(--apm-text-3);
  background: var(--apm-bg);
}
.apm-roadmap-item-title {
  flex: 1;
  font-weight: 500;
  color: var(--apm-text-1, var(--apm-text-2));
}
.apm-roadmap-state {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border: 1px solid currentColor;
}
.apm-roadmap-state--planned { color: var(--apm-text-3); }
.apm-roadmap-state--in_progress { color: #a26b18; }
.apm-roadmap-state--done { color: #3a6a4b; }

.apm-roadmap-item--done {
  background: rgba(58, 106, 75, 0.06);
  border-left: 3px solid #3a6a4b;
}
.apm-roadmap-item--done .apm-roadmap-tick {
  color: #3a6a4b;
  border-color: #3a6a4b;
}
.apm-roadmap-item--done .apm-roadmap-item-title {
  text-decoration: line-through;
  text-decoration-color: rgba(58, 106, 75, 0.5);
  color: var(--apm-text-3);
}
.apm-roadmap-item--in_progress {
  background: rgba(162, 107, 24, 0.06);
  border-left: 3px solid #a26b18;
}
.apm-roadmap-item--in_progress .apm-roadmap-tick {
  color: #a26b18;
  border-color: #a26b18;
}

.apm-roadmap-item-body {
  margin: 6px 0 0 28px;
  font-size: 11px;
  color: var(--apm-text-2);
}
.apm-roadmap-item-body p { margin: 2px 0; }
.apm-roadmap-item-label {
  color: var(--apm-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
}
.apm-roadmap-item-notes {
  margin: 4px 0 0 18px;
  padding: 0;
}
.apm-roadmap-item-notes li { margin: 1px 0; }

.apm-roadmap-list { display: flex; flex-direction: column; }

.apm-roadmap-focus-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.apm-roadmap-focus-chip {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-family: var(--apm-font-mono, monospace);
  color: var(--apm-text-2);
  border: 1px solid var(--apm-line);
  background: var(--apm-bg);
}
`;

// JS — vanilla, no framework. Reads embedded JSON, renders 7 views,
// status + arc + text filtering, click-to-detail panel.
const JS = `
(() => {
  const data = JSON.parse(document.getElementById('apm-data').textContent);
  const manifest = JSON.parse(document.getElementById('apm-manifest').textContent);

  const STATUSES = ['done', 'current', 'prep', 'planned', 'deferred', 'halted', 'decision'];
  const STATUS_LABELS = {
    done: 'Landed',
    current: 'Current edge',
    prep: 'Prep / not integrated',
    planned: 'Planned',
    deferred: 'Deferred',
    halted: 'Halted / superseded',
    decision: 'Needs decision',
  };

  const VIEWS = [
    { id: 'arcs',       label: 'Arc Timeline' },
    { id: 'roadmap',    label: 'Roadmap' },
    { id: 'deps',       label: 'Dependency Map' },
    { id: 'caps',       label: 'Capability Matrix' },
    { id: 'deferred',   label: 'Deferred / Left Undone' },
    { id: 'safety',     label: 'Safety Boundaries' },
    { id: 'questions',  label: 'Open Questions' },
    { id: 'evidence',   label: 'Evidence / Sources' },
  ];

  // V1CA — Roadmap localStorage persistence. Each clickable item flips
  // between 'planned', 'in_progress', and 'done'. Stored under one key
  // so a reload restores progress.
  const ROADMAP_STORAGE_KEY = 'anthracite-roadmap-progress-v1';
  function loadRoadmapProgress() {
    try {
      const raw = localStorage.getItem(ROADMAP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  function saveRoadmapProgress(p) {
    try { localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(p)); } catch {}
  }
  function nextRoadmapState(curr) {
    if (curr === 'done') return 'planned';
    if (curr === 'in_progress') return 'done';
    return 'in_progress';
  }
  function roadmapStateLabel(s) {
    if (s === 'done') return 'done';
    if (s === 'in_progress') return 'in progress';
    return 'planned';
  }

  const state = {
    view: 'arcs',
    statusFilter: new Set(STATUSES),
    arcFilter: new Set((data.arcs || []).map(a => a.id)),
    text: '',
    selected: null,
  };

  // ---- helpers ----
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k.startsWith('data-')) node.setAttribute(k, v);
      else if (k === 'aria-selected' || k === 'aria-hidden' || k === 'aria-pressed') node.setAttribute(k, v);
      else if (v === true) node.setAttribute(k, '');
      else if (v !== false && v != null) node.setAttribute(k, v);
    }
    for (const c of children) {
      if (c == null || c === false) continue;
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    }
    return node;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function safeText(s) { return (s == null) ? '' : String(s); }
  function matchesText(haystack) {
    if (!state.text) return true;
    return haystack.toLowerCase().includes(state.text);
  }
  function stageById(id) {
    return (data.stages || []).find(s => s.id === id) || null;
  }
  function arcById(id) {
    return (data.arcs || []).find(a => a.id === id) || null;
  }
  function statusDot(status) {
    return el('span', { class: 'apm-status-dot apm-status-' + (status || 'deferred'), title: STATUS_LABELS[status] || status });
  }
  function statusPill(status) {
    const cls = 'apm-status-pill apm-status-pill--' + (status || 'deferred');
    return el('span', { class: cls }, STATUS_LABELS[status] || status || '?');
  }
  function passesFilters(stage) {
    if (!state.statusFilter.has(stage.status)) return false;
    if (stage.arc_id && !state.arcFilter.has(stage.arc_id)) return false;
    const hay = [stage.id, stage.title, stage.summary, stage.arc_id].filter(Boolean).join(' ');
    return matchesText(hay);
  }

  // ---- header + summary + tabs + filters ----
  function renderHeaderMeta() {
    const m = data.metadata || {};
    const cs = data.current_state || {};
    const node = document.getElementById('apm-header-meta');
    clear(node);
    const parts = [];
    if (cs.production_edge_stage) parts.push(['Current edge', cs.production_edge_stage]);
    if (cs.latest_prep_commit) parts.push(['Latest prep', cs.latest_prep_commit]);
    if (cs.working_tree) parts.push(['Working tree', cs.working_tree]);
    if (m.git_head) parts.push(['Source anchor', m.git_head.slice(0, 7)]);
    if (m.extracted_at_local) parts.push(['Extracted', m.extracted_at_local]);
    parts.forEach(([k, v]) => {
      node.appendChild(el('span', {}, el('strong', {}, k + ': '), safeText(v)));
    });
  }

  function renderSummary() {
    const root = clear(document.getElementById('apm-summary'));
    const stages = data.stages || [];
    const countBy = (s) => stages.filter(x => x.status === s).length;
    const cards = [
      ['Landed stages', countBy('done')],
      ['Current edge', (data.current_state && data.current_state.production_edge_stage) || '—', 'edge'],
      ['Prep items', countBy('prep')],
      ['Deferred items', (data.deferred_or_left_undone || []).length],
      ['Open questions', (data.open_questions || []).length],
      ['Safety boundaries', (data.safety_boundaries || []).length],
      ['Halted', countBy('halted')],
      ['Dependency edges', (data.dependency_edges || []).length],
    ];
    cards.forEach(([label, value, kind]) => {
      const card = el('div', { class: 'apm-summary-card' },
        el('span', { class: 'apm-summary-label' }, label),
        el(kind === 'edge' ? 'span' : 'span',
          { class: kind === 'edge' ? 'apm-summary-sub' : 'apm-summary-value' },
          String(value),
        ),
      );
      root.appendChild(card);
    });
  }

  function renderTabs() {
    const root = clear(document.getElementById('apm-tabs'));
    VIEWS.forEach(v => {
      const btn = el('button', {
        class: 'apm-tab',
        role: 'tab',
        type: 'button',
        'aria-selected': state.view === v.id ? 'true' : 'false',
        onclick: () => { state.view = v.id; renderTabs(); renderView(); },
      }, v.label);
      root.appendChild(btn);
    });
  }

  function renderFilters() {
    const statusRow = clear(document.getElementById('apm-status-chips'));
    STATUSES.forEach(s => {
      const pressed = state.statusFilter.has(s);
      statusRow.appendChild(el('button', {
        class: 'apm-chip',
        type: 'button',
        'aria-pressed': pressed ? 'true' : 'false',
        onclick: () => {
          if (state.statusFilter.has(s)) state.statusFilter.delete(s);
          else state.statusFilter.add(s);
          renderFilters();
          renderView();
        },
      }, statusDot(s), document.createTextNode(' '), document.createTextNode(STATUS_LABELS[s])));
    });

    const arcRow = clear(document.getElementById('apm-arc-chips'));
    (data.arcs || []).forEach(a => {
      const pressed = state.arcFilter.has(a.id);
      arcRow.appendChild(el('button', {
        class: 'apm-chip',
        type: 'button',
        'aria-pressed': pressed ? 'true' : 'false',
        title: a.summary || a.title,
        onclick: () => {
          if (state.arcFilter.has(a.id)) state.arcFilter.delete(a.id);
          else state.arcFilter.add(a.id);
          renderFilters();
          renderView();
        },
      }, a.title || a.id));
    });
  }

  // ---- views ----
  function renderView() {
    const root = clear(document.getElementById('apm-main'));
    switch (state.view) {
      case 'arcs':      return renderArcsView(root);
      case 'roadmap':   return renderRoadmapView(root);
      case 'deps':      return renderDepsView(root);
      case 'caps':      return renderCapsView(root);
      case 'deferred':  return renderDeferredView(root);
      case 'safety':    return renderSafetyView(root);
      case 'questions': return renderQuestionsView(root);
      case 'evidence':  return renderEvidenceView(root);
    }
  }

  // V1CA — 3-month roadmap with clickable per-item progress. Items
  // cycle: planned → in_progress → done → planned. State persists
  // in localStorage; reload restores progress.
  function renderRoadmapView(root) {
    const rm = data.roadmap || null;
    if (!rm) {
      root.appendChild(el('p', { class: 'apm-view-sub' },
        'No roadmap defined in the source JSON.'));
      return;
    }

    let progress = loadRoadmapProgress();

    const allItems = [];
    (rm.campaigns || []).forEach(c => (c.items || []).forEach(it => allItems.push(it.id)));
    (rm.next_ten_stages || []).forEach(it => allItems.push(it.id));
    (rm.customer_demos || []).forEach(it => allItems.push(it.id));
    (rm.anti_distractions || []).forEach((_, idx) => allItems.push('avoid-' + idx));

    function totals() {
      let done = 0, prog = 0, plan = 0;
      allItems.forEach(id => {
        const s = progress[id] || 'planned';
        if (s === 'done') done++;
        else if (s === 'in_progress') prog++;
        else plan++;
      });
      return { done, prog, plan, total: allItems.length };
    }

    function toggle(id) {
      progress[id] = nextRoadmapState(progress[id] || 'planned');
      saveRoadmapProgress(progress);
      renderRoadmapView(clear(document.getElementById('apm-main')));
    }

    function resetAll() {
      if (!confirm('Reset all roadmap progress?')) return;
      progress = {};
      saveRoadmapProgress(progress);
      renderRoadmapView(clear(document.getElementById('apm-main')));
    }

    function markAllDone() {
      if (!confirm('Mark every roadmap item as done?')) return;
      allItems.forEach(id => { progress[id] = 'done'; });
      saveRoadmapProgress(progress);
      renderRoadmapView(clear(document.getElementById('apm-main')));
    }

    function clickableItem(id, title, extras) {
      const s = progress[id] || 'planned';
      const item = el('div', {
        class: 'apm-roadmap-item apm-roadmap-item--' + s,
        role: 'button',
        tabindex: '0',
        title: 'Click to cycle: planned → in progress → done',
        onclick: () => toggle(id),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id); } },
      });
      const head = el('div', { class: 'apm-roadmap-item-head' },
        el('span', { class: 'apm-roadmap-tick' }, s === 'done' ? '✓' : (s === 'in_progress' ? '◐' : '○')),
        el('span', { class: 'apm-roadmap-item-title' }, title),
        el('span', { class: 'apm-roadmap-state apm-roadmap-state--' + s }, roadmapStateLabel(s)),
      );
      item.appendChild(head);
      if (extras) item.appendChild(extras);
      return item;
    }

    // Header strip
    const header = el('section', { class: 'apm-roadmap-header' });
    header.appendChild(el('h2', { class: 'apm-view-heading' }, 'Roadmap'));
    header.appendChild(el('p', { class: 'apm-view-sub' },
      'Anthracite V1 — 3-month product roadmap. Anchor: ',
      el('code', {}, rm.anchor_commit || ''),
      ' ', rm.anchor_summary || '',
      '. Click any item to cycle planned → in progress → done. Progress is stored locally in this browser.'));

    const t = totals();
    const counts = el('div', { class: 'apm-roadmap-counts' });
    counts.appendChild(el('span', { class: 'apm-roadmap-count apm-roadmap-count--done' },
      el('strong', {}, String(t.done)), ' done'));
    counts.appendChild(el('span', { class: 'apm-roadmap-count apm-roadmap-count--prog' },
      el('strong', {}, String(t.prog)), ' in progress'));
    counts.appendChild(el('span', { class: 'apm-roadmap-count apm-roadmap-count--plan' },
      el('strong', {}, String(t.plan)), ' planned'));
    counts.appendChild(el('span', { class: 'apm-roadmap-count' },
      el('strong', {}, String(t.total)), ' total'));
    const pct = t.total === 0 ? 0 : Math.round((t.done / t.total) * 100);
    counts.appendChild(el('span', { class: 'apm-roadmap-count apm-roadmap-count--pct' },
      el('strong', {}, pct + '%'), ' complete'));
    const actions = el('div', { class: 'apm-roadmap-actions' },
      el('button', { class: 'apm-roadmap-btn', type: 'button', onclick: markAllDone }, 'Mark all done'),
      el('button', { class: 'apm-roadmap-btn', type: 'button', onclick: resetAll }, 'Reset progress'),
    );
    counts.appendChild(actions);
    header.appendChild(counts);

    // Progress bar
    const bar = el('div', { class: 'apm-roadmap-bar' });
    bar.appendChild(el('div', {
      class: 'apm-roadmap-bar-done',
      style: 'width:' + (t.total ? (t.done / t.total) * 100 : 0) + '%',
    }));
    bar.appendChild(el('div', {
      class: 'apm-roadmap-bar-prog',
      style: 'width:' + (t.total ? (t.prog / t.total) * 100 : 0) + '%',
    }));
    header.appendChild(bar);
    root.appendChild(header);

    // Endgame card
    if (rm.endgame) {
      const card = el('section', { class: 'apm-roadmap-endgame' });
      card.appendChild(el('h3', { class: 'apm-roadmap-section-head' }, 'Endgame'));
      card.appendChild(el('p', { class: 'apm-roadmap-endgame-line' }, rm.endgame.one_line || ''));
      if (rm.endgame.customer_sentence) {
        card.appendChild(el('p', { class: 'apm-roadmap-endgame-sub' },
          el('strong', {}, 'Customer: '), rm.endgame.customer_sentence));
      }
      if (rm.endgame.investor_sentence) {
        card.appendChild(el('p', { class: 'apm-roadmap-endgame-sub' },
          el('strong', {}, 'Investor: '), rm.endgame.investor_sentence));
      }
      if (Array.isArray(rm.endgame.expensive_questions)) {
        const ul = el('ul', { class: 'apm-roadmap-endgame-questions' });
        rm.endgame.expensive_questions.forEach(q => ul.appendChild(el('li', {}, q)));
        card.appendChild(ul);
      }
      if (rm.endgame.product_loop) {
        card.appendChild(el('p', { class: 'apm-roadmap-endgame-loop' }, rm.endgame.product_loop));
      }
      root.appendChild(card);
    }

    // Lanes
    if (Array.isArray(rm.lanes) && rm.lanes.length > 0) {
      const lanesSec = el('section', { class: 'apm-roadmap-block' });
      lanesSec.appendChild(el('h3', { class: 'apm-roadmap-section-head' }, 'Three Product Lanes'));
      const lanesGrid = el('div', { class: 'apm-roadmap-lanes' });
      rm.lanes.forEach(lane => {
        const laneCard = el('div', { class: 'apm-roadmap-lane' });
        laneCard.appendChild(el('h4', { class: 'apm-roadmap-lane-title' }, lane.title || lane.id));
        if (lane.goal) laneCard.appendChild(el('p', { class: 'apm-roadmap-lane-goal' },
          el('strong', {}, 'Goal: '), lane.goal));
        if (Array.isArray(lane.includes)) {
          const ul = el('ul', { class: 'apm-roadmap-lane-includes' });
          lane.includes.forEach(i => ul.appendChild(el('li', {}, i)));
          laneCard.appendChild(ul);
        }
        lanesGrid.appendChild(laneCard);
      });
      lanesSec.appendChild(lanesGrid);
      root.appendChild(lanesSec);
    }

    // Campaigns + items
    (rm.campaigns || []).forEach(c => {
      const camp = el('section', { class: 'apm-roadmap-campaign' });
      const head = el('header', { class: 'apm-roadmap-campaign-head' });
      head.appendChild(el('h3', { class: 'apm-roadmap-section-head' }, c.title || c.id));
      if (c.theme) head.appendChild(el('p', { class: 'apm-roadmap-campaign-theme' },
        el('strong', {}, 'Theme: '), c.theme));
      if (c.goal) head.appendChild(el('p', { class: 'apm-roadmap-campaign-goal' },
        el('strong', {}, 'Goal: '), c.goal));
      camp.appendChild(head);
      (c.items || []).forEach(it => {
        const extras = el('div', { class: 'apm-roadmap-item-body' });
        if (it.why) extras.appendChild(el('p', {},
          el('strong', { class: 'apm-roadmap-item-label' }, 'Why: '), it.why));
        if (it.acceptance) extras.appendChild(el('p', {},
          el('strong', { class: 'apm-roadmap-item-label' }, 'Acceptance: '), it.acceptance));
        if (it.answers) extras.appendChild(el('p', {},
          el('strong', { class: 'apm-roadmap-item-label' }, 'Answers: '), it.answers));
        if (Array.isArray(it.notes) && it.notes.length > 0) {
          const ul = el('ul', { class: 'apm-roadmap-item-notes' });
          it.notes.forEach(n => ul.appendChild(el('li', {}, n)));
          extras.appendChild(ul);
        }
        camp.appendChild(clickableItem(it.id, it.title || it.id, extras));
      });
      root.appendChild(camp);
    });

    // Next 10 stages
    if (Array.isArray(rm.next_ten_stages) && rm.next_ten_stages.length > 0) {
      const sec = el('section', { class: 'apm-roadmap-block' });
      sec.appendChild(el('h3', { class: 'apm-roadmap-section-head' }, 'Next 10 Stages'));
      sec.appendChild(el('p', { class: 'apm-view-sub' },
        'Concrete near-term execution order. Click to track.'));
      const list = el('div', { class: 'apm-roadmap-list' });
      rm.next_ten_stages.forEach(it => {
        list.appendChild(clickableItem(it.id, it.title || it.id, null));
      });
      sec.appendChild(list);
      root.appendChild(sec);
    }

    // Customer demos
    if (Array.isArray(rm.customer_demos) && rm.customer_demos.length > 0) {
      const sec = el('section', { class: 'apm-roadmap-block' });
      sec.appendChild(el('h3', { class: 'apm-roadmap-section-head' }, 'Customer Demo Paths'));
      rm.customer_demos.forEach(d => {
        const extras = d.summary ? el('p', { class: 'apm-roadmap-item-body' }, d.summary) : null;
        sec.appendChild(clickableItem(d.id, d.title || d.id, extras));
      });
      root.appendChild(sec);
    }

    // Anti-distractions
    if (Array.isArray(rm.anti_distractions) && rm.anti_distractions.length > 0) {
      const sec = el('section', { class: 'apm-roadmap-block' });
      sec.appendChild(el('h3', { class: 'apm-roadmap-section-head' }, 'Anti-Distractions'));
      sec.appendChild(el('p', { class: 'apm-view-sub' },
        'Items to avoid spending too long on. Toggle when consciously deprioritised.'));
      rm.anti_distractions.forEach((line, idx) => {
        sec.appendChild(clickableItem('avoid-' + idx, line, null));
      });
      root.appendChild(sec);
    }

    // Focus keywords + one-liners
    const tail = el('section', { class: 'apm-roadmap-tail' });
    if (Array.isArray(rm.focus_keywords) && rm.focus_keywords.length > 0) {
      const chips = el('div', { class: 'apm-roadmap-focus-chips' });
      rm.focus_keywords.forEach(k => chips.appendChild(el('span', { class: 'apm-roadmap-focus-chip' }, k)));
      tail.appendChild(el('h4', { class: 'apm-roadmap-section-head' }, 'Focus'));
      tail.appendChild(chips);
    }
    root.appendChild(tail);
  }

  function renderArcsView(root) {
    root.appendChild(el('h2', { class: 'apm-view-heading' }, 'Arc Timeline'));
    root.appendChild(el('p', { class: 'apm-view-sub' },
      'Stages grouped by arc, in declared order. Filtered chips fade out.'));
    (data.arcs || []).forEach(a => {
      const lane = el('div', { class: 'apm-swimlane' });
      lane.appendChild(el('div', { class: 'apm-swimlane-label' },
        document.createTextNode(a.title || a.id),
        el('small', {}, (a.stage_range || '') + ' · ' + (a.status || '')),
      ));
      const chips = el('div', { class: 'apm-swimlane-chips' });
      const arcStages = (data.stages || []).filter(s => s.arc_id === a.id);
      if (arcStages.length === 0) {
        chips.appendChild(el('span', { class: 'apm-empty' }, 'No stages.'));
      }
      arcStages.forEach(s => {
        const hidden = !passesFilters(s);
        chips.appendChild(el('button', {
          class: 'apm-stage-chip',
          type: 'button',
          'data-hidden': hidden ? '1' : '0',
          title: s.title || s.id,
          onclick: () => openStage(s.id),
        },
          statusDot(s.status),
          el('span', { class: 'apm-stage-chip-id' }, s.id),
          el('span', { class: 'apm-stage-chip-title' }, s.title || ''),
        ));
      });
      lane.appendChild(chips);
      root.appendChild(lane);
    });
  }

  function renderDepsView(root) {
    root.appendChild(el('h2', { class: 'apm-view-heading' }, 'Dependency Map'));
    root.appendChild(el('p', { class: 'apm-view-sub' },
      'Lightweight node board: nodes referenced by dependency_edges only, drawn as an SVG ring with straight edges. Filtering hides non-matching nodes. For a richer picture, click a node to open its detail panel.'));

    const edges = data.dependency_edges || [];
    if (edges.length === 0) {
      root.appendChild(el('p', { class: 'apm-empty' }, 'No dependency edges declared.'));
      return;
    }

    // Collect node ids actually referenced by edges.
    const nodeIds = Array.from(new Set(edges.flatMap(e => [e.from, e.to])));
    const nodes = nodeIds.map(id => {
      const stage = stageById(id);
      return { id, status: stage ? stage.status : 'deferred', title: stage ? stage.title : id };
    }).filter(n => state.statusFilter.has(n.status) && matchesText(n.id + ' ' + n.title));

    if (nodes.length === 0) {
      root.appendChild(el('p', { class: 'apm-empty' }, 'No nodes match current filters.'));
    } else {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'apm-edges-svg');
      svg.setAttribute('viewBox', '0 0 800 480');
      const cx = 400, cy = 240, rOuter = 200;
      const positions = new Map();
      nodes.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
        positions.set(n.id, { x: cx + rOuter * Math.cos(angle), y: cy + rOuter * Math.sin(angle) });
      });
      // edges first
      edges.forEach(e => {
        const a = positions.get(e.from);
        const b = positions.get(e.to);
        if (!a || !b) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        line.setAttribute('stroke-dasharray', e.kind === 'blocks' ? '4 3' : '0');
        svg.appendChild(line);
      });
      // nodes
      nodes.forEach(n => {
        const p = positions.get(n.id);
        if (!p) return;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y); circle.setAttribute('r', '16');
        circle.setAttribute('style', 'cursor: pointer');
        circle.addEventListener('click', () => openStage(n.id));
        svg.appendChild(circle);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('class', 'apm-node-id');
        t.setAttribute('x', p.x); t.setAttribute('y', p.y + 3); t.setAttribute('text-anchor', 'middle');
        t.textContent = n.id;
        svg.appendChild(t);
      });
      root.appendChild(svg);
    }

    // Edge list as honest fallback / dense view.
    root.appendChild(el('h3', { class: 'apm-group-heading' }, 'Edge list'));
    const ul = el('ul', { class: 'apm-edge-list' });
    edges.forEach(e => {
      ul.appendChild(el('li', { title: e.note || '' },
        document.createTextNode(e.from + '  →  ' + e.to + '   [' + (e.kind || 'depends_on') + ']')));
    });
    root.appendChild(ul);
  }

  function renderCapsView(root) {
    root.appendChild(el('h2', { class: 'apm-view-heading' }, 'Capability Matrix'));
    root.appendChild(el('p', { class: 'apm-view-sub' },
      'Per-capability rows. Click a stage chip to drill in.'));
    const caps = data.capability_map || [];
    const visible = caps.filter(c => {
      if (!state.statusFilter.has(c.state)) return false;
      return matchesText([c.capability, c.state, (c.implemented_by||[]).join(' '), (c.depends_on||[]).join(' '), (c.remaining_work||[]).join(' ')].join(' '));
    });
    if (visible.length === 0) {
      root.appendChild(el('p', { class: 'apm-empty' }, 'No capabilities match current filters.'));
      return;
    }
    const table = el('table', { class: 'apm-table' });
    const thead = el('thead', {},
      el('tr', {},
        el('th', {}, 'Capability'),
        el('th', {}, 'State'),
        el('th', {}, 'Implemented by'),
        el('th', {}, 'Depends on'),
        el('th', {}, 'Remaining work'),
      ),
    );
    table.appendChild(thead);
    const tbody = el('tbody');
    visible.forEach(c => {
      const tr = el('tr');
      tr.appendChild(el('td', {}, c.capability || ''));
      tr.appendChild(el('td', {}, statusPill(c.state)));
      const ulImpl = el('ul', { class: 'apm-table-list' });
      (c.implemented_by || []).forEach(sid => {
        ulImpl.appendChild(el('li', {},
          el('code', { onclick: () => openStage(sid), style: 'cursor:pointer', title: 'Open ' + sid }, sid),
        ));
      });
      tr.appendChild(el('td', {}, ulImpl));
      const ulDep = el('ul', { class: 'apm-table-list' });
      (c.depends_on || []).forEach(sid => {
        ulDep.appendChild(el('li', {},
          el('code', { onclick: () => openStage(sid), style: 'cursor:pointer' }, sid),
        ));
      });
      tr.appendChild(el('td', {}, ulDep));
      const remaining = (c.remaining_work || []);
      if (remaining.length === 0) {
        tr.appendChild(el('td', {}, el('span', { class: 'apm-empty' }, '—')));
      } else {
        const ulRem = el('ul', { class: 'apm-card-list' });
        remaining.forEach(r => ulRem.appendChild(el('li', {}, r)));
        tr.appendChild(el('td', {}, ulRem));
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    root.appendChild(table);
  }

  function renderDeferredView(root) {
    root.appendChild(el('h2', { class: 'apm-view-heading' }, 'Deferred / Left Undone'));
    root.appendChild(el('p', { class: 'apm-view-sub' },
      'Things deliberately not built yet, grouped by domain. Each item lists what it is waiting on.'));
    const list = (data.deferred_or_left_undone || []).filter(item => {
      return matchesText([item.title, item.reason, (item.must_wait_for||[]).join(' ')].join(' '));
    });
    if (list.length === 0) {
      root.appendChild(el('p', { class: 'apm-empty' }, 'No deferred items match current filters.'));
      return;
    }
    const groups = groupDeferred(list);
    Object.entries(groups).forEach(([groupName, items]) => {
      if (items.length === 0) return;
      root.appendChild(el('h3', { class: 'apm-group-heading' }, groupName + ' (' + items.length + ')'));
      const cards = el('div', { class: 'apm-cards' });
      items.forEach(item => {
        cards.appendChild(el('div', { class: 'apm-card' },
          el('h4', { class: 'apm-card-title' }, item.title || item.id),
          statusPill(item.status || 'deferred'),
          el('p', { class: 'apm-card-body' }, item.reason || ''),
          (item.must_wait_for && item.must_wait_for.length > 0)
            ? el('div', { class: 'apm-card-sub' },
                document.createTextNode('Must wait for: ' + item.must_wait_for.join(', ')))
            : null,
        ));
      });
      root.appendChild(cards);
    });
  }

  function groupDeferred(list) {
    const buckets = {
      'Live collection': [],
      'Graph / rendering': [],
      'Evidence / truth': [],
      'Parser / platform': [],
      'Governance': [],
      'Other': [],
    };
    list.forEach(item => {
      const id = (item.id || '').toLowerCase();
      const t = (item.title || '').toLowerCase();
      const text = id + ' ' + t;
      if (/(ssh|polling|live|driver|scheduler|background|live_driver)/.test(text)) buckets['Live collection'].push(item);
      else if (/(graph|renderer|canvas|babylon|layout|physics)/.test(text)) buckets['Graph / rendering'].push(item);
      else if (/(evidence|audit|rollback|store|history|retain|per_entry|rejected)/.test(text)) buckets['Evidence / truth'].push(item);
      else if (/(parser|expected_json|platform|fuzzy|topology_inference|vendor|version|huawei|nokia|fortios|mikrotik|devicemodel)/.test(text)) buckets['Parser / platform'].push(item);
      else if (/(governance|rule|validator|drift|policy)/.test(text)) buckets['Governance'].push(item);
      else buckets['Other'].push(item);
    });
    return buckets;
  }

  function renderSafetyView(root) {
    root.appendChild(el('h2', { class: 'apm-view-heading' }, 'Safety Boundaries'));
    root.appendChild(el('p', { class: 'apm-view-sub' },
      'Rules every future stage MUST preserve. Loud on purpose.'));
    const list = (data.safety_boundaries || []).filter(item => {
      return matchesText([item.title, item.rule, (item.applies_to||[]).join(' ')].join(' '));
    });
    if (list.length === 0) {
      root.appendChild(el('p', { class: 'apm-empty' }, 'No safety boundaries match current filters.'));
      return;
    }
    const cards = el('div', { class: 'apm-cards' });
    list.forEach(item => {
      cards.appendChild(el('div', { class: 'apm-card apm-card--safety' },
        el('h4', { class: 'apm-card-title' }, item.title || item.id),
        el('p', { class: 'apm-card-body' }, item.rule || ''),
        (item.applies_to && item.applies_to.length > 0)
          ? el('div', { class: 'apm-card-sub' },
              document.createTextNode('Applies to: ' + item.applies_to.join(', ')))
          : null,
        (item.source_refs && item.source_refs.length > 0)
          ? el('div', { class: 'apm-source-ref' },
              document.createTextNode(item.source_refs.map(r => r.path + (r.section ? ' · ' + r.section : '')).join(' | ')))
          : null,
      ));
    });
    root.appendChild(cards);
  }

  function renderQuestionsView(root) {
    root.appendChild(el('h2', { class: 'apm-view-heading' }, 'Open Questions'));
    root.appendChild(el('p', { class: 'apm-view-sub' },
      'Decisions Bujar/Vale must make before downstream stages can land.'));
    const qs = (data.open_questions || []).filter(q => {
      return matchesText([q.question, q.why_it_matters, (q.options||[]).join(' '), q.owner].join(' '));
    });
    if (qs.length === 0) {
      root.appendChild(el('p', { class: 'apm-empty' }, 'No open questions match current filters.'));
      return;
    }
    const cards = el('div', { class: 'apm-cards' });
    qs.forEach(q => {
      const owner = (q.owner || '').toLowerCase();
      const decision = owner.includes('bujar');
      const card = el('div', { class: 'apm-card' + (decision ? ' apm-card--decision' : '') },
        el('h4', { class: 'apm-card-title' }, q.question || q.id),
        decision ? statusPill('decision') : null,
        q.why_it_matters
          ? el('p', { class: 'apm-card-body' }, q.why_it_matters)
          : null,
        (q.options && q.options.length > 0)
          ? el('ul', { class: 'apm-card-list' },
              ...q.options.map(o => el('li', {}, o)))
          : null,
        q.owner ? el('div', { class: 'apm-card-sub' }, document.createTextNode('Owner: ' + q.owner)) : null,
      );
      cards.appendChild(card);
    });
    root.appendChild(cards);
  }

  function renderEvidenceView(root) {
    root.appendChild(el('h2', { class: 'apm-view-heading' }, 'Evidence / Sources'));
    root.appendChild(el('p', { class: 'apm-view-sub' },
      'Compact list of every source reference used across stages, capabilities, deferred items, safety boundaries, and open questions. Click a stage to see refs grouped.'));
    const seen = new Set();
    const refs = [];
    const collect = (arr) => {
      (arr || []).forEach(item => {
        (item.source_refs || []).forEach(r => {
          const key = (r.path||'') + '|' + (r.section||'') + '|' + (r.line_hint||'');
          if (seen.has(key)) return;
          seen.add(key);
          refs.push(r);
        });
      });
    };
    collect(data.stages);
    collect(data.capability_map);
    collect(data.deferred_or_left_undone);
    collect(data.safety_boundaries);
    collect(data.open_questions);
    collect(data.halted_or_superseded);

    const list = refs.filter(r => matchesText([r.path, r.section, r.line_hint, r.quote_or_summary].join(' ')));
    if (list.length === 0) {
      root.appendChild(el('p', { class: 'apm-empty' }, 'No source refs match current filters.'));
      return;
    }
    const ul = el('ul', { class: 'apm-evidence-list' });
    list.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
    list.forEach(r => {
      ul.appendChild(el('li', { title: r.quote_or_summary || '' },
        document.createTextNode(r.path + (r.section ? ' · ' + r.section : '') + (r.line_hint ? ' · ' + r.line_hint : ''))));
    });
    root.appendChild(ul);
  }

  // ---- detail panel ----
  function openStage(id) {
    const stage = stageById(id);
    if (!stage) return;
    state.selected = id;
    const panel = document.getElementById('apm-detail');
    const content = clear(document.getElementById('apm-detail-content'));
    content.appendChild(el('h3', { class: 'apm-detail-h' }, (stage.title || stage.id)));
    content.appendChild(el('div', { class: 'apm-detail-sub' },
      document.createTextNode(stage.id + '  ·  arc: ' + (stage.arc_id || '—') + '  ·  confidence: ' + (stage.confidence || '—'))));
    content.appendChild(statusPill(stage.status));
    if (stage.summary) {
      content.appendChild(detailSection('Summary', el('p', {}, stage.summary)));
    }
    detailList(content, 'Outputs', stage.outputs);
    detailList(content, 'Scope out', stage.scope_out);
    detailList(content, 'Dependencies', stage.dependencies, true);
    detailList(content, 'Enables', stage.enables, true);
    detailRefs(content, stage.source_refs);
    panel.setAttribute('data-open', '1');
    panel.setAttribute('aria-hidden', 'false');
  }

  function detailSection(title, body) {
    return el('div', { class: 'apm-detail-section' },
      el('h4', {}, title),
      body,
    );
  }
  function detailList(container, title, items, linkAsStage) {
    if (!items || items.length === 0) return;
    const ul = el('ul');
    items.forEach(it => {
      const li = el('li', {});
      if (linkAsStage) {
        const c = el('code', { onclick: () => openStage(it), style: 'cursor:pointer', title: 'Open ' + it }, it);
        li.appendChild(c);
      } else {
        li.appendChild(document.createTextNode(it));
      }
      ul.appendChild(li);
    });
    container.appendChild(detailSection(title, ul));
  }
  function detailRefs(container, refs) {
    if (!refs || refs.length === 0) return;
    const ul = el('ul');
    refs.forEach(r => {
      const txt = r.path + (r.section ? ' · ' + r.section : '') + (r.line_hint ? ' · ' + r.line_hint : '');
      ul.appendChild(el('li', { title: r.quote_or_summary || '' }, el('span', { class: 'apm-source-ref' }, txt)));
    });
    container.appendChild(detailSection('Source refs', ul));
  }

  function closeDetail() {
    const panel = document.getElementById('apm-detail');
    panel.setAttribute('data-open', '0');
    panel.setAttribute('aria-hidden', 'true');
    state.selected = null;
  }

  // ---- search + reset ----
  document.getElementById('apm-search').addEventListener('input', (e) => {
    state.text = (e.target.value || '').toLowerCase();
    renderView();
  });
  document.getElementById('apm-reset').addEventListener('click', () => {
    state.statusFilter = new Set(STATUSES);
    state.arcFilter = new Set((data.arcs || []).map(a => a.id));
    state.text = '';
    document.getElementById('apm-search').value = '';
    renderFilters();
    renderView();
  });
  document.getElementById('apm-detail-close').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

  // ---- footer ----
  function renderFooter() {
    const root = clear(document.getElementById('apm-footer'));
    root.appendChild(el('span', {},
      el('strong', {}, 'Generated: '), manifest.generated_at_utc));
    root.appendChild(el('span', {},
      el('strong', {}, 'Generator: '), manifest.generator));
    root.appendChild(el('span', {},
      el('strong', {}, 'Source: '), manifest.source_path));
    root.appendChild(el('span', {},
      el('strong', {}, 'Snapshot: '), manifest.snapshot_path));
    if (manifest.source_metadata && manifest.source_metadata.git_head) {
      root.appendChild(el('span', {},
        el('strong', {}, 'git_head: '), manifest.source_metadata.git_head.slice(0, 12)));
    }
  }

  // ---- boot ----
  renderHeaderMeta();
  renderSummary();
  renderTabs();
  renderFilters();
  renderView();
  renderFooter();
})();
`;

main();

