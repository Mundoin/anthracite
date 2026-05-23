# V1BE-A — Hardware Preview Runtime Hardening

**Date:** 2026-05-23
**Status:** landed
**Scope:** lazy-load the hardware preview so Babylon ships in its own chunk; main shell stays lean
**Branch:** `main` after V1BE → working tree
**Authority:** Bujar (scope set; git held)

## Mission

V1BE landed the hardware kit runtime port. Side effect: the main bundle
grew to 5.84 MB because every shell mount pulled Babylon, even though
Babylon is only needed on the `?preview=hardware-kit` route. V1BE-A
moves that weight behind a real lazy boundary so the normal app pays
nothing for the preview path.

## Files changed

```
edit  src/App.tsx                        # React.lazy wrapper + Suspense fallback
edit  vite.config.ts                     # manualChunks → "babylon" chunk for @babylonjs/*
new   src/preview/__tests__/HardwareKitPreviewLazy.test.tsx  # 4 boundary tests
new   obsidian/stages/V1BE-A-hardware-preview-runtime-hardening.md
```

No changes to: `src/topology/hardware/*`, `src/preview/HardwareKitPreview.tsx`,
profile catalog, mesh ID format, preview URL, doctrine.

## How the lazy boundary works

```ts
// src/App.tsx
const HardwareKitPreview = lazy(() =>
  import("./preview/HardwareKitPreview").then((m) => ({
    default: m.HardwareKitPreview,
  })),
);

export default function App(): JSX.Element {
  if (isHardwareKitPreviewRoute()) {
    return (
      <Suspense fallback={<HardwareKitPreviewFallback />}>
        <HardwareKitPreview />
      </Suspense>
    );
  }
  return <AppMain />;
}
```

`React.lazy` returns a component whose import is deferred until first
render. Because the eager `import { HardwareKitPreview }` is gone, the
preview module — and everything it pulls (Babylon, materials, profiles,
builder) — drops out of the main entry chunk. Rollup then code-splits
the dynamic-import target into its own chunk.

`vite.config.ts` adds a `manualChunks` rule that pulls every
`node_modules/@babylonjs/*` module into a single `babylon` chunk so the
preview chunk itself stays small (25 kB) and the heavy weight sits in
one cacheable chunk.

The Suspense fallback is a tiny in-style placeholder (no design tokens
imported) so it renders synchronously without any extra payload.

## Bundle change

| Chunk                            | Before V1BE-A | After V1BE-A | Notes |
|----------------------------------|---------------|--------------|-------|
| `index-*.js` (main shell)        | 5,844.24 kB   | **724.11 kB** | gz 1,323 → 185 — ~8× smaller |
| `babylon-*.js`                   | (in index)    | **5,105.94 kB** | only fetched on preview route |
| `HardwareKitPreview-*.js`        | (in index)    | **25.35 kB** | preview component, lazy |
| `index-*.css`                    | 209.37 kB     | 206.74 kB    | preview CSS split out |
| `HardwareKitPreview-*.css`       | (in index)    | **2.63 kB** | preview CSS, lazy |

Bundle warning still fires on the `babylon` chunk because Babylon itself
is > 500 kB. That is intentional — the warning is about the *eager*
chunks, and this one is now deferred. We could silence by raising
`build.chunkSizeWarningLimit`, but leaving the warning visible keeps
future shell additions honest. Documented here so reviewers don't try
to "fix" it.

## Preview URL confirmed

```
pnpm dev → http://localhost:1420/?preview=hardware-kit
```

Unchanged. All 21 profiles still load (switch×5, router×5, firewall×5,
support×5, unknown×1). Pickable mesh IDs unchanged (`access48.port.17`,
`leaf32q.port.2031`, `unk1u.chassis.0`, etc.).

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (209 files, 2303 tests, 0 failures, +4 new)
pnpm build       → green (tsc + vite build, 5.28s)
```

New tests (4):
- `App.tsx` no longer eager-imports `HardwareKitPreview`
- `App.tsx` uses `React.lazy` with dynamic `import()`
- `App.tsx` wraps preview route in `<Suspense>`
- Suspense fallback ("loading hardware kit…") renders when preview
  query param is set

## Caveats

1. **`babylon` chunk size warning persists** — by design. The warning
   exists for *eagerly loaded* chunks; this one is deferred.
2. **No CSS preload for fallback** — fallback uses inline styles to
   avoid pulling any CSS chunk before the preview imports.
3. **First-paint cost on preview route** — operator now sees the
   fallback for the few ms it takes to fetch the lazy chunks (under
   Tauri's local file scheme, basically instant). Acceptable for a
   developer preview.
4. **No test of the resolved preview UI** — Babylon under jsdom is
   out of scope; existing `src/topology/hardware/__tests__/hardwareModel.test.ts`
   covers the model layer with `NullEngine`.

## Next candidate stages

1. **V1BF — Topology adapter interface** (per V1BD DETAIL contract).
2. **V1BG — State machine wiring** (MAP → FOCUSED → TRANSITION → ORBIT
   → DETAIL).

## AO orchestration report

- subagents: none (scope small + cross-file consistency dominated)
- Opus solo: 3 edits (App.tsx, vite.config.ts, lazy test), 1 fix-up
  edit after a test tried to render `<AppMain />` without its env
  context provider
- effectiveness: −5% tokens vs spawning Sonnet for inspection (would
  have over-fetched); Opus solo correct call
- recommendation: skip subagents for sub-100-line lazy-boundary moves
