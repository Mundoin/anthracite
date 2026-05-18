import { describe, expect, it } from "vitest";
import { getHierarchyView } from "../hierarchySource";
import { ROW_SEEDS } from "../hierarchySeeds";
import type { Environment, EnvironmentReadiness } from "../../types/environment";

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
    const expectedSum = ROW_SEEDS.reduce((acc, s) => acc + (s.id === "apex-prod-emea" ? 2184 : 0) + (s.id === "apex-prod-amer" ? 3041 : 0) + (s.id === "apex-prod-apac" ? 1604 : 0) + (s.id === "apex-edge-retail" ? 1648 : 0) + (s.id === "apex-staging-emea" ? 312 : 0) + (s.id === "apex-lab-london" ? 64 : 0) + (s.id === "apex-iso-mtn-dc" ? 188 : 0) + (s.id === "apex-tenant-novax" ? 904 : 0), 0);
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
