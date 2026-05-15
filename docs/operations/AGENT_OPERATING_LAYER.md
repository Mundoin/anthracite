# Anthracite V1 Agent Operating Layer

## Purpose

Anthracite V1 is built with agents from day one, but agent work must leave
evidence, memory, maps, and validation behind. The Agent Operating Layer is
the repo-local system that lets Claude and Codex work together without forcing
Bujar to act as a manual relay.

**This layer must exist before serious product coding begins.**

V1A scaffolds the cockpit shell. V1A's *amended* gate requires the operating
layer to be green before any V1B product work starts.

---

## Roles

### Bujar

Product owner, final judge, final commit/push authority.

- Decides direction and stage scope.
- Approves or rejects commits.
- Runs the test suite. Agents never run tests.

### Claude — main coding agent

Handles product-shaping work:

- Architecture decisions and information design.
- Tauri / React / TypeScript implementation.
- Rust core implementation.
- Babylon.js topology cockpit work.
- Major refactors.
- Decisions that change Anthracite's product value.

Claude is preserved for work that moves the product. Mechanical chores route
to Codex when possible.

### Codex — admin / operations agent

Handles low-risk repo and tooling work:

- `tools/status.ps1` style status checks.
- Graphify refresh and health probes.
- AgentOps / AO health probes.
- Validation script execution.
- Handoff packaging.
- Generated-report sanity checks.
- Doc-index upkeep.
- Repo hygiene (lockfile drift, stale build artifacts, etc.).

Codex reduces operator tax and preserves Claude for higher-value coding.

When in doubt: **setup → Codex / AGENTS.md wins. Intent → Claude / CLAUDE.md wins.**

---

## Tools

### Graphify — repo map + architecture radar

Outputs:

- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`
- optional `graph.html` when size allows

Agents consult Graphify **before** answering codebase / architecture
questions. Graphify answers:

- What files matter?
- What modules connect?
- What changed since last graph?
- Where are god nodes / risky-to-touch areas?
- What should an agent inspect before editing X?

`graphify-out/` is git-ignored.

### AgentOps / AO — agent memory + trust factory

Owns `.agents/`:

- `runs/` — run packets.
- `decisions/` — agent-recorded decisions.
- `findings/` — investigation results.
- `learnings/` — promoted lessons.
- `patterns/` — reusable patterns.
- `council/` — multi-judge verdicts.
- `handoff/` — session boundary packets.

AO is **active workflow infrastructure**, not a decorative status command.
Used for:

- Session start context (`/inject`, `/status`).
- Decisions (`ao decision …`).
- Handoffs (`/handoff`, `ao handoff`).
- Retros (`/retro`).
- Reviews (`/review`).
- Evidence capture.
- Trust gates.

`.agents/` is git-ignored. Cross-rig consolidation happens at parent
(`D:\Repos\`) via `ao harvest` → `~/.agentops/`.

### Obsidian — human-readable build memory

`obsidian/` tracks:

- `stages/` — one per build stage.
- `decisions/` — ADR-style, dated.
- `agents/` — agent-specific notes.
- `build-log/` — chronological session log.

The old `ObsidianAnthracite` vault remains the *old product* truth archive.
This repo's `obsidian/` folder tracks the *new* Anthracite V1 build.

---

## Required Graphify Setup

Recommended install:

```powershell
winget install astral-sh.uv
uv tool install graphifyy
graphify --version
```

Wire Claude on Windows:

```powershell
graphify install --platform windows
```

Wire Codex:

```powershell
graphify install --platform codex
```

Initial repo graph from repo root:

```powershell
graphify .
```

PowerShell note: use `graphify .` — **never** `/graphify .`. The slash form
is for Claude chat invocation, not PowerShell.

### Health probe

```powershell
powershell -ExecutionPolicy Bypass -File tools/graphify-status.ps1
```

Returns non-zero unless:

- `graphify` is on PATH.
- `graphify-out/GRAPH_REPORT.md` exists.
- `graphify-out/graph.json` exists.

---

## Required AgentOps Setup

Claude Code plugin:

```powershell
claude plugin marketplace add boshu2/agentops
claude plugin install agentops@agentops-marketplace
```

Codex on Windows:

```powershell
irm https://raw.githubusercontent.com/boshu2/agentops/main/scripts/install-codex.ps1 | iex
```

`ao` CLI on Windows:

```powershell
irm https://raw.githubusercontent.com/boshu2/agentops/main/scripts/install-ao.ps1 | iex
ao version
```

First-time bootstrap inside this rig:

```powershell
ao doctor
ao quick-start
```

And inside Claude chat:

```
/quickstart
```

### Health probe

```powershell
powershell -ExecutionPolicy Bypass -File tools/agentops-status.ps1
```

Returns non-zero unless:

- `ao` is on PATH.
- `ao version` succeeds.
- `ao doctor` exits 0 (or with only documented warnings).
- `.agents/` exists and has at least the README scaffold.

---

## AO Usage Rules (in this rig)

- `/status` at every meaningful session start.
- `/inject` when prior `.agents/` knowledge may affect the current stage.
- `/research` for read-only investigation.
- `/plan` or `/pre-mortem` before multi-path or risky changes.
- `/review` before commit when diff carries risk.
- `/retro` after surprises or stage boundaries.
- `/handoff` at session boundaries.

Heavy commands (`/rpi`, `/crank`, `/evolve`, `/autodev`, `/swarm`,
`/codex-team`) **require explicit stage scope from Bujar**. Agents never
self-invoke these.

Do not pretend that writing `ao …` inside normal prompt text executed
AgentOps. Use real `ao` CLI in PowerShell or real AO slash skills in chat.

---

## Codex Admin Workflow

Codex's day-to-day surface:

1. Run `tools/status.ps1` to take a quick read of the rig.
2. Run `tools/ops-readiness.ps1` to confirm the layer is green.
3. Refresh Graphify when the codebase has moved (`graphify .`).
4. Run `ao doctor` periodically and after any AO version bump.
5. Package handoffs at session boundaries.
6. Sanity-check generated reports (no broken links, no stale stage refs).
7. Repo hygiene: stale dist/, orphan files, lockfile drift.

Codex commits are allowed for narrow scopes (docs, scripts, generated
artifacts) with Bujar approval. Codex never pushes without instruction.

---

## Claude Coding Workflow

1. Read `obsidian/ANTHRACITE_INDEX.md` and current stage note first.
2. Consult `graphify-out/GRAPH_REPORT.md` before architectural / navigation
   work.
3. Use `/inject` when `.agents/` knowledge is relevant.
4. Plan via `/plan` for multi-step work; `/pre-mortem` for risky stages.
5. Implement with TDD where the standard skill applies.
6. Update `obsidian/` (stage note + new decision file) as part of the work,
   never as a separate doc pass.
7. `/retro` after surprises or fixes.
8. Hand off via `/handoff` at session boundaries.

Claude never `git push`. Claude never runs `pytest` (there is no Python).
Claude does not run the full test suite to "verify" — Bujar does that.

---

## Evidence Requirements

Every non-trivial change leaves at least one trail:

- An obsidian stage note update **or** a new decision note.
- An `.agents/` entry if AO is active (run packet, decision, finding).
- A passing `tools/validate.ps1`.
- A passing `tools/ops-readiness.ps1` (or an explicit reason it's red).

No evidence ⇒ work doesn't count.

---

## Readiness Checklist

Operating layer is **READY** when **all** of:

- [ ] Git repo exists at `D:\Repos\anthracite`.
- [ ] `pnpm install` succeeds (or scaffold is intentionally pending).
- [ ] `graphify` command on PATH.
- [ ] `graphify-out/GRAPH_REPORT.md` exists.
- [ ] `graphify-out/graph.json` exists.
- [ ] `ao` command on PATH.
- [ ] `ao doctor` completes cleanly.
- [ ] `.agents/` exists with at least a README.
- [ ] `AGENTS.md` and `CLAUDE.md` both contain the Claude/Codex role split.
- [ ] `obsidian/decisions/0001-agent-operating-layer-first.md` exists.

`tools/ops-readiness.ps1` is the mechanical truth. Read its output, not your
memory.

---

## Failure Modes

| Symptom                                       | Likely cause                                       | Fix |
|-----------------------------------------------|----------------------------------------------------|-----|
| `graphify` not found                          | Not installed for current shell                    | `uv tool install graphifyy`; reopen shell |
| `graphify-out/` missing                       | Never generated                                    | `graphify .` from repo root |
| `ao` not found                                | Not on PATH                                        | Re-run AO Windows installer; verify `~\bin\ao.exe` |
| `ao doctor` complains "WSL no distros"        | WSL stub winning over Git Bash                     | Prepend `C:\Program Files\Git\bin` to PATH |
| AO hooks fail with `bash: C:Users…`           | Backslashes eaten by harness                       | Normalize `~/.claude/settings.json` hook paths to `/` |
| `ao goals init --template <x>` fails          | Known Windows bug                                  | Drop `--template`; use plain `ao goals init --non-interactive` |
| `pnpm` script fails with `ERR_PNPM_IGNORED_BUILDS` | esbuild not approved                          | `pnpm-workspace.yaml` → `allowBuilds: { esbuild: true }` |

---

## Exact Validation Commands

```powershell
powershell -ExecutionPolicy Bypass -File tools/status.ps1
powershell -ExecutionPolicy Bypass -File tools/graphify-status.ps1
powershell -ExecutionPolicy Bypass -File tools/agentops-status.ps1
powershell -ExecutionPolicy Bypass -File tools/ops-readiness.ps1
powershell -ExecutionPolicy Bypass -File tools/validate.ps1
ao version
ao doctor
graphify --version
graphify .
pnpm typecheck
pnpm build
cd src-tauri ; cargo check
```

---

## Green Condition

Product coding for V1B and beyond starts only when:

```
tools/ops-readiness.ps1 → READY
```

If `ops-readiness.ps1` reports `NOT READY`, agents work on the operating
layer, not on product. No exceptions without an explicit Bujar override.

## Git Policy for `.agents/`

AgentOps/AO is active operational infrastructure, but `.agents/` is local runtime state in this repo.

Anthracite tracks durable build truth in:
- `docs/operations/`
- `obsidian/`
- `AGENTS.md`
- `CLAUDE.md`
- `GOALS.md`
- `PRODUCT.md`

AO learnings, handoffs, findings, and run packets can be manually promoted into tracked docs or Obsidian notes when they are worth preserving.

Default rule:
- keep `.agents/` on disk
- keep AO active
- keep `.agents/` ignored by Git
- commit only curated knowledge, not raw AO churn
