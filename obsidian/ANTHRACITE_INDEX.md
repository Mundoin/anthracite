# ANTHRACITE_INDEX

Entry point for the Anthracite v1 project memory vault.

## What this vault is

Long-form, markdown-first project memory for **Anthracite** — a living network
intelligence cockpit. This vault is the *narrative* counterpart to the code
and to `PRODUCT.md` / `GOALS.md`.

## Layout

- [`stages/`](./stages/) — one note per build stage (V1A, V1B, V1C, …).
- [`decisions/`](./decisions/) — ADR-style decisions, dated `YYYY-MM-DD-<slug>.md`.
- [`agents/`](./agents/) — agent-specific notes (Claude, Codex, AO).
- [`build-log/`](./build-log/) — chronological session log.

## Stage map

| Stage | Status        | Note |
|-------|---------------|------|
| V1A   | complete      | [stages/V1A-ground-zero.md](./stages/V1A-ground-zero.md) |
| V1B   | complete      | Source of truth + architecture map |
| V1C   | complete      | [stages/V1C-environment-centre-spine.md](./stages/V1C-environment-centre-spine.md) |
| V1D   | complete      | [stages/V1D-environment-persistence.md](./stages/V1D-environment-persistence.md) |
| V1E   | complete      | [stages/V1E-environment-readiness.md](./stages/V1E-environment-readiness.md) |
| V1E-B | complete      | [stages/V1E-B-graphite-light.md](./stages/V1E-B-graphite-light.md) |
| V1E-C | complete      | [stages/V1E-C-noc-light.md](./stages/V1E-C-noc-light.md) |
| V1E-D | complete      | [stages/V1E-D-noc-dark.md](./stages/V1E-D-noc-dark.md) |
| V1E-E | complete      | [stages/V1E-E-noc-light-refinement.md](./stages/V1E-E-noc-light-refinement.md) |
| V1E-F | complete      | [stages/V1E-F-enterprise-polish.md](./stages/V1E-F-enterprise-polish.md) |
| V1E-G | complete      | [stages/V1E-G-typography-tune.md](./stages/V1E-G-typography-tune.md) |
| V1F   | complete · landed visual baseline | [stages/V1F-anthracite-master-shell-environment-port.md](./stages/V1F-anthracite-master-shell-environment-port.md) |
| V1G   | complete · engine buildout pivot (docs-only) | [stages/V1G-engine-buildout-pivot.md](./stages/V1G-engine-buildout-pivot.md) |
| V1H   | complete · Vendor Registry Engine | [stages/V1H-vendor-registry-engine.md](./stages/V1H-vendor-registry-engine.md) |
| V1I   | complete · Canonical Network Model | [stages/V1I-canonical-network-model.md](./stages/V1I-canonical-network-model.md) |
| V1J   | complete · Config Detection Engine | [stages/V1J-config-detection-engine.md](./stages/V1J-config-detection-engine.md) |
| V1J-A | complete · Motor Room Architecture Rules (docs-only) | [stages/V1J-A-motor-room-architecture-rules.md](./stages/V1J-A-motor-room-architecture-rules.md) |
| V1K   | complete · Cisco IOS / IOS XE parser L1/L2 | [stages/V1K-cisco-iosxe-parser.md](./stages/V1K-cisco-iosxe-parser.md) |
| V1L   | complete · Fixture corpus + receipt projection | [stages/V1L-fixture-corpus-and-receipts.md](./stages/V1L-fixture-corpus-and-receipts.md) |
| V1M   | complete · Juniper Junos parser L1/L2 | [stages/V1M-juniper-junos-parser.md](./stages/V1M-juniper-junos-parser.md) |
| V1N   | complete · Arista EOS parser L1/L2 + cross-vendor invariant | [stages/V1N-arista-eos-parser.md](./stages/V1N-arista-eos-parser.md) |
| V1N-A | complete · Parser contract hardening + debt ledger cleanup | [stages/V1N-A-parser-contract-hardening.md](./stages/V1N-A-parser-contract-hardening.md) |
| V1O   | complete · Config Intake operator surface (single config, stateless) | [stages/V1O-config-intake-surface.md](./stages/V1O-config-intake-surface.md) |
| V1O-A | complete · Config splitter engine + multi-device intake (batch view, drill-down) | [stages/V1O-A-multi-device-intake.md](./stages/V1O-A-multi-device-intake.md) |
| V1O-B | complete · Archive intake engine (zip / tar / tar.gz) + provenance + collapsed inventory | [stages/V1O-B-archive-intake.md](./stages/V1O-B-archive-intake.md) |
| V1P   | complete · Validator Engine + MGMT-HYG rule pack v1 + FindingsPanel above ReceiptDisplay | [stages/V1P-validator-engine.md](./stages/V1P-validator-engine.md) |
| V1P-A | complete · INTAKE two-lane workspace + semantic role tokens + lane-item accent rails | [stages/V1P-A-intake-visual-hierarchy.md](./stages/V1P-A-intake-visual-hierarchy.md) |
| V1Q   | complete · Batch Run Workspace — Analyse batch, per-row Stage + Findings, RunSummaryStrip, drill-down stored results | [stages/V1Q-batch-run-workspace.md](./stages/V1Q-batch-run-workspace.md) |
| V1R   | complete · Batch Run Export — deterministic JSON + Markdown copy actions, raw config omitted by default | [stages/V1R-batch-run-export.md](./stages/V1R-batch-run-export.md) |
| V1S   | complete · Save Batch Run Export to Files — Save JSON / Save Markdown, zero-dep file save via File System Access API | [stages/V1S-save-batch-run-export-files.md](./stages/V1S-save-batch-run-export-files.md) |
| V1T   | complete · Mixed archive corpus + BatchRun density proof (24 devices, 3 vendors) before sort/filter UI | [stages/V1T-mixed-archive-density-proof.md](./stages/V1T-mixed-archive-density-proof.md) |
| V1U   | complete · DIAG-HYG rule pack v1 + Cisco NX-OS parser L1/L2 (4th vendor, cross-vendor invariant) | [stages/V1U-diag-hyg-and-nxos.md](./stages/V1U-diag-hyg-and-nxos.md) |
| V1W   | halted · premise contradicted repo state (no ModeRail / App-root edits attempted); see V1W-R | — |
| V1W-R | complete · ASSESS artifact viewer — read-only viewer of V1R BatchRun export JSON, reuses FindingsPanel + RunSummaryStrip | [stages/V1W-R-assess-artifact-viewer.md](./stages/V1W-R-assess-artifact-viewer.md) |
| V1X   | complete · ASSESS triage v1 — search, severity/rule chips, by-device/by-severity views, per-device collapse; pure helpers in triage.ts | [stages/V1X-assess-triage-v1.md](./stages/V1X-assess-triage-v1.md) |

