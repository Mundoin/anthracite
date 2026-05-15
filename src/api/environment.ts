/**
 * Typed Tauri command wrappers for the Environment Engine.
 *
 * Keep names aligned with `src-tauri/src/commands/environment.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { Environment, EnvironmentReadiness } from "../types/environment";

export async function listEnvironments(): Promise<Environment[]> {
  return invoke<Environment[]>("list_environments");
}

export async function getActiveEnvironment(): Promise<Environment | null> {
  const result = await invoke<Environment | null>("get_active_environment");
  return result ?? null;
}

export async function setActiveEnvironment(id: string): Promise<Environment> {
  return invoke<Environment>("set_active_environment", { id });
}

export async function getEnvironmentReadiness(): Promise<EnvironmentReadiness> {
  return invoke<EnvironmentReadiness>("get_environment_readiness");
}
