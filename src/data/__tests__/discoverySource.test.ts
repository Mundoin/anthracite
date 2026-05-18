import { describe, expect, it } from "vitest";
import { toDiscoverySourceView } from "../discoverySource";
import type { DiscoveryInventoryView, DiscoveryDeviceRecord } from "../../types/discovery";

const mockRecord = (overrides?: Partial<DiscoveryDeviceRecord>): DiscoveryDeviceRecord => ({
  id: "dev-1",
  environment_id: "env-core-eu1",
  source_kind: "intake_import",
  confidence: null,
  last_seen: null,
  ...overrides,
});

const mockInventory = (overrides?: Partial<DiscoveryInventoryView>): DiscoveryInventoryView => ({
  environment_id: "env-core-eu1",
  source_state: "real",
  records: [],
  total_records: 0,
  message: "ok",
  ...overrides,
});

describe("toDiscoverySourceView", () => {
  it("maps empty inventory to DataSourceState 'empty'", () => {
    const view = mockInventory({
      source_state: "empty",
      records: [],
      total_records: 0,
    });
    const result = toDiscoverySourceView(view);
    expect(result.sourceState).toBe("empty");
    expect(result.totalRecords).toBe(0);
    expect(result.isEmpty).toBe(true);
  });

  it("maps real inventory to 'real'", () => {
    const record = mockRecord({ id: "dev-1" });
    const view = mockInventory({
      source_state: "real",
      records: [record],
      total_records: 1,
    });
    const result = toDiscoverySourceView(view);
    expect(result.sourceState).toBe("real");
    expect(result.isEmpty).toBe(false);
    expect(result.totalRecords).toBe(1);
  });

  it("maps unavailable inventory to 'unavailable'", () => {
    const view = mockInventory({
      source_state: "unavailable",
      total_records: 0,
    });
    const result = toDiscoverySourceView(view);
    expect(result.sourceState).toBe("unavailable");
  });

  it("maps command error (null view + error) to 'unavailable'", () => {
    const result = toDiscoverySourceView(null, new Error("boom"));
    expect(result.sourceState).toBe("unavailable");
    expect(result.totalRecords).toBe(0);
    expect(result.environmentId).toBe(null);
    expect(result.message).toBe("Discovery source unavailable");
  });

  it("maps null view without error to 'not_connected'", () => {
    const result = toDiscoverySourceView(null);
    expect(result.sourceState).toBe("not_connected");
    expect(result.totalRecords).toBe(0);
    expect(result.environmentId).toBe(null);
    expect(result.message).toBe("Discovery engine not connected");
  });

  it("preserves environment_id from view", () => {
    const view = mockInventory({ environment_id: "env-core-eu1" });
    const result = toDiscoverySourceView(view);
    expect(result.environmentId).toBe("env-core-eu1");
  });

  it("preserves null environment_id", () => {
    const view = mockInventory({ environment_id: null });
    const result = toDiscoverySourceView(view);
    expect(result.environmentId).toBe(null);
  });

  it("preserves total_records from view", () => {
    const view = mockInventory({ total_records: 42 });
    const result = toDiscoverySourceView(view);
    expect(result.totalRecords).toBe(42);
  });

  it("never returns demo for Discovery inventory", () => {
    const emptyView = mockInventory({ source_state: "empty" });
    const realView = mockInventory({ source_state: "real" });
    const unavailableView = mockInventory({ source_state: "unavailable" });
    const errorResult = toDiscoverySourceView(null, new Error("boom"));
    const nullResult = toDiscoverySourceView(null);

    expect(toDiscoverySourceView(emptyView).sourceState).not.toBe("demo");
    expect(toDiscoverySourceView(realView).sourceState).not.toBe("demo");
    expect(toDiscoverySourceView(unavailableView).sourceState).not.toBe("demo");
    expect(errorResult.sourceState).not.toBe("demo");
    expect(nullResult.sourceState).not.toBe("demo");
  });

  it("isEmpty is false when sourceState is empty but totalRecords > 0", () => {
    const view = mockInventory({
      source_state: "empty",
      total_records: 5,
    });
    const result = toDiscoverySourceView(view);
    expect(result.sourceState).toBe("empty");
    expect(result.totalRecords).toBe(5);
    expect(result.isEmpty).toBe(false);
  });

  it("message is preserved from view", () => {
    const view = mockInventory({ message: "42 devices discovered" });
    const result = toDiscoverySourceView(view);
    expect(result.message).toBe("42 devices discovered");
  });

  it("message is non-empty for null view with error", () => {
    const result = toDiscoverySourceView(null, new Error("boom"));
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("message is non-empty for null view without error", () => {
    const result = toDiscoverySourceView(null);
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
  });
});