## V1J-A adaptation

V1G/V1H/V1I/V1J built the first engine spine. **V1J-A** imports and
adapts the old Anthracite motor-room rules into compact V1 law before
parser work proceeds. Forge / learning / drill / puzzle / journal /
sound / protocol workshop families are explicitly quarantined.

New architecture docs:

- [`../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md`](../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md) — V1 engine law (layering, evidence, pipeline, vendor/parser, confidence, baseline, snapshot, Cortex).
- [`../docs/architecture/ENGINE_PIPELINE_CONTRACT.md`](../docs/architecture/ENGINE_PIPELINE_CONTRACT.md) — nine-stage pipeline contract + old→V1 concept map.
- [`../docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md`](../docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md) — active-now / activate-later / quarantined categories.

Next stage: **V1K — Cisco IOS / IOS XE parser L1/L2.**

## V1G pivot

Direction D / Anthracite Master remains the visual source of truth. Mainline
work now moves to the motor room: vendor intelligence + deterministic engines.

New architecture docs:

- [`../docs/architecture/VENDOR_ENGINE_PLAN.md`](../docs/architecture/VENDOR_ENGINE_PLAN.md) — engine roster, L0–L6 maturity, V1H → V1O sequence.
- [`../docs/architecture/CANONICAL_NETWORK_MODEL.md`](../docs/architecture/CANONICAL_NETWORK_MODEL.md) — internal vendor-neutral network language.
- [`../docs/architecture/VENDOR_PLATFORM_REGISTRY.md`](../docs/architecture/VENDOR_PLATFORM_REGISTRY.md) — first vendor / platform target list.

## Conventions

- Vault is read-write for both Claude and Codex.
- One note per stage. Stage notes link forward and backward.
- Decisions are dated and never deleted — superseded decisions link to their
  replacement.
- Build log entries are short and chronological. Stage notes are the long form.

## Source-of-truth pointers

- Product: [`../PRODUCT.md`](../PRODUCT.md)
- Goals: [`../GOALS.md`](../GOALS.md)
- Codex: [`../AGENTS.md`](../AGENTS.md)
- Claude: [`../CLAUDE.md`](../CLAUDE.md)
- README: [`../README.md`](../README.md)
