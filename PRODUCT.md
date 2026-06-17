# PRODUCT.md — Anthracite

> **Doctrine pointer.** Anthracite V1 doctrine lives in
> `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md`. Where this file
> conflicts with the source of truth (notably the "topology is the crown
> jewel" framing — Anthracite V1 opens into HOME / Environment Command
> Centre, not topology), the source of truth wins. See also the
> mode/engine map and the industrial visual law under `docs/`.

## Mission

Anthracite is a **living network intelligence cockpit**. A local-first desktop
application that gives network engineers a single visual, agentic surface for
understanding, operating, and reasoning about their networks in real time.

Topology is the crown jewel. Everything else orbits the topology view.

## Persona

Senior network engineer / NetOps lead. Multi-vendor environments (initial target:
7 vendors). Spends their day staring at CLI, vendor consoles, Grafana, and
disconnected scripts. Wants one cockpit that breathes with the network.

## Value Pillars

1. **Living topology.** Information topology and live topology, both 2D and 3D
   selectable, with animated link state. Not a static diagram — a heartbeat.
2. **Sentinel.** Always-on detection layer. Watches state, surfaces anomalies,
   gates human attention.
3. **Cortex.** Reasoning layer. Local model + memory + retrieval. Answers
   "why is this happening" questions grounded in topology and history.
4. **Forge.** Authoring + automation surface. Turn cockpit insight into
   reusable artifacts (playbooks, scripts, change sets).
5. **Obsidian memory.** Markdown-first project memory. Decisions, stages,
   agent notes, build log — all browsable, all greppable.
6. **Claude / Codex workflow.** Deterministic repo checks, Graphify refresh,
   docs, and validation keep the operator loop predictable while Claude and
   Codex stay in their lanes.

## Anti-Pillars

- Not a NMS clone. Not yet-another-monitoring-dashboard.
- Not cloud-first. Local-first, single-operator workstation.
- Not Python. Not PyQt. Not Three.js.
- Not a port of the old PyQt prototype. Old repo and ObsidianAnthracite are
  reference truth for *what the product is*, never for *how the new build
  works*.

## V1 Visual System

- Dark cockpit theme. Charcoal / anthracite base; cyan-blue accent.
- Babylon.js for all 3D. Animated links, selectable 2D/3D topology modes.
- React + TypeScript for shell, panels, forms.
- Monospace data, sans-serif UI. No emojis in chrome.

## Stage Map

| Stage | Name                          | Output |
|-------|-------------------------------|--------|
| V1A   | Ground Zero Repo Factory      | Empty cockpit, scaffold, tooling. **← current** |
| V1B   | Topology Engine               | Babylon graph, layers, switchable 2D/3D |
| V1C   | Sentinel Skeleton             | Event surface, anomaly hooks |
| V1D   | Cortex Skeleton               | Local LLM bridge, memory wiring |
| V1E   | Forge Skeleton                | Playbook authoring surface |
| V1F   | First Vertical Slice          | One vendor live → topology → sentinel → cortex |
