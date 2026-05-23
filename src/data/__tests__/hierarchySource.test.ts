import { describe, expect, it } from "vitest";
import { getHierarchyView, projectLifecycleEnvironmentToRow, mergeLifecycleEnvironments } from "../hierarchySource";
import { ROW_SEEDS } from "../hierarchySeeds";
import type { Environment, EnvironmentReadiness } from "../../types/environment";
import type { LocalEnvironmentRecord } from "../../types/localEnvironment";

const EMPTY_INPUT = { envs: [] as readonly Environment[], readiness: null };

const MOCK_READINESS: EnvironmentReadiness = {
  active_environment_id: "apex-prod-emea",
  active_environment_name: "EMEA Production",
  lifecycle_state: "ready",
  total_environments: 8,
  total_devices: 9945,
  healthy_count: 5,
  degraded_count: 2,
  offline_count: 1,
  unknown_count: 0,
  message: "ok",
};

const MOCK_ENVS: readonly Environment[] = [
  { id: "apex-prod-emea", name: "EMEA Production", kind: "production", device_count: 2500, status: "healthy", updated_at: "2026-05-18T10:00:00Z", summary: "" },
  { id: "apex-prod-apac", name: "APAC Production", kind: "production", device_count: 1700, status: "degraded", updated_at: "2026-05-18T10:00:00Z", summary: "" },
];

describe("getHierarchyView", () => {
  it("empty envs + null readiness → all blocks demo, rows match seed fallbacks", () => {
    const v = getHierarchyView(EMPTY_INPUT);
    expect(v.sourceState).toBe("demo");
    expect(Object.values(v.sourceStateByBlock).every((s) => s === "demo")).toBe(true);
    expect(v.rows).toHaveLength(ROW_SEEDS.length);
    expect(v.rows[0].id).toBe("apex-prod-emea");
    // fallback status from ROW_STATUS_FALLBACK
    expect(v.rows[0].status).toBe("ok");
    // fallback devices from DEVICE_FALLBACK
    expect(v.rows[0].devices).toBe(2184);
    expect(v.inspectorIdentity).toHaveLength(0);
  });

  it("populated envs + readiness → live overlay applied; per-block state still demo (H1)", () => {
    const v = getHierarchyView({ envs: MOCK_ENVS, readiness: MOCK_READINESS });
    const emeaRow = v.rows.find((r) => r.id === "apex-prod-emea");
    const apacRow = v.rows.find((r) => r.id === "apex-prod-apac");
    expect(emeaRow?.devices).toBe(2500); // live overlay
    expect(emeaRow?.status).toBe("ok");  // healthy → ok
    expect(apacRow?.devices).toBe(1700);
    expect(apacRow?.status).toBe("warn"); // degraded → warn
    // mixed real+seed → still demo per H1
    expect(v.sourceStateByBlock.rows).toBe("demo");
    expect(v.sourceState).toBe("demo");
  });

  it("listKpis uses readiness.total_devices when present, falls back to row sum", () => {
    const withReadiness = getHierarchyView({ envs: [], readiness: MOCK_READINESS });
    expect(withReadiness.listKpis[0].value).toBe((9945).toLocaleString("en-US"));

    const fallback = getHierarchyView(EMPTY_INPUT);
    const expectedSum = ROW_SEEDS.reduce((acc, s) => acc + (s.id === "apex-prod-emea" ? 2184 : 0) + (s.id === "apex-prod-amer" ? 3041 : 0) + (s.id === "apex-prod-apac" ? 1604 : 0) + (s.id === "apex-edge-retail" ? 1648 : 0) + (s.id === "apex-staging-emea" ? 312 : 0) + (s.id === "apex-lab-london" ? 64 : 0) + (s.id === "apex-iso-mtn-dc" ? 188 : 0) + (s.id === "apex-tenant-novax" ? 904 : 0) + (s.id === "env-fab-demo" ? 3 : 0), 0);
    expect(fallback.listKpis[0].value).toBe(expectedSum.toLocaleString("en-US"));
  });

  it("deterministic: same input produces deeply equal results", () => {
    const a = getHierarchyView({ envs: MOCK_ENVS, readiness: MOCK_READINESS });
    const b = getHierarchyView({ envs: MOCK_ENVS, readiness: MOCK_READINESS });
    expect(a.rows).toEqual(b.rows);
    expect(a.listKpis).toEqual(b.listKpis);
    expect(a.sourceState).toBe(b.sourceState);
    expect(a.sourceStateByBlock).toEqual(b.sourceStateByBlock);
    expect(a.inspectorIdentity).toEqual(b.inspectorIdentity);
  });

  it("aggregate sourceState reflects weakest block — any non-real → not real", () => {
    const v = getHierarchyView(EMPTY_INPUT);
    const allBlocks = Object.values(v.sourceStateByBlock);
    const hasNonReal = allBlocks.some((s) => s !== "real");
    expect(hasNonReal).toBe(true);
    expect(v.sourceState).not.toBe("real");
  });

  it("inspectorIdentity is demo when readiness is null", () => {
    const v = getHierarchyView({ envs: [], readiness: null });
    expect(v.sourceStateByBlock.inspectorIdentity).toBe("demo");
    expect(v.sourceState).toBe("demo");
  });

  it("inspectorIdentity is real when readiness and envs match; other blocks remain demo (H1)", () => {
    const v = getHierarchyView({ envs: MOCK_ENVS, readiness: MOCK_READINESS });
    expect(v.sourceStateByBlock.inspectorIdentity).toBe("real");
    expect(v.sourceStateByBlock.rows).toBe("demo");
    expect(v.sourceState).toBe("demo");
    expect(v.inspectorIdentity[0]?.v).toBe("apex-prod-emea");
  });

  it("inspectorIdentity is demo when readiness id has no matching env", () => {
    const v = getHierarchyView({ envs: [], readiness: MOCK_READINESS });
    expect(v.sourceStateByBlock.inspectorIdentity).toBe("demo");
  });

  it("structural shape: detailDomains/Events/Sites/inspectorHealth non-empty, relocation preserved", () => {
    const v = getHierarchyView(EMPTY_INPUT);
    expect(v.detailDomains.length).toBeGreaterThan(0);
    expect(v.detailEvents.length).toBeGreaterThan(0);
    expect(v.detailSites.length).toBeGreaterThan(0);
    expect(v.inspectorHealth.length).toBeGreaterThan(0);
    expect(v.inspectorInterfaces.length).toBeGreaterThan(0);
    // spot-check relocation accuracy
    expect(v.detailDomains[0].id).toBe("l2");
    expect(v.detailEvents[0].sev).toBe("err");
    expect(v.inspectorHealth[0].label).toBe("CPU avg");
  });
});

