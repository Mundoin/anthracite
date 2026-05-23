/**
 * Telemetry adapter.
 *
 * The demo implementation produces deterministic synthetic state so the
 * preview can exercise hover/click affordances without a real backend.
 * In production OCC, swap this for a live subscription; the
 * `TelemetryAdapter` interface and `BuiltModel.setTelemetry` seam stay
 * the same.
 *
 * Ported from design-review/anthracite-topology-hardware-model-kit-v0/src/telemetryDemo.ts
 * in stage V1BE.
 */

import type { TelemetryState } from "./types";

export interface ModelTelemetry {
  state: TelemetryState;
  portsUp: Set<number>;
  ledStates: Record<number, TelemetryState>;
}

export interface TelemetryAdapter {
  snapshot(modelId: string, state: TelemetryState): ModelTelemetry;
}

export function demoTelemetry(
  modelId: string,
  state: TelemetryState,
): ModelTelemetry {
  let seed = 0;
  const key = `${modelId}:${state}`;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return ((seed >>> 0) % 1000) / 1000;
  };

  const portsUp = new Set<number>();
  const ledStates: Record<number, TelemetryState> = {};

  let liveRatio = 0.55;
  if (state === "down") liveRatio = 0.0;
  else if (state === "warning") liveRatio = 0.40;
  else if (state === "critical") liveRatio = 0.20;
  else if (state === "unknown") liveRatio = 0.15;

  for (let i = 0; i < 96; i++) {
    if (rand() < liveRatio) portsUp.add(i);
  }
  // SFP + QSFP ranges
  for (let i = 1000; i < 1016; i++) {
    if (rand() < liveRatio) portsUp.add(i);
  }
  for (let i = 2000; i < 2016; i++) {
    if (rand() < liveRatio) portsUp.add(i);
  }

  for (let i = 0; i < 6; i++) {
    if (state === "critical" && i === 0) ledStates[i] = "critical";
    else if (state === "down") ledStates[i] = "down";
    else if (state === "warning" && i < 2) ledStates[i] = "warning";
    else if (state === "unknown") ledStates[i] = "unknown";
    else ledStates[i] = "up";
  }

  return { state, portsUp, ledStates };
}

export const demoTelemetryAdapter: TelemetryAdapter = {
  snapshot: demoTelemetry,
};
