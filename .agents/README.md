# .agents — Anthracite rig state

This directory is the **AgentOps per-rig store** for Anthracite. It is
**git-ignored**. Do not commit anything from here.

## What lives here

AgentOps writes things like:

- `.agents/learnings/` — accumulated rig-local learnings.
- `.agents/sessions/` — session snapshots / handoffs.
- `.agents/state.json` — current AO state.
- `.agents/compiled/` — compiled knowledge wiki (`ao compile`).

Structure is owned by `ao`. Hand-editing is discouraged.

## How to use AgentOps in this rig

From the repo root in PowerShell:

```powershell
ao status                       # what's loaded, where we are
ao goals validate --json        # parse GOALS.md cleanly
ao goals measure                # run gates (Git Bash must win over WSL stub)
ao research "<question>"        # read-only investigation
ao plan "<scope>"               # multi-path planning
ao retro                        # after surprises or stage boundaries
ao handoff                      # at session boundary
ao compile                      # build compiled knowledge wiki
```

From Claude Code (slash skills, mirror of the above):

```
/status     /inject     /research   /plan
/pre-mortem /review     /retro      /handoff
```

Heavy commands (`/rpi`, `/crank`, `/evolve`, `/autodev`, `/swarm`,
`/codex-team`) require explicit stage scope from Bujar — agents do not
self-invoke these.

## Windows quirks (apply here too)

See global `~/.claude/CLAUDE.md`:

- `ao goals init --template <name>` is broken on Windows — drop the flag.
- Gate runs need Git Bash to win over the WSL stub on PATH.
- After `ao hooks install`, hook command paths must be forward-slashed.

## Cross-rig consolidation

Cross-rig knowledge harvesting happens at parent (`D:\Repos\`) via
`ao harvest`, which promotes deduped learnings to `~/.agentops/`. This rig
does not write outside `.agents/`.
