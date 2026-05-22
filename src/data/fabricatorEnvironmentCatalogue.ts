import type { Environment } from "../types/environment";
import type { FabricatorEnvironment } from "../types/fabricator";
import { generateFabricatorEnvironment } from "../engines/fabricator";

/**
 * D4B — Fabricator Environment Catalogue.
 *
 * Converts the D4A FabricatorEnvironment into an Environment-shaped entry so
 * it can be passed to any consumer that already works with Environment[].
 *
 * Seam: callers use mergeWithFabricatorEnvironment() to include env-fab-demo
 * alongside real environments (e.g. when building the topology canvas input
 * for D4C, or passing to getHierarchyView).
 *
 * Honesty contract:
 *   kind:       "fabricated"  — never "production" or any live category
 *   status:     "unknown"     — no live polling; fabricated data has no health
 *   updated_at: "fabricated"  — no real timestamp
 */

export const FABRICATOR_ENVIRONMENT_KIND = "fabricated" as const;

export function toFabricatorEnvironmentEntry(
  env: FabricatorEnvironment,
): Environment {
  return {
    id: env.environment_id,
    name: env.name,
    kind: FABRICATOR_ENVIRONMENT_KIND,
    device_count: env.devices.length,
    status: "unknown",
    updated_at: "fabricated",
    summary: `Fabricated demo environment — ${env.devices.length} devices, ${env.links.length} links. Source: synthetic.`,
  };
}

const FABRICATOR_ENTRY: Environment = toFabricatorEnvironmentEntry(
  generateFabricatorEnvironment(),
);

/**
 * Returns the canonical Environment entry for the fabricated demo environment.
 * Referentially stable — same object reference every call.
 */
export function getFabricatorEnvironmentEntry(): Environment {
  return FABRICATOR_ENTRY;
}

/**
 * Prepends the fabricated demo environment to any environment list.
 * Idempotent — skips prepend if env-fab-demo is already present.
 * Never mutates the input array.
 */
export function mergeWithFabricatorEnvironment(
  envs: readonly Environment[],
): readonly Environment[] {
  if (envs.some((e) => e.id === FABRICATOR_ENTRY.id)) return envs;
  return [FABRICATOR_ENTRY, ...envs];
}
