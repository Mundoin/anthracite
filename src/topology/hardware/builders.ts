/**
 * Per-family batch builders.
 *
 * Ported from design-review/anthracite-topology-hardware-model-kit-v0/src/
 * (buildSwitchModels|buildRouterModels|buildFirewallModels|buildSupportModels).ts.
 * Each builder loops a profile array and returns a Record keyed by profile id.
 * Models start disabled — the preview/runtime enables one at a time.
 */

import type { Scene, ShadowGenerator } from "@babylonjs/core";

import { buildHardwareModel } from "./buildHardwareModel";
import type { HardwareMaterials } from "./materials";
import {
  FirewallProfiles,
  RouterProfiles,
  SupportProfiles,
  SwitchProfiles,
  UnknownProfiles,
} from "./profiles";
import type { BuiltModel, HardwareProfile } from "./types";

export interface BuildBatchOptions {
  shadowGenerator?: ShadowGenerator;
  /** When true, models stay enabled after build. Default: false. */
  enableAfterBuild?: boolean;
}

function buildBatch(
  scene: Scene,
  mats: HardwareMaterials,
  profiles: HardwareProfile[],
  opts: BuildBatchOptions,
): Record<string, BuiltModel> {
  const built: Record<string, BuiltModel> = {};
  for (const profile of profiles) {
    const model = buildHardwareModel(scene, profile, mats, {
      shadowGenerator: opts.shadowGenerator,
    });
    if (!opts.enableAfterBuild) {
      model.root.setEnabled(false);
    }
    built[profile.id] = model;
  }
  return built;
}

export function buildSwitchModels(
  scene: Scene,
  mats: HardwareMaterials,
  opts: BuildBatchOptions = {},
): Record<string, BuiltModel> {
  return buildBatch(scene, mats, SwitchProfiles, opts);
}

export function buildRouterModels(
  scene: Scene,
  mats: HardwareMaterials,
  opts: BuildBatchOptions = {},
): Record<string, BuiltModel> {
  return buildBatch(scene, mats, RouterProfiles, opts);
}

export function buildFirewallModels(
  scene: Scene,
  mats: HardwareMaterials,
  opts: BuildBatchOptions = {},
): Record<string, BuiltModel> {
  return buildBatch(scene, mats, FirewallProfiles, opts);
}

export function buildSupportModels(
  scene: Scene,
  mats: HardwareMaterials,
  opts: BuildBatchOptions = {},
): Record<string, BuiltModel> {
  return buildBatch(scene, mats, SupportProfiles, opts);
}

export function buildUnknownModels(
  scene: Scene,
  mats: HardwareMaterials,
  opts: BuildBatchOptions = {},
): Record<string, BuiltModel> {
  return buildBatch(scene, mats, UnknownProfiles, opts);
}

export function buildAllModels(
  scene: Scene,
  mats: HardwareMaterials,
  opts: BuildBatchOptions = {},
): Record<string, BuiltModel> {
  return {
    ...buildSwitchModels(scene, mats, opts),
    ...buildRouterModels(scene, mats, opts),
    ...buildFirewallModels(scene, mats, opts),
    ...buildSupportModels(scene, mats, opts),
    ...buildUnknownModels(scene, mats, opts),
  };
}