describe("projectLifecycleEnvironmentToRow", () => {
  it("projects environment_id → row.id", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "env-fab-demo",
      name: "Demo Fabricated",
      scenario_id: "scenario-001",
      scenario_name: "Demo",
      kind: "synthetic",
      provenance: "Fabricated",
      device_count: 3,
      link_count: 2,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "running",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.id).toBe("env-fab-demo");
  });

  it("sets group implicit: status idle, region 'Synthetic · Local'", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "test-env",
      name: "Test",
      scenario_id: "s1",
      scenario_name: "Test Scenario",
      kind: "synthetic",
      provenance: "Test",
      device_count: 5,
      link_count: 2,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.status).toBe("idle");
    expect(row.region).toBe("Synthetic · Local");
  });

  it("builds scope from scenario_name and provenance", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "test",
      name: "Test",
      scenario_id: "s1",
      scenario_name: "MyScenario",
      kind: "synthetic",
      provenance: "MyProvenance",
      device_count: 1,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.scope).toBe("MyScenario · MyProvenance");
  });

  it("uses device_count from record", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "test",
      name: "Test",
      scenario_id: "s1",
      scenario_name: "Scenario",
      kind: "synthetic",
      provenance: "Prov",
      device_count: 42,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.devices).toBe(42);
  });

  it("sets owner 'Environment Creator'", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "test",
      name: "Test",
      scenario_id: "s1",
      scenario_name: "S",
      kind: "synthetic",
      provenance: "P",
      device_count: 1,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.owner).toBe("Environment Creator");
  });

  it("maps sync_state clean → last 'synced'", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "test",
      name: "Test",
      scenario_id: "s1",
      scenario_name: "S",
      kind: "synthetic",
      provenance: "P",
      device_count: 1,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.last).toBe("synced");
  });

  it("maps sync_state local-only → last 'synced'", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "test",
      name: "Test",
      scenario_id: "s1",
      scenario_name: "S",
      kind: "synthetic",
      provenance: "P",
      device_count: 1,
      link_count: 1,
      config_count: 1,
      sync_state: "local-only",
      lifecycle_state: "ready",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.last).toBe("synced");
  });

  it("maps sync_state other → last 'dirty'", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "test",
      name: "Test",
      scenario_id: "s1",
      scenario_name: "S",
      kind: "synthetic",
      provenance: "P",
      device_count: 1,
      link_count: 1,
      config_count: 1,
      sync_state: "dirty",
      lifecycle_state: "ready",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.last).toBe("dirty");
  });

  it("sets readiness, l2, l3, ebgp to 100 and drift, events to 0", () => {
    const record: LocalEnvironmentRecord = {
      environment_id: "test",
      name: "Test",
      scenario_id: "s1",
      scenario_name: "S",
      kind: "synthetic",
      provenance: "P",
      device_count: 1,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    };
    const row = projectLifecycleEnvironmentToRow(record);
    expect(row.readiness).toBe(100);
    expect(row.l2).toBe(100);
    expect(row.l3).toBe(100);
    expect(row.ebgp).toBe(100);
    expect(row.drift).toBe(0);
    expect(row.events).toBe(0);
  });
});

