/**
 * Anthracite Topology Hardware Kit — public API.
 *
 * Stage V1BE port of the model kit out of design-review/ into the
 * Anthracite Vite/Tauri runtime.
 *
 * Doctrine references:
 * - design-review/anthracite-topology-hardware-desk-design-board/
 * - design-review/anthracite-topology-hardware-model-kit-v0/
 * - obsidian/decisions/2026-05-23-topology-hardware-doctrine-merge.md
 */

export type {
  AnthraciteMeshMetadata,
  BuiltModel,
  ChassisFinish,
  FaceplateItem,
  HardwareFamily,
  HardwareProfile,
  PortKind,
  TelemetryState,
  ZoneKind,
  ZoneTag,
} from "./types";

export type { HardwareMaterials } from "./materials";
export { buildMaterials } from "./materials";

export { meshId, tagZone, readZone, parseMeshId } from "./pickableZones";

export type { ModelTelemetry, TelemetryAdapter } from "./telemetryAdapter";
export { demoTelemetry, demoTelemetryAdapter } from "./telemetryAdapter";

export {
  AllProfiles,
  FirewallProfiles,
  RouterProfiles,
  SupportProfiles,
  SwitchProfiles,
  UnknownProfiles,
  findProfile,
} from "./profiles";

export type { BuildOptions } from "./buildHardwareModel";
export { buildHardwareModel } from "./buildHardwareModel";

export type { BuildBatchOptions } from "./builders";
export {
  buildAllModels,
  buildFirewallModels,
  buildRouterModels,
  buildSupportModels,
  buildSwitchModels,
  buildUnknownModels,
} from "./builders";
