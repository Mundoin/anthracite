/**
 * B4 — Lab Topology Activation Plumbing.
 *
 * Pure helpers connecting active Lab Environment → render graph chain.
 * No side effects, no I/O, fully deterministic.
 *
 * Contract:
 *   activeRecordToGraphReadyView(record) → GraphReadyTopologyView | null
 *   activeRecordToRenderGraph(record) → RenderGraphModel | null
 */

import type { LocalEnvironmentRecord } from "../types/localEnvironment";
import type {
  GraphReadyTopologyView,
} from "../modes/topology/topologyReview";
import type {
  RenderGraphModel,
  RenderGraphDataSource,
} from "../modes/topology/renderGraph";
import { toFabricatorView } from "./labProjections";
import { toGraphReadyTopologyView } from "./fabricatorTopologyAdapter";
import { buildRenderGraph } from "../modes/topology/renderGraph";

export const LAB_RENDER_DATA_SOURCE: RenderGraphDataSource = "simulated";

/**
 * Convert active environment record → GraphReadyTopologyView.
 *
 * Returns null if:
 *   - record is null or undefined
 *   - record.lifecycle_state is "archived"
 *
 * Otherwise transforms:
 *   LocalEnvironmentRecord.lab_payload (LabEnvironment)
 *     → FabricatorEnvironment (toFabricatorView)
 *     → GraphReadyTopologyView (toGraphReadyTopologyView)
 */
export function activeRecordToGraphReadyView(
  record: LocalEnvironmentRecord | null,
): GraphReadyTopologyView | null {
  if (!record) return null;
  if (record.lifecycle_state === "archived") return null;

  const fabView = toFabricatorView(record.lab_payload);
  return toGraphReadyTopologyView(fabView);
}

/**
 * Convert active environment record → RenderGraphModel.
 *
 * Returns null if:
 *   - record is null or undefined
 *   - activeRecordToGraphReadyView(record) returns null
 *
 * Otherwise chains:
 *   record → GraphReadyTopologyView → RenderGraphModel
 *   with data_source: "simulated"
 *
 * Deterministic: identical inputs always produce identical outputs.
 */
export function activeRecordToRenderGraph(
  record: LocalEnvironmentRecord | null,
): RenderGraphModel | null {
  const view = activeRecordToGraphReadyView(record);
  if (!view) return null;

  return buildRenderGraph({ view, data_source: LAB_RENDER_DATA_SOURCE });
}

/**
 * Returns the canonical data source label for lab environment renders.
 */
export function labRenderDataSource(): RenderGraphDataSource {
  return LAB_RENDER_DATA_SOURCE;
}