describe("mergeLifecycleEnvironments", () => {
  it("returns baseRows unchanged when no lifecycle records", () => {
    const baseRows = [ROW_SEEDS[0], ROW_SEEDS[1]].map((s) => ({
      id: s.id,
      status: "ok" as const,
      region: s.region,
      scope: s.scope,
      devices: 100,
      sites: s.sites,
      readiness: s.readiness,
      l2: s.l2,
      l3: s.l3,
      ebgp: s.ebgp,
      drift: s.drift,
      events: s.events,
      owner: s.owner,
      last: s.last,
    }));
    const result = mergeLifecycleEnvironments(baseRows, []);
    expect(result).toEqual(baseRows);
  });

  it("prepends lifecycle records to baseRows", () => {
    const baseRows: ReturnType<typeof projectLifecycleEnvironmentToRow>[] = [];
    const lifecycleRecords: LocalEnvironmentRecord[] = [
      {
        environment_id: "env-1",
        name: "Env1",
        scenario_id: "s1",
        scenario_name: "Scenario1",
        kind: "synthetic",
        provenance: "Prov1",
        device_count: 10,
        link_count: 1,
        config_count: 1,
        sync_state: "clean",
        lifecycle_state: "ready",
      },
    ];
    const result = mergeLifecycleEnvironments(baseRows, lifecycleRecords);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("env-1");
  });

  it("filters out baseRows whose id collides with lifecycle id", () => {
    const collideRecord: LocalEnvironmentRecord = {
      environment_id: "env-fab-demo",
      name: "Demo",
      scenario_id: "s1",
      scenario_name: "Demo",
      kind: "synthetic",
      provenance: "Fab",
      device_count: 3,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    };
    const baseRow = projectLifecycleEnvironmentToRow({
      environment_id: "other",
      name: "Other",
      scenario_id: "s2",
      scenario_name: "Other",
      kind: "synthetic",
      provenance: "Other",
      device_count: 5,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    });
    const collideRow = projectLifecycleEnvironmentToRow(
      { ...collideRecord, environment_id: "env-fab-demo" } as LocalEnvironmentRecord
    );
    const baseRows = [collideRow, baseRow];
    const result = mergeLifecycleEnvironments(baseRows, [collideRecord]);
    // collideRow dropped; baseRow kept; lifecycle row prepended
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("env-fab-demo"); // lifecycle
    expect(result[1].id).toBe("other");         // baseRow
  });

  it("preserves non-colliding baseRows", () => {
    const lifecycle: LocalEnvironmentRecord = {
      environment_id: "lc-1",
      name: "LC1",
      scenario_id: "s1",
      scenario_name: "LC",
      kind: "synthetic",
      provenance: "LC",
      device_count: 10,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    };
    const baseRow = projectLifecycleEnvironmentToRow({
      environment_id: "base-1",
      name: "Base1",
      scenario_id: "s2",
      scenario_name: "Base",
      kind: "synthetic",
      provenance: "Base",
      device_count: 20,
      link_count: 1,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "ready",
    });
    const result = mergeLifecycleEnvironments([baseRow], [lifecycle]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("lc-1");
    expect(result[1].id).toBe("base-1");
  });

  it("handles multiple lifecycle records and baseRows", () => {
    const lcRecords: LocalEnvironmentRecord[] = [
      {
        environment_id: "lc-1",
        name: "LC1",
        scenario_id: "s1",
        scenario_name: "LC1",
        kind: "synthetic",
        provenance: "LC",
        device_count: 5,
        link_count: 1,
        config_count: 1,
        sync_state: "clean",
        lifecycle_state: "ready",
      },
      {
        environment_id: "lc-2",
        name: "LC2",
        scenario_id: "s2",
        scenario_name: "LC2",
        kind: "synthetic",
        provenance: "LC",
        device_count: 6,
        link_count: 1,
        config_count: 1,
        sync_state: "clean",
        lifecycle_state: "ready",
      },
    ];
    const baseRows = [
      projectLifecycleEnvironmentToRow({
        environment_id: "base-1",
        name: "Base1",
        scenario_id: "s3",
        scenario_name: "Base1",
        kind: "synthetic",
        provenance: "Base",
        device_count: 10,
        link_count: 1,
        config_count: 1,
        sync_state: "clean",
        lifecycle_state: "ready",
      }),
      projectLifecycleEnvironmentToRow({
        environment_id: "base-2",
        name: "Base2",
        scenario_id: "s4",
        scenario_name: "Base2",
        kind: "synthetic",
        provenance: "Base",
        device_count: 11,
        link_count: 1,
        config_count: 1,
        sync_state: "clean",
        lifecycle_state: "ready",
      }),
    ];
    const result = mergeLifecycleEnvironments(baseRows, lcRecords);
    expect(result).toHaveLength(4);
    expect(result[0].id).toBe("lc-1");
    expect(result[1].id).toBe("lc-2");
    expect(result[2].id).toBe("base-1");
    expect(result[3].id).toBe("base-2");
  });

  it("env-fab-demo lifecycle record projected correctly and replaces seed", () => {
    const fabDemoRecord: LocalEnvironmentRecord = {
      environment_id: "env-fab-demo",
      name: "Fabricated Demo",
      scenario_id: "fab-scenario",
      scenario_name: "Fabricated Demo",
      kind: "synthetic",
      provenance: "Fabricated",
      device_count: 3,
      link_count: 2,
      config_count: 1,
      sync_state: "clean",
      lifecycle_state: "running",
    };
    // Seed-based fallback row (from ROW_SEEDS)
    const seedRow: ReturnType<typeof projectLifecycleEnvironmentToRow> = {
      id: "env-fab-demo",
      status: "idle",
      region: "Synthetic · Local",
      scope: "Demo · Fabricated",
      devices: 3,
      sites: 1,
      readiness: 100,
      l2: 100,
      l3: 100,
      ebgp: 100,
      drift: 0,
      events: 0,
      owner: "Fabricator",
      last: "fabricated",
    };
    const result = mergeLifecycleEnvironments([seedRow], [fabDemoRecord]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("env-fab-demo");
    expect(result[0].owner).toBe("Environment Creator"); // lifecycle, not seed "Fabricator"
    expect(result[0].last).toBe("synced");           // lifecycle, not seed "fabricated"
  });
});
