# GOALS.md — Anthracite v1

> AgentOps v4 fitness spec. Validate with `ao goals validate --json`.
> Measure with `ao goals measure` (Git Bash must win over WSL stub on PATH).

## Mission

Build Anthracite — a living network intelligence cockpit — from ground zero on a
Tauri + React + Babylon.js + Rust stack. Topology-first. Local-first. Windows-first.

## North Stars

- Topology is the crown jewel — every stage strengthens it.
- Cockpit launches and renders cleanly on Windows on every commit.
- Agents (AO / Claude / Codex) can navigate the repo from `README.md` alone.
- Obsidian memory keeps pace with code — every stage produces a stage doc.

## Anti-Stars

- No Python. No PyQt. No Three.js.
- No code copied from `D:\Repos\_NEXUS`.
- No green-field rewrites of subsystems that already work in this repo.
- No commits without `pnpm typecheck` and `cargo check` passing.

## Directives

- Tauri 2 only. Tauri 1 is forbidden.
- Babylon.js 7+ for all 3D / 2D scene rendering.
- pnpm is the only package manager. No npm/yarn lockfiles checked in.
- Rust edition 2021. MSRV 1.77.
- All new modules must be greppable from `README.md` ↔ `PRODUCT.md` ↔ vault.

## Gates

| id              | description                                | check                                    | weight | type   |
|-----------------|--------------------------------------------|------------------------------------------|--------|--------|
| typecheck       | TypeScript compiles with no errors         | `pnpm typecheck`                         | 3      | hard   |
| frontend-build  | Vite frontend builds                       | `pnpm build`                             | 2      | hard   |
| rust-check      | Rust workspace passes cargo check          | `cd src-tauri && cargo check`            | 3      | hard   |
| lint            | ESLint clean (zero warnings)               | `pnpm lint`                              | 1      | soft   |
| docs-present    | Required docs exist                        | `tools/validate.ps1`                     | 2      | hard   |
| vault-present   | Obsidian vault scaffolding exists          | `tools/validate.ps1`                     | 1      | soft   |
| no-python       | No Python source in repo                   | `tools/validate.ps1`                     | 3      | hard   |
| no-threejs      | No Three.js dependency in package.json     | `tools/validate.ps1`                     | 3      | hard   |
| ops-ready       | Agent operating layer green (Graphify+AO)  | `tools/ops-readiness.ps1`                | 3      | hard   |
| ops-layer-doc   | Operating-layer doc + 0001 decision exist  | `tools/validate.ps1`                     | 2      | hard   |
