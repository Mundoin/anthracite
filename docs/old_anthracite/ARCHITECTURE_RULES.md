# ANTHRACITE — Architecture Rules
**Version:** 2.2 | **Last updated:** Session 45 | **Total rules:** 289

This is the canonical source for all architecture rules.
- Rules are append-only — existing rule numbers never change or get reused.
- Superseded rules are marked SUPERSEDED, never deleted.
- The handover doc (`ANTHRACITE_Handover_v*.md`) carries a summary table only — this file is the full specification.
- This file **must be in Project Knowledge** for every Web Claude session.
- Code Claude reads this file at session start via MCP if not already in context.

---

## Rules 1–100 — Foundation (Sessions 1–31)

Rules 1–100 are unchanged from v1.17.0. They are implicitly enforced by the implementation.
They will be backfilled here in a dedicated session. Until then, the definitive record is the
CLAUDE.md implicit constraints and the implementation itself.

---

## Rules 101–128 — Topology, Trust & Path Layer (Sessions 32–42)

| # | Rule |
|---|---|
| 101 | WAN Hub is virtual — never a real device in metrics, credentials, or collection |
| 102 | One WAN Hub per environment — auto-created on first tunnel, auto-removed at zero |
| 103 | WAN Hub sits at Blueprint layer -1 — above core, never below |
| 104 | All tunnel links route through WAN Hub — no direct device-to-device tunnel lines |
| 105 | `wan_mappings` populated post-crawl — never during recursive crawl SSH sessions |
| 106 | Tunnel endpoint resolution is best-effort — unresolved IPs create unknown peer nodes |
| 107 | Correlation Badge is UI-only signal grouping — never generates findings or verdicts |
| 108 | SiteAccessPill inherits expand/collapse from MapClusterItem — no separate hierarchy |
| 109 | SiteAccessPill threshold is 16 nodes — sites with ≤16 access nodes render individually |
| 110 | Wormhole link rendering is eye-candy — portal glow exempt from protanopia constraints |
| 111 | Critical nodes ejected from SiteAccessPill individually — warning nodes stay inside, increment badge. Ejection is metrics-driven |
| 112 | WAN Hub: slow breathing pulse (15s cycle, 20-50% alpha) — eye-candy only |
| 113 | Composability: build graph traversal, config comparison, scoring as shared primitives — features compose, never build independent systems |
| 114 | Confidence, severity, visibility are independent axes. All suppression paths carry visibility_reason for audit traceability |
| 115 | Exceptions target (rule_id, entity_id) or fingerprint — never topology nodes. Node-level scope prohibited in v1 |
| 116 | Expired exceptions soft-deactivated (is_active=0), never deleted — audit trail preserved |
| 117 | Noise suppression groups by (entity_id, rule_id, finding_key, window_key) — display-only, internal stream never modified |
| 118 | Exception filtering and noise grouping happen post-ranking, pre-display — ranking scores on full unfiltered set |
| 119 | Path trace overlay is purely cosmetic — no prepareGeometryChange(), no layout repulsion, no node position changes |
| 120 | ExplanationCompositor may only combine, rank, and render signals from upstream deterministic engines. Must not infer new facts or invent missing evidence |
| 121 | SPOF marker is additive paint-level only — static double-ring, no pulse, no shape mutation, no position change |
| 122 | FD engine scopes analysis to the target device's connected component — pre-existing disconnected nodes are invisible |
| 123 | HypothesisEngine forms causal groupings from ranked findings, FD data, drift state, topology adjacency. Deterministic. Role distinction per-signal. Contradictions are first-class |
| 124 | L3 path tracing operates on collected route-table snapshots. Results must expose freshness. Live truth never assumed from cache |
| 125 | Per-hop L3 trace separates forwarding decision (LPM + recursive resolution) from topology-device mapping. Each phase carries its own status |
| 126 | Unsupported/missing route data must never render as "no route." Distinguish: parsed_ok / parsed_empty / unsupported_vendor / parse_failed / not_collected |
| 127 | LPM tie-breaking is deterministic and vendor-agnostic: longest prefix → lowest AD → lowest metric → stable sort |
| 128 | L2 and L3 path traces are independent modes. Compare mode is explicitly requested, never default |

