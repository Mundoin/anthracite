/**
 * Fabricator Engine (D4A).
 *
 * Deterministic synthetic environment generator. No I/O, no randomness,
 * no timestamps. Same input (none) → same output, always.
 *
 * Output is tagged provenance: "fabricated" throughout. This is the seam
 * that D4B (environment wiring) and D4C (topology canvas) will consume.
 */

import type {
  FabricatorEnvironment,
  FabricatedDevice,
  FabricatedLink,
} from "../types/fabricator";

const DEVICES: readonly FabricatedDevice[] = [
  {
    id: "fab-dev-001",
    name: "core-sw-01",
    vendor: "cisco",
    platform: "ios-xe",
    role_hint: "device",
    source: "fabricated",
  },
  {
    id: "fab-dev-002",
    name: "core-sw-02",
    vendor: "cisco",
    platform: "ios-xe",
    role_hint: "device",
    source: "fabricated",
  },
  {
    id: "fab-dev-003",
    name: "edge-rtr-01",
    vendor: "juniper",
    platform: "junos",
    role_hint: "device",
    source: "fabricated",
  },
] as const;

const LINKS: readonly FabricatedLink[] = [
  {
    id: "fab-link-001",
    source_device_id: "fab-dev-001",
    target_device_id: "fab-dev-002",
    kind: "manual",
    source: "fabricated",
  },
  {
    id: "fab-link-002",
    source_device_id: "fab-dev-002",
    target_device_id: "fab-dev-003",
    kind: "manual",
    source: "fabricated",
  },
] as const;

const ENVIRONMENT: FabricatorEnvironment = {
  environment_id: "env-fab-demo",
  name: "Demo Lab — Fabricated",
  devices: DEVICES,
  links: LINKS,
  provenance: "fabricated",
  schema_version: "1",
} as const;

/**
 * Returns the canonical fabricated environment.
 * Referentially stable — callers receive the same frozen object every call.
 */
export function generateFabricatorEnvironment(): FabricatorEnvironment {
  return ENVIRONMENT;
}
