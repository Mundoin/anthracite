# AGENTS.md - Anthracite (Codex contract)

> Pair file: [`CLAUDE.md`](./CLAUDE.md). Keep both aligned; asymmetry is a bug.

## 1. Project Identity

Anthracite v1 is a fresh build of a local-first network intelligence desktop
application. It is not a port and not an extraction of the old PyQt repo.
`D:\Repos\_NEXUS` and `ObsidianAnthracite` are legacy reference truth only,
never current code sources.

## 2. Current Path and Branch

- Repo path: `/home/bujar/Repos/anthracite`
- Current branch: `main`
- Workstation: CachyOS

## 3. Source of Truth / Read Order

1. Read `AGENTS.md`.
2. Read `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md`.
3. Read `docs/architecture/MODES_AND_ENGINES_MAP.md`.
4. Read `docs/architecture/ENGINE_AND_API_BOUNDARIES.md`.
5. Read `docs/architecture/BUILD_SEQUENCE.md`.
6. Read `docs/design/INDUSTRIAL_VISUAL_LAW.md`.
7. Read `docs/architecture/STACK_DECISION_TAURI_PROBATION.md`.
8. Read `CLAUDE.md`, `README.md`, `PRODUCT.md`, `GOALS.md`, and
   `obsidian/ANTHRACITE_INDEX.md` before proposing architecture or stages.

## 4. Agent Operating Rules

- Bujar is the product owner and sole commit/push authority.
- No commit or push unless Bujar explicitly asks.
- OpenCode config is global only at `~/.config/opencode/opencode.jsonc`.
- Do not add repo-local OpenCode config or any `.opencode/` folder.
- Use `ws dev anthracite status`, `check`, `full`, `dev`, `claude`, `codex`,
  and `opencode` where useful.
- Use `.ai-bridge/current-plan.md` and `.ai-bridge/codex-report.md` for Codex
  handoff/report workflow when asked.
- Product logic is deterministic unless a doc explicitly scopes AI-assisted
  behavior.
- Keep the source-of-truth doctrine current when architecture or stage work
  changes.
- Product and visual work must respect the industrial visual law.
- Compiler green is not automatically product/visual green.

## 5. Tooling Contract

- Inspect before editing.
- Prefer targeted reads over broad searches.
- `graphify` is navigation support only; source docs remain the source of truth.
- Use `graphify query`, `graphify path`, or `graphify explain` when they answer
  the question faster than raw file search.
- Use the project map when doing repo-status, roadmap, stage orientation, or
  deferred-boundary work.
- Keep repo workflow inside this tree unless Bujar explicitly asks otherwise.

## 6. Git Rules

- No commit unless Bujar explicitly asks.
- No push unless Bujar explicitly asks.
- No branch creation, reset, rebase, clean, or destructive git operation unless
  explicitly requested.
- Keep changes scoped to the files in the task.

## 7. Validation / Check Guidance

- Use `ws dev anthracite status` or `ws dev anthracite check` first when
  orienting.
- Use `ws dev anthracite full` for a broader repo health pass.
- Use `ws dev anthracite dev`, `ws dev anthracite claude`, `ws dev anthracite
  codex`, or `ws dev anthracite opencode` when you need the corresponding
  helper lane.
- Validate Anthracite work with the smallest relevant checks after edits.
- For visual changes, browser checks matter; compiler green is not visual green.
- Preserve the existing validation commands from `CLAUDE.md`.

## 8. Anthracite-Specific Product / Architecture Notes

- Anthracite is a local-first network intelligence desktop application.
- Current doctrine wins over old “topology is the crown jewel” framing; V1
  opens into HOME / Environment, not topology-only.
- Preserve the Sentinel / Cortex / Forge boundaries.
- Keep the industrial visual law current and follow it.
- `D:\Repos\_NEXUS` is legacy Windows reference material only.
- The current repo is Linux/CachyOS-first for workflow.
- Keep long-lived notes in `obsidian/`; update `obsidian/ANTHRACITE_INDEX.md`
  and stage/decision records when meaningful repo state changes.