---

## Rules 129–200 — Extended Architecture (Session 45)

### Vendor / Parser (129–136)

| # | Rule |
|---|---|
| 129 | Vendor support scope is explicit and versioned — config engine: Cisco/Arista/Juniper/Huawei; analyser: + FortiGate; route parser: Cisco/Arista/FortiGate full, XR/Juniper/Huawei stub. Never infer vendor from hostname |
| 130 | ~~SUPERSEDED by 261~~ |
| 131 | ~~SUPERSEDED by 259~~ |
| 132 | Parser upgrades from stub to full must be accompanied by ≥8 unit tests including empty output, ECMP, and recursive next-hop cases |
| 133 | FortiGate VRF=0 maps to "default" — all other VRF IDs map to "vrf{N}" — VRF naming is never inferred from interface names |
| 134 | ~~SUPERSEDED by 260~~ |
| 135 | Vendor-specific quirks (EOS 4.35+ RD deprecation, vEOS ip access-group unsupported, MPLS vEOS) are documented as known-safe deviations — analyser never flags them as errors on verified platforms |
| 136 | New vendor additions require updates to: credential store validation, vendor_to_device_type mapping, route parser dispatch, collector, fabricator mock data, and CLAUDE.md vendor scope — all six or none |

### Route Layer / L3 Trace (137–144)

| # | Rule |
|---|---|
| 137 | Route table freshness is always surfaced to the user — collected_at is displayed in trace results; stale tables (>1h) show a visual age warning |
| 138 | VRF-aware trace is opt-in — default VRF is "default"; multi-VRF requires explicit VRF selection in TracePanel; never auto-select VRF |
| 139 | ECMP routes produce one entry per path — the engine picks first match by Rule 127 unless compare mode is explicitly active |
| 140 | Recursive next-hop resolution depth cap is 10 — beyond that, status is topology_gap, never infinite recursion |
| 141 | Loop detection key is (device_name, dst_ip, vrf) — same device appearing via different VRFs is not a loop |
| 142 | Synthetic route tables are BFS-derived from topology graph — OSPF-style /32 entries only — never claim to model real routing protocols |
| 143 | L3 trace result is immutable after compute — UI layers may annotate for display but never mutate L3PathResult or L3Hop objects |
| 144 | Route table collection runs post-discovery and post-crawl — never during live SSH collect cycle |

### Trust / Confidence / Exception (145–152)

| # | Rule |
|---|---|
| 145 | Confidence tiers are constants: high ≥0.80, medium ≥0.50, low <0.50 — never magic numbers inline |
| 146 | Suppression reason chain is append-only — once suppressed, suppression_causes accumulates; removing a cause never unsuppresses |
| 147 | Exception scope is (rule_id, entity_id) pair — wildcard rule_id ("*") is permitted but logged with elevated audit priority |
| 148 | Exception expiry is evaluated at display time — expired exceptions remain in database (Rule 116) but never counted as active |
| 149 | Noise suppression window keys are deterministic — same (entity_id, rule_id, finding_key, window_key) always maps to same group regardless of insertion order |
| 150 | Trust score computation is per-finding — never averaged across findings for a device; device-level trust summary is derived, not primary |
| 151 | ExplanationCompositor output is ordered by tier_rank DESC then intra_tier_score DESC — this ordering is the contract; UI never re-sorts |
| 152 | Contradiction signals (E-013) are always rendered before informational signals regardless of score — never suppressed by noise grouping |

### Hypothesis Engine (153–158)

| # | Rule |
|---|---|
| 153 | Hypothesis formation is triggered by topology changes and post-collection — never on timer |
| 154 | A device may be root in one hypothesis and symptom in another — never deduplicated |
| 155 | Contradictory hypotheses are first-class — when two hypotheses for the same root point to opposing causal chains, both display with a contradiction marker |
| 156 | Hypothesis confidence is derived from signal count and signal quality — never from blast radius or isolated device count directly |
| 157 | HypothesisStrip cards are sorted: severity DESC → confidence DESC → device_name ASC |
| 158 | Jump-to-OPERATE from hypothesis card highlights root + symptom nodes on canvas — clears on next node click or mode switch |

