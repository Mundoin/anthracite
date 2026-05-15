# V1A — Ground Zero Repo Factory

**Status:** in progress (scaffold landed 2026-05-15).
**Goal:** create the fresh Anthracite v1 repo foundation from ground zero.

## Scope

- Tauri 2 + React + TypeScript desktop app scaffold.
- Babylon.js dependency installed; placeholder canvas component.
- Rust/Tauri backend skeleton (single `ping` command).
- Repo docs: README, PRODUCT, GOALS, AGENTS, CLAUDE.
- Obsidian vault structure under `obsidian/`.
- `.agents/` rig scaffold + AO usage docs.
- PowerShell automation under `tools/`.

## Non-scope

- No topology logic. No Sentinel logic. No Cortex logic. No Forge logic.
- No code copied from `D:\Repos\_NEXUS`.
- No product discovery from the old repo this stage.

## Acceptance

App launches via `pnpm tauri:dev`, showing:

- Title `ANTHRACITE` with stage marker.
- Left panel: Topology / Layers (placeholder).
- Right panel: Inspector / Sentinel / Cortex (placeholder).
- Bottom panel: Events / Agents / Build (placeholder).
- Center: dark empty Babylon scene.

Gates pass:

- `pnpm typecheck` clean.
- `pnpm build` clean.
- `cargo check` in `src-tauri/` clean.
- `tools/validate.ps1` clean.

## Open follow-ups for V1B

- Topology engine spike (Babylon graph, layer toggles).
- Decide 2D layout strategy (force-directed vs hierarchical default).
- Sentinel surface shape.

## Links

- [Index](../ANTHRACITE_INDEX.md)
- [PRODUCT](../../PRODUCT.md)
- [GOALS](../../GOALS.md)
