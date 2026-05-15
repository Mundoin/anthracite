# 2026-05-15 — Stack lock for Anthracite v1

**Status:** accepted.

## Decision

Anthracite v1 is built on:

- Tauri 2 (Rust, edition 2021, MSRV 1.77).
- React 18 + TypeScript 5.
- Vite 5.
- Babylon.js 7 (not Three.js).
- pnpm 11 (not npm, not yarn).
- Windows-first.

## Context

The old PyQt prototype at `D:\Repos\_NEXUS` is reference truth for the
*product*, not the *implementation*. The new build deliberately discards the
Python stack to escape:

- PyQt6 / Qt6 packaging pain on Windows.
- ChromaDB / Ollama Python bindings drift.
- PyInstaller binary size and signing friction.

Tauri 2 ships a tiny native wrapper around WebView2 (already on Win11), giving
us a small footprint and a real web UI engine. Babylon.js is selected over
Three.js for first-class TypeScript types, a coherent built-in scene graph,
and better tooling for the topology-heavy use case.

## Consequences

- No code from `_NEXUS` is portable. Every subsystem is re-thought.
- Operator workflow is React/TS-shaped from day 1.
- Cross-platform later (macOS / Linux) is achievable via Tauri but not a v1
  goal.

## Supersedes

Nothing. This is the first decision in the v1 vault.
