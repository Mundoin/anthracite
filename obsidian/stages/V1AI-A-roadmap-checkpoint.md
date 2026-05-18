---
stage: V1AI-A
status: complete · docs-only
arc: ROADMAP-CHECKPOINT
date: 2026-05-18
---

# V1AI-A — Product Roadmap + Agent-Local Hygiene Plan

## Why we stopped after V1AI

V1AI closed the Discovery import persistence pipe end-to-end:
empty → preview → import → persist → real `inventory_view`. With one full
operator-mutating pipe alive, broader architectural direction becomes the
constraint, not the next adjacent feature. Auto-continuing into one more
Discovery sub-stage would be tunnel vision. Stop and produce a repo-visible
roadmap so the next direction survives chat context loss.

## Three-stage roadmap summary

Compressed from six rough directions into three stage groups
(full text in [`docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md`](../../docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md)):

1. **Stage Group 1 — Product Spine Map + Parallel Parser Prep.**
   Lock the canonical spine
   `Environment → INTAKE → Discovery → Topology → Diagnose/Assess/Operate/Build`.
   Open the Codex parser-prep lane (corpus + intent material) per
   [`docs/roadmap/PARSER_PREP_LANE.md`](../../docs/roadmap/PARSER_PREP_LANE.md).
   Parser-depth and vendor priorities frozen in the roadmap doc.
2. **Stage Group 2 — Topology Comes Alive.**
   Rust Topology Engine reads persisted Discovery records, projects
   deterministic topology read model. Then visible topology workspace v1
   under strict Anthracite visual law.
3. **Stage Group 3 — Inventory Operations + Diagnose Seed.**
   Discovery inventory browser (env filter, device list, record detail,
   source metadata, honest states). Discovery mutation semantics deferred
   to an explicit later stage. Diagnose / path-trace seed reads
   Topology facts.

## Agent-local hygiene decision

- `.codex/` and `nul` added to `.gitignore` so Codex's local working tree
  and the stray Windows redirect artifact never re-enter staging.
- `AGENTS.md` and `CLAUDE.md` are already tracked AND under live local
  edits. **This stage does not touch their content** and does not change
  their tracking state. Their working-tree modifications are not part of
  this stage commit.
- Recommended policy (documented, not executed in V1AI-A):
  - **Repo-stable** agent docs (cross-session, cross-machine truth) belong
    under `docs/ops/` or `docs/agent/`.
  - **Mutable local** agent working files (per-machine, per-session) belong
    locally and should not be tracked.
  - The currently-tracked `AGENTS.md` / `CLAUDE.md` need an explicit
    separate decision from Bujar if they should be removed from version
    control. Two paths:
    - **Suggested command (do not run without Bujar's go-ahead):**
      `git update-index --skip-worktree AGENTS.md CLAUDE.md`
      to keep them tracked at their last committed version but ignore
      local edits going forward.
    - **Full removal:** `git rm --cached AGENTS.md CLAUDE.md` then add to
      `.gitignore`. Higher blast radius — historical references and links
      would break.
  - V1AI-A flags the issue; V1AI-B (or whatever Bujar picks) can land the
    chosen resolution if needed.

## Next decision required from Bujar

Pick one:

- Start **Stage Group 1**: open the Codex parser-prep lane and / or
  begin the parser-depth deepening for IOS-XE.
- Start **Stage Group 2**: open the Topology Engine spine stage.
- Start **Stage Group 3**: open the Discovery inventory browser stage.
- Redirect entirely — the roadmap is a checkpoint, not a contract.

No implementation prompt fires until that choice lands.

## Files in this stage

- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` (new)
- `docs/roadmap/PARSER_PREP_LANE.md` (new)
- `obsidian/stages/V1AI-A-roadmap-checkpoint.md` (new — this file)
- `obsidian/ANTHRACITE_INDEX.md` (appended V1AI-A row)
- `.gitignore` (appended `.codex/` and `nul`)

No product code changed. No engine, mode, parser, test, or asset touched.
