import { describe, expect, it } from "vitest";
import {
  LIVE_COLLECTION_SIMULATOR_HONESTY_NOTE,
  buildRawNeighborImportFromSimulation,
  canSimulateLiveCollectionPlan,
  findSimulationFixture,
  listSimulationPairs,
  planHasAnySimulationFixture,
} from "../liveCollectionSimulator";
import { LIVE_COLLECTION_SIMULATOR_FIXTURES } from "../liveCollectionSimulatorFixtures";
import type {
  LiveCollectionDryRunPlan,
  LiveCollectionPlatform,
  LiveCollectionSourceKind,
} from "../../../types/liveCollection";
import type { TopologyEvidenceImportMode } from "../../../types/topology";

function plan(
  over: Partial<LiveCollectionDryRunPlan> = {},
): LiveCollectionDryRunPlan {
  return {
    readiness: "ready",
    environment_id: "env-core-eu1",
    target_label: "router-a",
    platform: "iosxe",
    raw_platform_hint: "iosxe",
    planned_import_mode: "merge",
    commands: [
      {
        source_kind: "lldp",
        command: "show lldp neighbors detail",
        read_only: true,
        raw_neighbor_source_kind: "lldp",
        platform_hint: "iosxe",
        planned_import_function: "importTopologyNeighborOutput",
        note: "Read-only LLDP neighbour command planned for Cisco IOS-XE.",
      },
    ],
    warnings: [],
    unsupported_reason: null,
    safety_checklist: [
      "Operator review required before any future collection.",
    ],
    honesty_note: "Dry-run plan only. No device contact is performed in V1AT.",
    ...over,
  };
}

function commandFor(
  platform: LiveCollectionPlatform,
  source: LiveCollectionSourceKind,
  command: string,
) {
  return {
    source_kind: source,
    command,
    read_only: true,
    raw_neighbor_source_kind: source,
    platform_hint: platform,
    planned_import_function: "importTopologyNeighborOutput",
    note: "",
  };
}

describe("liveCollectionSimulator — canSimulate gate", () => {
  it("blocks when plan is null", () => {
    const gate = canSimulateLiveCollectionPlan(null, "env");
    expect(gate.can_simulate).toBe(false);
  });

  it("blocks when environment id missing", () => {
    const gate = canSimulateLiveCollectionPlan(plan(), null);
    expect(gate.can_simulate).toBe(false);
    expect(gate.reason).toBe("missing_environment");
  });

  it("blocks when readiness is unsupported", () => {
    const gate = canSimulateLiveCollectionPlan(
      plan({ readiness: "unsupported", platform: "fortios", commands: [] }),
      "env-core-eu1",
    );
    expect(gate.can_simulate).toBe(false);
    expect(gate.reason).toBe("plan_unsupported");
  });

  it("blocks when readiness is not_ready", () => {
    const gate = canSimulateLiveCollectionPlan(
      plan({ readiness: "not_ready", commands: [] }),
      "env-core-eu1",
    );
    expect(gate.can_simulate).toBe(false);
    expect(gate.reason).toBe("plan_not_ready");
  });

  it("blocks when plan is ready but has no commands", () => {
    const gate = canSimulateLiveCollectionPlan(
      plan({ commands: [] }),
      "env-core-eu1",
    );
    expect(gate.can_simulate).toBe(false);
    expect(gate.reason).toBe("no_commands_in_plan");
  });

  it("allows simulation for a ready iosxe lldp plan", () => {
    const gate = canSimulateLiveCollectionPlan(plan(), "env-core-eu1");
    expect(gate.can_simulate).toBe(true);
    expect(gate.note).toBe(LIVE_COLLECTION_SIMULATOR_HONESTY_NOTE);
  });
});

