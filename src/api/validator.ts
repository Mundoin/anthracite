/**
 * Typed Tauri command wrapper for the V1P Validator Engine.
 *
 * Mirrors `src-tauri/src/commands/validator.rs`. Takes a parsed
 * `DeviceModel` plus a `ValidatorContext`, returns a structured
 * `ValidationReport`. The Rust command never returns `Err` for
 * ordinary inputs; the `Result<>` shape is reserved for future
 * panic-catching parity with neighbouring commands.
 */

import { invoke } from "@tauri-apps/api/core";

import type { DeviceModel } from "../types/networkModel";
import type {
  ValidationReport,
  ValidatorContext,
} from "../types/validator";

export async function validateDeviceModel(
  deviceModel: DeviceModel,
  context: ValidatorContext,
): Promise<ValidationReport> {
  return invoke<ValidationReport>("validate_device_model", {
    deviceModel,
    context,
  });
}
