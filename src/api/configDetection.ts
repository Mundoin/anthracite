/**
 * Typed Tauri command wrappers for the Config Detection Engine.
 *
 * Keep names aligned with `src-tauri/src/commands/config_detection.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ConfigDetectionResult } from "../types/configDetection";

export async function detectConfigPlatform(
  configText: string,
): Promise<ConfigDetectionResult> {
  return invoke<ConfigDetectionResult>("detect_config_platform", {
    configText,
  });
}