describe("liveCollectionSimulator — fixture lookup", () => {
  it("finds an IOS-XE LLDP fixture for the canonical command", () => {
    const p = plan();
    const fx = findSimulationFixture(p, p.commands[0]);
    expect(fx).not.toBeNull();
    expect(fx?.platform).toBe("iosxe");
    expect(fx?.source_kind).toBe("lldp");
  });

  it("finds an NX-OS CDP fixture", () => {
    const cmd = commandFor("nxos", "cdp", "show cdp neighbors detail");
    const p = plan({ platform: "nxos", commands: [cmd] });
    const fx = findSimulationFixture(p, cmd);
    expect(fx).not.toBeNull();
    expect(fx?.platform).toBe("nxos");
    expect(fx?.source_kind).toBe("cdp");
  });

  it("returns null for Junos CDP (no fixture / parser support)", () => {
    const cmd = commandFor("junos", "cdp", "show cdp neighbors");
    const p = plan({ platform: "junos", commands: [cmd] });
    expect(findSimulationFixture(p, cmd)).toBeNull();
  });

  it("returns null for IOS-XR CDP (no fixture)", () => {
    const cmd = commandFor("iosxr", "cdp", "show cdp neighbors detail");
    const p = plan({ platform: "iosxr", commands: [cmd] });
    expect(findSimulationFixture(p, cmd)).toBeNull();
  });

  it("never has fixtures for unsupported/deferred platforms", () => {
    const forbidden: LiveCollectionPlatform[] = [
      "fortios",
      "mikrotik",
      "huawei_vrp",
      "nokia_sros",
    ];
    forbidden.forEach((p) => {
      expect(
        LIVE_COLLECTION_SIMULATOR_FIXTURES.find((f) => f.platform === p),
      ).toBeUndefined();
    });
  });

  it("listSimulationPairs preserves plan order and only includes pairs with fixtures", () => {
    const p = plan({
      platform: "junos",
      commands: [
        commandFor("junos", "lldp", "show lldp neighbors"),
        commandFor("junos", "cdp", "show cdp neighbors"),
      ],
    });
    const pairs = listSimulationPairs(p);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].command.source_kind).toBe("lldp");
  });

  it("planHasAnySimulationFixture is false when no command pairs match a fixture", () => {
    const p = plan({
      platform: "iosxr",
      commands: [commandFor("iosxr", "cdp", "show cdp neighbors detail")],
    });
    expect(planHasAnySimulationFixture(p)).toBe(false);
  });
});

describe("liveCollectionSimulator — buildRawNeighborImportFromSimulation", () => {
  it("produces a wire-shape raw import request with all required fields", () => {
    const p = plan();
    const command = p.commands[0];
    const fixture = findSimulationFixture(p, command);
    expect(fixture).not.toBeNull();
    if (!fixture) return;
    const req = buildRawNeighborImportFromSimulation({
      plan: p,
      command,
      fixture,
      environmentId: "env-core-eu1",
      importMode: "merge",
    });
    expect(req.environment_id).toBe("env-core-eu1");
    expect(req.local_node).toBe(fixture.local_node);
    expect(req.source_kind).toBe("lldp");
    expect(req.platform_hint).toBe("iosxe");
    expect(req.raw_text).toBe(fixture.raw_output);
    expect(req.mode).toBe("merge");
    expect(req.source_label).toContain("simulator:");
  });

  it("threads the planned import mode through the request", () => {
    const p = plan({ planned_import_mode: "append" });
    const command = p.commands[0];
    const fixture = findSimulationFixture(p, command);
    if (!fixture) throw new Error("fixture missing");
    const modes: TopologyEvidenceImportMode[] = ["replace", "append", "merge"];
    modes.forEach((mode) => {
      const r = buildRawNeighborImportFromSimulation({
        plan: p,
        command,
        fixture,
        environmentId: "env",
        importMode: mode,
      });
      expect(r.mode).toBe(mode);
    });
  });

  it("contains no host / IP / credential fields in the request keys", () => {
    const p = plan();
    const command = p.commands[0];
    const fixture = findSimulationFixture(p, command);
    if (!fixture) throw new Error("fixture missing");
    const req = buildRawNeighborImportFromSimulation({
      plan: p,
      command,
      fixture,
      environmentId: "env",
      importMode: "merge",
    });
    const keys = Object.keys(req);
    keys.forEach((k) => {
      expect(k).not.toMatch(/host|ip|password|credential|username|ssh/i);
    });
  });

  it("fixture raw_output is non-empty and references no live transport metadata", () => {
    LIVE_COLLECTION_SIMULATOR_FIXTURES.forEach((f) => {
      expect(f.raw_output.length).toBeGreaterThan(0);
      // No fabricated live indicators in fixture metadata.
      expect(f.label.toLowerCase()).toContain("synthetic");
      expect(f.label.toLowerCase()).not.toContain("live");
      expect(f.label.toLowerCase()).not.toContain("polling");
    });
  });
});