### Canvas / Topology Map (159–170)

| # | Rule |
|---|---|
| 159 | Node positions are always stored in scene coordinates — never viewport coordinates; PositionStore persists scene coords |
| 160 | MapNodeItem boundingRect must always contain all painted decorations — SPOF ring, drift shimmer, gravity glow |
| 161 | ~~REMOVED — ZValue implementation detail, not architecture constraint~~ |
| 162 | ~~REMOVED — fit_to_content timer is implementation detail, not architecture constraint~~ |
| 163 | Mini-map right offset updates whenever context panel appears or disappears — never allow context panel to overlap mini-map |
| 164 | Ghost overlay (Alt key) restores opacity to 1.0 only after checking Click-Spotlight isolation state |
| 165 | Cluster hull (convex hull) is recomputed only on layout changes — never on metrics update |
| 166 | SiteAccessPill pill_center is the canonical anchor for cross-pill links — never use individual member node positions for external link routing |
| 167 | WAN Hub pulse is eye-candy: 15s cycle, 20–50% alpha — never affects metrics or status |
| 168 | Node click in path trace mode is intercepted before context panel logic — if path_trace_active and clicked node ≠ source, complete the trace |
| 169 | ~~SUPERSEDED by 258~~ |
| 170 | Dot grid background lives in TopologyMapView.paintEvent() with viewport().update() from timer — never in drawBackground() |

### Context Panel (171–175)

| # | Rule |
|---|---|
| 171 | Context panel width is user-resizable between 300–600px — persists width across node clicks within a session |
| 172 | Context panel sections render in fixed order: identity → metrics → interfaces → tunnel health → failure domain → blast radius → findings → explanations → path trace |
| 173 | Context panel paintEvent uses direct QPainter for background and border — never QSS stylesheet background on the panel widget itself |
| 174 | Context panel text is selectable — all QLabel instances use setTextInteractionFlags(TextSelectableByMouse) |
| 175 | Context panel "Remote Device" header clips at panel width − 24px — long hostnames truncate with ellipsis, never overflow |

### Collection / Monitor Pipeline (176–183)

| # | Rule |
|---|---|
| 176 | Parallel collector default is 32 workers, configurable, hard cap 64 |
| 177 | Error devices preserve last-known metrics as "stale" — map never flickers on transient SSH errors; stale state cleared on next successful collect |
| 178 | Sentinel capacity prediction runs after every successful collect — prediction horizon is user-configurable; Off is the default |
| 179 | Auto-Poll is disabled in SYNTHETIC mode — the Auto-Poll combo reverts to "Auto-Poll: Off" and blocks further selection. Consolidates the former Auto-refresh and Auto-Poll controls (S87.5) |
| 180 | Route collection is always post-discovery/post-crawl — never interleaved with SSH metric collection |
| 181 | WAN harvester runs post-crawl (Rule 105) — harvest failure is logged but never surfaces as user-visible error |
| 182 | Fabricator metrics are injected through the standard _on_results pipeline — Fabricator.generate() produces identical DeviceMetrics objects to LiveMonitorCollector |
| 183 | Time-machine scrub bar appears only when ≥2 snapshots exist — single-snapshot environments show no scrub bar |
| 184 | Fleet-wide SNMP settings (community, timeout, retries) live in QSettings under `fleet/snmp/*`. Edited via Fleet → SNMP Settings… dialog or the toolbar SNMP chip. Never exposed as inline toolbar inputs (S87.5) |

### BUILD / Config Engine (184–190)

| # | Rule |
|---|---|
| 184 | Config engine is a strict two-pass pipeline: Discover → Render — registry models are frozen after Pass 1 |
| 185 | Analyser rules query ParsedConfig block tree only — never regex against raw config text |
| 186 | Finding.severity is Literal["critical", "warning", "info"] — SEVERITY_RANK is the single ordering source |
| 187 | Rule Gravity is one-way: analyser → topology map — map never writes back to analyser |
| 188 | Fabricator is dev-key gated — never visible in production builds; synthetic state always shows "⚗ SYNTHETIC" marker |
| 189 | Config Lineage block_id is entity-level — block identity is normalised hostname, not raw line number |
| 190 | Compare engine output is ordered: critical diffs first, then warning, then info — within severity, alphabetical by block name |

