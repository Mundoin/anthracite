/**
 * Fixture-backed Live Collection Simulator — pure helpers (V1AU).
 *
 * Maps a V1AT dry-run plan command to a synthetic raw neighbour output
 * bundle and builds a V1AP/V1AQ raw-import request from it. No SSH, no
 * device contact, no credentials, no host/IP transport. The output of
 * this layer is fed back through the existing
 * `importTopologyNeighborOutput` route; V1AU never opens a side channel
 * to the evidence store or topology engine.
 *
 * Doctrine: `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` V1AU.
 */

import type {
  RawNeighborEvidenceImportRequest,
  RawNeighborSourceKind,
  TopologyEvidenceImportMode,
} from "../../types/topology";
import type {
  LiveCollectionCommandPlan,
  LiveCollectionDryRunPlan,
  LiveCollectionSourceKind,
} from "../../types/liveCollection";
import {
  LIVE_COLLECTION_SIMULATOR_FIXTURES,
  type LiveCollectionSimulatorFixture,
} from "./liveCollectionSimulatorFixtures";

export type LiveCollectionSimulationUnavailableReason =
  | "plan_not_ready"
  | "plan_unsupported"
  | "no_commands_in_plan"
  | "no_fixture_for_command"
  | "missing_environment";

export interface LiveCollectionSimulationGate {
  readonly can_simulate: boolean;
  readonly reason: LiveCollectionSimulationUnavailableReason | null;
  readonly note: string;
}

const HONESTY_NOTE =
  "Fixture simulator. No device contact. Bundled synthetic raw output only.";

/**
 * Closed-set gate over the dry-run plan. Mirrors V1AT readiness
 * semantics so the simulator never proceeds when the planner already
 * said `not_ready` or `unsupported`.
 */
export function canSimulateLiveCollectionPlan(
  plan: LiveCollectionDryRunPlan | null,
  environmentId: string | null,
): LiveCollectionSimulationGate {
  if (plan === null) {
    return {
      can_simulate: false,
      reason: null,
      note: "Run the dry-run planner first.",
    };
  }
  if (environmentId === null || environmentId === "") {
    return {
      can_simulate: false,
      reason: "missing_environment",
      note: "Simulation requires a selected environment scope.",
    };
  }
  if (plan.readiness === "unsupported") {
    return {
      can_simulate: false,
      reason: "plan_unsupported",
      note: "Simulation unavailable: planner reports this platform unsupported.",
    };
  }
  if (plan.readiness !== "ready") {
    return {
      can_simulate: false,
      reason: "plan_not_ready",
      note: "Simulation unavailable: plan is not ready.",
    };
  }
  if (plan.commands.length === 0) {
    return {
      can_simulate: false,
      reason: "no_commands_in_plan",
      note: "Simulation unavailable: plan has no commands.",
    };
  }
  return {
    can_simulate: true,
    reason: null,
    note: HONESTY_NOTE,
  };
}

/**
 * Map a planned command to its synthetic fixture. Returns null when no
 * fixture exists (e.g. Junos CDP, IOS-XR CDP). Caller must render an
 * honest "no fixture" message rather than fabricating output.
 */
export function findSimulationFixture(
  plan: LiveCollectionDryRunPlan,
  command: LiveCollectionCommandPlan,
): LiveCollectionSimulatorFixture | null {
  if (plan.platform === null) {
    return null;
  }
  return (
    LIVE_COLLECTION_SIMULATOR_FIXTURES.find(
      (f) =>
        f.platform === plan.platform &&
        f.source_kind === command.source_kind &&
        f.command === command.command,
    ) ?? null
  );
}

/** True iff at least one planned command has a fixture available. */
export function planHasAnySimulationFixture(
  plan: LiveCollectionDryRunPlan,
): boolean {
  return plan.commands.some(
    (cmd) => findSimulationFixture(plan, cmd) !== null,
  );
}

function toRawSourceKind(
  kind: LiveCollectionSourceKind,
): RawNeighborSourceKind {
  // LiveCollectionSourceKind is a strict subset of RawNeighborSourceKind.
  return kind;
}

export interface BuildSimulationRequestArgs {
  readonly plan: LiveCollectionDryRunPlan;
  readonly command: LiveCollectionCommandPlan;
  readonly fixture: LiveCollectionSimulatorFixture;
  readonly environmentId: string;
  readonly importMode: TopologyEvidenceImportMode;
}

/**
 * Build a V1AP/V1AQ raw-output import request from a simulator
 * fixture + the planned import mode. The result is the exact wire
 * shape `importTopologyNeighborOutput` already accepts — no new
 * command, no bypass of the parser path, no host/IP/credential field.
 */
export function buildRawNeighborImportFromSimulation(
  args: BuildSimulationRequestArgs,
): RawNeighborEvidenceImportRequest {
  const { fixture, command, environmentId, importMode } = args;
  const label = `simulator: ${fixture.label} (${command.command})`;
  return {
    environment_id: environmentId,
    local_node: fixture.local_node,
    source_kind: toRawSourceKind(command.source_kind),
    platform_hint: command.platform_hint,
    raw_text: fixture.raw_output,
    source_label: label,
    mode: importMode,
  };
}

export const LIVE_COLLECTION_SIMULATOR_HONESTY_NOTE = HONESTY_NOTE;

/**
 * Convenience selector for the UI: returns all `(command, fixture)`
 * pairs that have a fixture for the given plan, in plan order.
 */
export interface SimulationPair {
  readonly command: LiveCollectionCommandPlan;
  readonly fixture: LiveCollectionSimulatorFixture;
}
export function listSimulationPairs(
  plan: LiveCollectionDryRunPlan,
): readonly SimulationPair[] {
  const pairs: SimulationPair[] = [];
  for (const cmd of plan.commands) {
    const f = findSimulationFixture(plan, cmd);
    if (f !== null) pairs.push({ command: cmd, fixture: f });
  }
  return pairs;
}
