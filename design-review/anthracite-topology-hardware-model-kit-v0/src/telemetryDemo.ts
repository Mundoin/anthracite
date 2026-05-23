// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ NOTE FOR OCC IMPLEMENTERS                                                   │
// │ This file is the canonical TypeScript source. In the preview it is loaded   │
// │ via Babel-standalone with the `typescript` preset, which only strips type │
// │ annotations — it does not resolve ES module syntax. Cross-file linkage is  │
// │ therefore done through `window.Anthracite*` globals (see end of file).   │
// │ When integrating into a real bundler (Vite/esbuild/tsc), restore the       │
// │ `import` / `export` keywords as needed.                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

// Anthracite — Hardware Model Kit · fake telemetry generator
//
// Produces synthetic up/down/warning/critical/unknown states per LED and
// per port so the preview can demo the model's hover/click affordances
// without a real backend wired up.
//
// In OCC, this whole file is replaced by the real telemetry subscription
// — the BuiltModel.setTelemetry() entrypoint stays the same.
declare const BABYLON: any;

type ModelTelemetry = {
  state:    TelemetryState;          // overall device state
  portsUp:  Set<number>;             // indices of live ports (by zone index)
  ledStates: Record<number, TelemetryState>;  // per-led state
};

/**
 * Generate a deterministic telemetry snapshot for a model. Same
 * (modelId, state) pair → same snapshot, so the preview is reproducible.
 */
function generateTelemetry(
  modelId: string,
  state: TelemetryState
): ModelTelemetry {
  // tiny seeded RNG so output is deterministic per (modelId, state)
  let seed = 0;
  const key = modelId + ':' + state;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return ((seed >>> 0) % 1000) / 1000;
  };

  const portsUp = new Set<number>();
  const ledStates: Record<number, TelemetryState> = {};

  let liveRatio = 0.55;
  if (state === 'down')     liveRatio = 0.0;
  if (state === 'warning')  liveRatio = 0.40;
  if (state === 'critical') liveRatio = 0.20;
  if (state === 'unknown')  liveRatio = 0.15;

  for (let i = 0; i < 96; i++) {
    if (rand() < liveRatio) portsUp.add(i);
  }

  // LED bank (up to 6 LEDs) typically maps SYS/FAN/PSU/MGMT/HA/...
  for (let i = 0; i < 6; i++) {
    if (state === 'critical' && i === 0) ledStates[i] = 'critical';
    else if (state === 'down') ledStates[i] = 'down';
    else if (state === 'warning' && i < 2) ledStates[i] = 'warning';
    else if (state === 'unknown') ledStates[i] = 'unknown';
    else ledStates[i] = 'up';
  }

  return { state, portsUp, ledStates };
}

(window as any).AnthraciteTelemetry = { generateTelemetry };