### UI / Theme / Accessibility (191–197)

| # | Rule |
|---|---|
| 191 | All functional UI color signals must have a non-color backup (text label, icon, or shape) — color is never the sole differentiator |
| 192 | Eye-candy visuals (wormhole glow, WAN Hub pulse, Neural Sonar, flow particles) are exempt from protanopia constraints — they carry no functional information |
| 193 | Theme tokens are the single source of all colors in code — no hex literals in widget code; theme.get() everywhere |
| 194 | Theme switch triggers re-population of all widgets that used hardcoded QColor values at construction time |
| 195 | ~~REMOVED — font size spec belongs in stylesheet, not architecture rules~~ |
| 196 | ModeSwitcherStrip collapses to 40px in OPERATE (150ms OutCubic) — 72px in all other modes; no intermediate states |
| 197 | Session pill (LIVE/SYNTHETIC/REPLAY) always visible in OPERATE — positioned 12px from top-left of content area; updates on every state change |

### Data Persistence / Storage (198–200)

| # | Rule |
|---|---|
| 198 | ~~REMOVED — separate SQLite files is implementation detail, not architecture constraint~~ |
| 199 | All store operations are wrapped in try/except at call site — store failures never crash the UI thread |
| 200 | Expired/soft-deleted records are never purged by the application — only by explicit operator action |

---

## Rules 201–267 — Full Specification (Session 45)

### Data Integrity / Cross-Layer (201–216)

| # | Rule |
|---|---|
| 201 | Snapshot identity is immutable — once created, snapshot contents must never be altered |
| 202 | UI never blocks on network I/O — all network operations must run in worker threads |
| 203 | All cross-layer data flow is one-directional — lower layers never depend on UI state |
| 204 | Any cached state must include version or generation ID — stale cache must never overwrite newer truth |
| 205 | Device identity is canonicalised once — hostname normalisation must be consistent across all layers |
| 206 | All enums must have an explicit UNKNOWN or UNSUPPORTED state — never rely on None for semantic meaning |
| 208 | Any fallback logic must be explicit and visible — silent fallback is forbidden |
| 210 | No engine module may import from nexus.ui — UI is a terminal consumer; imports flow downward only |
| 211 | Cross-module contracts use typed Pydantic models — never raw dict passing across module boundaries |
| 213 | Derived fields must be recomputable from base primitives — no hidden state that cannot be reconstructed |
| 214 | System state must be reconstructable from snapshot + inputs — no hidden runtime-only truth |
| 215 | Partial computation results must never be exposed to UI — only complete, consistent bundles reach the display layer |
| 216 | Each pipeline stage must produce deterministic output for identical input — no randomness in engine code |

### Snapshot / Time-Machine (217–224)

| # | Rule |
|---|---|
| 217 | Snapshot creation is atomic — either a full snapshot exists or none |
| 219 | Time-machine navigation never mutates live state — it swaps read context only |
| 220 | Snapshot comparison operates on diff of primitives, not UI state |
| 221 | Snapshot storage is append-only — no overwrite of historical state |
| 222 | Snapshot metadata must include source type (LIVE / SYNTHETIC / REPLAY) |
| 223 | Snapshot load must be idempotent — repeated loads produce identical UI |
| 224 | Snapshot switching must clear all transient UI highlights and overlays |

### Path Tracing — L2 + L3 (225–231)

| # | Rule |
|---|---|
| 225 | L2 path traversal is BFS-based and deterministic — no heuristic shortcuts |
| 226 | L2 traversal must respect interface state — down interfaces are excluded from path computation |
| 227 | L3 trace must terminate with an explicit status — no silent fallthrough to an undefined state |
| 228 | Path overlays are time-bound — auto-clear after timeout or explicit user action |
| 230 | Failed hops must include a reason code — not just visual indication |
| 231 | New trace execution cancels any active trace — no concurrent traces |

### Failure Domain / Structural Analysis (233–238)

