/**
 * B4 — Lab Topology Activation Tests.
 *
 * Validates the pure transformation chain:
 *   LocalEnvironmentRecord → GraphReadyTopologyView → RenderGraphModel
 */

import { describe, it, expect } from "vitest";
import {
  createInitialStore,
  createEnvironmentFromScenario,
  listEnvironments,
  getActiveEnvironment,
  selectActiveEnvironment,
  archiveEnvironment,
} from "../../state/environmentLifecycle";
import {
  activeRecordToGraphReadyView,
  activeRecordToRenderGraph,
  labRenderDataSource,
  LAB_RENDER_DATA_SOURCE,
} from "../labTopologyActivation";
import type { EnvironmentLifecycleStoreState } from "../../types/localEnvironment";

describe("labTopologyActivation", () => {
  describe("activeRecordToGraphReadyView", () => {
    it("returns null when input is null", () => {
      const result = activeRecordToGraphReadyView(null);
      expect(result).toBeNull();
    });

    it("returns null when record is archived", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;
      store = selectActiveEnvironment(store, record.environment_id);
      store = archiveEnvironment(store, record.environment_id);
      const archivedRecord = listEnvironments(store, true).find(
        (r) => r.environment_id === record.environment_id
      )!;

      const result = activeRecordToGraphReadyView(archivedRecord);
      expect(result).toBeNull();
    });

    it("returns a view with 3 nodes for micro-lab", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = activeRecordToGraphReadyView(record);
      expect(result).not.toBeNull();
      expect(result!.nodes.length).toBe(3);
    });

    it("returns a view with 2 edges for micro-lab", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = activeRecordToGraphReadyView(record);
      expect(result).not.toBeNull();
      expect(result!.edges.length).toBe(2);
    });

    it("preserves environment_id from record", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = activeRecordToGraphReadyView(record);
      expect(result).not.toBeNull();
      expect(result!.environment_id).toBe(record.environment_id);
    });
  });

  describe("activeRecordToRenderGraph", () => {
    it("returns null when input is null", () => {
      const result = activeRecordToRenderGraph(null);
      expect(result).toBeNull();
    });

    it("returns null when record is archived", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;
      store = selectActiveEnvironment(store, record.environment_id);
      store = archiveEnvironment(store, record.environment_id);
      const archivedRecord = listEnvironments(store, true).find(
        (r) => r.environment_id === record.environment_id
      )!;

      const result = activeRecordToRenderGraph(archivedRecord);
      expect(result).toBeNull();
    });

    it("returns RenderGraphModel with data_source 'simulated'", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.data_source).toBe("simulated");
    });

    it("returns model with node_count === 3 for micro-lab", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.node_count).toBe(3);
    });

    it("returns model with edge_count === 2 for micro-lab", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.edge_count).toBe(2);
    });

    it("returns model with node_count === 8 for branch-office scenario", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "branch-office", {
        name: "Branch Office",
      });
      const record = listEnvironments(store).find(
        (r) => r.scenario_id === "branch-office"
      )!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.node_count).toBe(8);
    });

    it("returns model with edge_count === 10 for branch-office scenario", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "branch-office", {
        name: "Branch Office",
      });
      const record = listEnvironments(store).find(
        (r) => r.scenario_id === "branch-office"
      )!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.edge_count).toBe(10);
    });

    it("returns model with node_count === 24 for campus scenario", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "campus", {
        name: "Campus",
      });
      const record = listEnvironments(store).find(
        (r) => r.scenario_id === "campus"
      )!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.node_count).toBe(24);
    });

    it("returns model with edge_count === 36 for campus scenario", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "campus", {
        name: "Campus",
      });
      const record = listEnvironments(store).find(
        (r) => r.scenario_id === "campus"
      )!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.edge_count).toBe(36);
    });

    it("returns model with node_count === 32 for datacenter-pod scenario", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "datacenter-pod", {
        name: "Datacenter Pod",
      });
      const record = listEnvironments(store).find(
        (r) => r.scenario_id === "datacenter-pod"
      )!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.node_count).toBe(32);
    });

    it("returns model with edge_count === 64 for datacenter-pod scenario", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "datacenter-pod", {
        name: "Datacenter Pod",
      });
      const record = listEnvironments(store).find(
        (r) => r.scenario_id === "datacenter-pod"
      )!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.edge_count).toBe(64);
    });

    it("returns model with node_count === 96 for metro-mega-city scenario", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "metro-mega-city", {
        name: "Metro Mega City",
      });
      const record = listEnvironments(store).find(
        (r) => r.scenario_id === "metro-mega-city"
      )!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.node_count).toBe(96);
    });

    it("returns model with edge_count === 240 for metro-mega-city scenario", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "metro-mega-city", {
        name: "Metro Mega City",
      });
      const record = listEnvironments(store).find(
        (r) => r.scenario_id === "metro-mega-city"
      )!;

      const result = activeRecordToRenderGraph(record);
      expect(result).not.toBeNull();
      expect(result!.edge_count).toBe(240);
    });

    it("is deterministic: two calls on same record produce equal model", () => {
      let store = createInitialStore();
      store = createEnvironmentFromScenario(store, "micro-lab", {
        name: "Micro Lab",
      });
      const record = listEnvironments(store)[0]!;

      const result1 = activeRecordToRenderGraph(record);
      const result2 = activeRecordToRenderGraph(record);

      expect(result1).toEqual(result2);
    });
  });

  describe("labRenderDataSource", () => {
    it("returns 'simulated'", () => {
      const source = labRenderDataSource();
      expect(source).toBe("simulated");
    });
  });

  describe("LAB_RENDER_DATA_SOURCE constant", () => {
    it("is set to 'simulated'", () => {
      expect(LAB_RENDER_DATA_SOURCE).toBe("simulated");
    });
  });
});
