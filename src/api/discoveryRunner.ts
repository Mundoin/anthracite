/**
 * Discovery Runner API — Tauri command wrappers (V1AX + V1AZ).
 *
 * Keep names aligned with `src-tauri/src/commands/discovery_runner.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  DiscoveryCredentials,
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryTarget,
  DiscoveryTargetValidation,
  SshExecutionLimits,
} from "../types/discoveryRunner";

/**
 * V1AX — validate a discovery target for form constraints.
 */
export async function validateDiscoveryTarget(
  target: DiscoveryTarget,
): Promise<DiscoveryTargetValidation> {
  return invoke<DiscoveryTargetValidation>(
    "validate_discovery_target",
    { target },
  );
}

/**
 * V1AX — plan a discovery run for a target (read-only dry-run).
 */
export async function planDiscoveryRun(
  target: DiscoveryTarget,
): Promise<DiscoveryRunPlan> {
  return invoke<DiscoveryRunPlan>(
    "plan_discovery_run",
    { target },
  );
}

/**
 * V1AX — attempt a discovery run (transport may be deferred or refused).
 */
export async function attemptDiscoveryRun(
  target: DiscoveryTarget,
): Promise<DiscoveryRunReport> {
  return invoke<DiscoveryRunReport>(
    "attempt_discovery_run",
    { target },
  );
}

/**
 * V1AZ — execute a discovery run with credentials and optional limits.
 */
export async function executeDiscoveryRun(
  target: DiscoveryTarget,
  credentials: DiscoveryCredentials,
  limits?: SshExecutionLimits,
): Promise<DiscoveryRunReport> {
  return invoke<DiscoveryRunReport>(
    "execute_discovery_run",
    { target, credentials, limits: limits ?? null },
  );
}