| # | Rule |
|---|---|
| 233 | Failure Domain computation is O(N+E) per device — no exponential scans |
| 234 | SPOF classification requires actual graph split verification — not degree-based heuristics |
| 235 | FD results are cached per snapshot — recompute only on topology change |
| 236 | FD output must include isolated count and affected device set |
| 237 | FD clean state must be explicitly rendered — absence of risk is a signal |
| 238 | FD logic must ignore synthetic placeholder nodes (unknown peers, wan_cloud) |

### Explanation Compositor (240–244)

| # | Rule |
|---|---|
| 240 | Explanation tags are derived only from rule metadata — never ad-hoc strings |
| 241 | Multiple rules of the same family collapse into a single explanation |
| 242 | Explanation absence is valid output — no filler or placeholder messages |
| 243 | Explanation refresh must occur after every hypothesis recompute |
| 244 | Explanation selection state clears on snapshot change |

### Hypothesis Engine (245–250)

| # | Rule |
|---|---|
| 245 | Hypothesis signal graph is acyclic — cycles are collapsed or marked as contradictions |
| 246 | Hypothesis recompute invalidates all prior hypothesis IDs |
| 250 | CLEAN hypothesis must not appear for a device if any signal exists for that device |

### UI / Interaction (251–258)

| # | Rule |
|---|---|
| 251 | Single-click is always the primary action — no double-click dependencies |
| 252 | Hover never commits state — hover is preview only |
| 253 | All destructive actions require explicit confirmation or a reversible path |
| 254 | Cursor state must reflect the current action type (pointer, crosshair, resize, hand) |
| 257 | All caches must be bounded — no unbounded growth; LRU or size-limited |
| 258 | Repaint regions must be minimal — avoid full-scene invalidation unless layout has changed |

### Vendor Boundary (259–308)

| # | Rule |
|---|---|
| 259 | Vendor identification is explicit — derived only from credential store or device metadata; never inferred from hostname, IP, or topology position |
| 260 | Vendor-to-driver mapping is a single-source table — no duplication across modules |
| 261 | Unsupported vendor must return explicit `unsupported_vendor` status — never fallback silently to closest match |
| 262 | Parser selection is deterministic — one vendor maps to exactly one parser; no multi-parser attempts |
| 263 | Parser dispatch fails fast — invalid vendor string raises error immediately, never silently defaults |
| 267 | Command execution order is deterministic — no dynamic reordering based on prior output |
| 269 | Parsers must tolerate whitespace variation, line wrapping, and CLI pagination artifacts |
| 270 | Parsers must ignore non-relevant CLI banners, login warnings, and prompts |
| 271 | Parser output must be normalised into canonical models — raw vendor CLI output never leaks beyond the parser layer |
| 272 | Missing fields in parser output must be explicit (None or enum value) — never silently omitted |
| 273 | Vendor error messages must be detected and mapped to structured error states |
| 281 | CLI timeouts must be handled explicitly — timeout is a distinct state, not a failure |
| 282 | SSH/CLI failures must return a structured error object — no unhandled exceptions propagating upward |
| 283 | Partial CLI output must be marked as incomplete — never treated as a valid full result |
| 285 | Interface naming must be normalised across vendors (GigabitEthernet0/1, Ethernet1, etc. → canonical form) |
| 286 | IP addresses must be normalised to CIDR notation internally |
| 287 | MAC addresses must be normalised to lowercase colon-separated format |
| 288 | Route protocols must be normalised to canonical strings (ospf, bgp, static, connected, etc.) |
| 289 | Administrative distance and metric fields must be explicitly typed and validated — never inferred |
| 290 | Vendor-specific protocol codes (O IA, D EX, etc.) must map to canonical protocol enums |
| 291 | ECMP entries are stored individually by next-hop — LPM selects one winner per Rule 127; ECMP is never silently collapsed |
| 292 | Recursive routes must be resolved or explicitly marked unresolved — never partially represented |
| 293 | Default routes must be explicitly flagged — not inferred by prefix length alone |
| 294 | Null routes and discard routes must be explicitly represented |
| 296 | VRF context must always be explicit in parser output — never implied |
| 298 | Per-device parser state must be isolated — no shared mutable state between device parse operations |
| 301 | New vendor additions must include fabricator mock data for synthetic scenario testing |
| 302 | Vendor test coverage must include malformed, partial, and edge-case CLI outputs |
| 304 | Config parser must distinguish between absence and default value — never collapse the two |
| 305 | Vendor-specific security constructs (ACLs, policies) must be parsed into canonical model before analysis |
| 306 | Any vendor-specific assumption must be documented in code — no implicit tribal knowledge |
| 307 | Cross-vendor comparisons must operate on normalised models only — never on raw CLI output |
| 308 | Vendor layer is a hard boundary — no upstream layer (trust, hypothesis, compositor, UI) may depend on vendor-specific constructs |

