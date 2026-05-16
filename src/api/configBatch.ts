/**
 * Typed Tauri command wrapper for the V1O-A Config Splitter Engine.
 *
 * Keep names aligned with `src-tauri/src/commands/config_splitter.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ConfigBatchSplitResult } from "../types/configBatch";

export async function splitConfigBatch(
  configText: string,
): Promise<ConfigBatchSplitResult> {
  return invoke<ConfigBatchSplitResult>("split_config_batch", {
    configText,
  });
}