---

## Rules 309–330 — Golden Baselines & Cortex (Session 45)

### Golden Baselines — Domain & Scope (309–314)

| # | Rule |
|---|---|
| 309 | Baselines define expected runtime operational state only — counts, thresholds, activity levels. Structural assertions (protocol presence, topology alignment) belong to the consistency checker |
| 310 | BaselineProfile is the operator-authored document. It is Pydantic v2 frozen, versioned (auto-increment), and checksummed (SHA-256 of content fields excluding metadata) |
| 311 | None on any BaselineProfile field means "no opinion" — the corresponding BL-rule does not fire. None is never silently interpreted as a default value |
| 312 | ResolvedBaseline uses the NOT_SET sentinel (singleton) for unresolved fields. NOT_SET is falsy. A field that is NOT_SET after full resolution means no profile in the chain had an opinion — the rule is skipped entirely |
| 313 | Baseline profiles are scoped: `scope="device"` targets a single device by name; `scope="role"` targets all devices sharing a role. Vendor and environment_id are optional narrowing filters (empty = match any) |
| 314 | Fabricator baseline profiles use `environment_id="synthetic"` — they are invisible outside Fabricator runs. Real operator profiles never use the "synthetic" environment_id |

### Golden Baselines — Resolution (315–318)

| # | Rule |
|---|---|
| 315 | Profile resolution is per-field, not per-profile. The priority chain is: device-scoped → role+vendor+env → role+vendor → role-only. First non-None value wins for each field independently |
| 316 | Resolution must be deterministic: same (device_name, role, vendor, environment_id, profiles) → same ResolvedBaseline, always |
| 317 | Weight is taken from the most specific matching profile (first in priority chain), not merged |
| 318 | Profile resolution is a pure function — no side effects, no DB reads, no UI imports. Caller provides all profiles; the resolver only filters and merges |

### Golden Baselines — Evaluation (319–323)

| # | Rule |
|---|---|
| 319 | Baseline evaluation runs post-collection, pre-ranking. Pipeline order: collect → normalize → baseline evaluate → rank → hypothesis → compositor |
| 320 | Baseline rules (BL-001 through BL-013) fire only when the resolved field is not NOT_SET AND the corresponding metric is not None. Missing data produces no finding — never a reduced-confidence guess |
| 321 | Confidence tiers for baseline findings: full collection = 1.0, stale device = 0.85. Error devices are skipped entirely (no findings emitted) |
| 322 | When both warning and critical thresholds are set for the same metric (CPU, memory), a value exceeding the critical threshold emits only the critical finding — the warning is suppressed to avoid duplicate signals |
| 323 | BaselineFinding normalizes to the same dict shape as consistency and tunnel findings for the ranking pipeline. Source field = "baseline". Finding keys follow the pattern `baseline:{rule_id}:{device_name}` |

### Golden Baselines — Persistence (324–325)

| # | Rule |
|---|---|
| 324 | Baseline profiles persist in SQLite with a composite index on (scope, scope_value, vendor, environment_id). Profile updates auto-increment version and archive the previous version to baseline_profile_history. Deletions archive before removing |
| 325 | Profile names are unique (UNIQUE constraint). Profile IDs are UUIDs. History rows are append-only and never deleted |

### Cortex (326–330)

| # | Rule |
|---|---|
| 326 | The Cortex command vocabulary lives in `_CORTEX_HELP` in `cortex_bar.py` — Python code, not external files. It ships inside the EXE. The `help` command renders it in the dropdown |
| 327 | Cortex commands that produce output render results in the status bar — never in modal dialogs, never in the Cortex dropdown itself (except `help` which is read-only display) |
| 328 | Cortex verb parsing order: path/trace → help → baseline → refresh routes → mode commands → isolate/find/show. First match wins; later blocks are unreachable for that input |
| 329 | Baseline Cortex commands open and close their own BaselineStore instance per invocation — no long-lived DB connections from UI code |
| 330 | Every new Cortex command must be added to `_CORTEX_HELP` in the same commit — the vocabulary is the source of truth for discoverability |

---

## Rules 331–333 — Environment Context (Session 89)

| # | Rule |
|---|---|
| 331 | Environment state has one runtime source of truth: `core.env_context.EnvironmentContext`. A single instance lives on MainWindow. `app_settings.json` is persistence only — read once on boot via `EnvironmentContext.hydrate()`, written as a side-effect of `EnvironmentContext.set()`. No runtime code may read `app_settings` for live env state. |
| 332 | Every env-sensitive panel exposes the public contract `refresh_for_environment(env_id: int) -> None` and is registered with `EnvironmentContext.register()` at MainWindow construction time. Adding a new env-aware mode requires exactly one `env_ctx.register(panel.refresh_for_environment, name=...)` call — no other wiring. |
| 333 | Env-sensitive code paths must use the shared `CredentialStore` injected from `MainWindow`. Bare `CredentialStore()` construction is prohibited in all UI and UI-adjacent code. Core worker functions accept `cred_store` as a parameter from their caller. The only permissible bare construction is inside `MainWindow` itself during the one-time ownership construction in `__init__`, and inside test fixtures. Violations are architectural regressions. |

---

## Explanation Compositor Rules (E-001 to E-013)

These rules govern which explanations fire and in what order. They are separate from the numbered architecture rules but live here as part of the canonical rule record.

| Rule | Family | Severity | Weight | MinEvidence |
|---|---|---|---|---|
| E-001 | spof_active_fault | critical | 90 | 2 |
| E-002 | drift_consistency_breach | warning | 80 | 2 |
| E-003 | role_expectation_violation | warning | 70 | 2 |
| E-004 | tunnel_concentration_under_fault | warning | 60 | 2 |
| E-005 | blast_radius_outlier | warning | 50 | 2 |
| E-006 | drift_without_active_fault | info | 30 | 1 |
| E-007 | clean_but_critical | info | 25 | 1 |
| E-008 | finding_concentration | warning | 65 | 2 |
| E-009 | transit_risk_under_fault | critical | 85 | 2 |
| E-010 | multi_source_state_breach | warning | 75 | 3 |
| E-011 | unexplained_high_impact | info | 55 | 1 |
| E-012 | causal_cascade (from hypothesis) | critical | 95 | 2 |
| E-013 | contradictory_signals | warning | 88 | 2 |

E-005 and E-011 require `failure_domain_is_spof=True` or `failure_domain_isolated_count > 0` to fire.
Sort order: tier_rank DESC → intra_tier_score DESC → family ASC → device_name ASC.

---

## UI — ASSESS Panel

**Rule 201** — The ASSESS panel is the one-button audit surface. Its `_build_ui()` layout follows `Assess_Panel.html` from the Opus 4.7 mockup and must not diverge without a corresponding mockup update. Header (42px), scrollable body with three sections (Devices, Progress, Results), each section is a `QFrame#AssessSec` with a 30px `QFrame#AssessSecHdr` title bar.

**Rule 202** — The ASSESS device table has six columns in this fixed order: checkbox, Hostname, Host, Vendor, Port, Status. Hostname is the stretch column. Vendor is rendered as a tag-pill via `setCellWidget`, not a plain text item.

---

## Maintenance

- Rule numbers are permanent. A retired rule is marked SUPERSEDED or REMOVED with reason.
- New rules are added at the next available number in the appropriate section, or at the end.
- Every new session: verify this file is loaded in Project Knowledge before writing any code.
- Rule additions require a note in the session history of the handover doc.
