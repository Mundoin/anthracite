/**
 * B1.1 — Environment Creation Type Contract.
 *
 * Pure data model for the three creation lanes:
 * - generated-lab (available now)
 * - import (planned for future)
 * - live-discovery (planned for future)
 *
 * No side effects, frozen at module load.
 */

export type EnvironmentCreationTypeId =
  | "generated-lab"
  | "import"
  | "live-discovery";

export type EnvironmentCreationTypeStatus = "available" | "planned";

export interface EnvironmentCreationType {
  readonly id: EnvironmentCreationTypeId;
  readonly label: string;
  readonly description: string;
  readonly status: EnvironmentCreationTypeStatus;
  readonly required_inputs: ReadonlyArray<string>;
  readonly output_contract: string;
  readonly readiness_notes: string;
}

const GENERATED_LAB: EnvironmentCreationType = {
  id: "generated-lab",
  label: "Generated Lab",
  description:
    "Deterministic synthetic network environment created from a scenario template.",
  status: "available",
  required_inputs: ["scenario_id"],
  output_contract:
    "LabEnvironment with fully populated devices[], links[], configs[], and addressing[]",
  readiness_notes:
    "Deterministic generated lab. Local-only by default. Suitable for development, testing, and proof-of-concept work.",
};

const IMPORT: EnvironmentCreationType = {
  id: "import",
  label: "Import",
  description:
    "Restore or import a network environment from configuration archives or evidence files.",
  status: "planned",
  required_inputs: ["config archive or evidence files"],
  output_contract:
    "Environment reconstructed from imported sources with metadata preservation",
  readiness_notes:
    "Planned for future release. Will support importing from config archives, evidence packs, and backups.",
};

const LIVE_DISCOVERY: EnvironmentCreationType = {
  id: "live-discovery",
  label: "Live Discovery",
  description:
    "Scan and discover a live network via SSH, SNMP, or similar protocols.",
  status: "planned",
  required_inputs: ["SSH credentials, SNMP target, or discovery seed"],
  output_contract:
    "Environment reconstructed from discovered devices and topology with real-time data",
  readiness_notes:
    "Planned for future release. Will support SSH, SNMP, and other discovery protocols.",
};

const TYPES_TO_FREEZE: readonly EnvironmentCreationType[] = [
  GENERATED_LAB,
  IMPORT,
  LIVE_DISCOVERY,
];

export const ENVIRONMENT_CREATION_TYPES: ReadonlyArray<EnvironmentCreationType> =
  Object.freeze(TYPES_TO_FREEZE);

/**
 * Retrieves a creation type by ID.
 *
 * Throws Error if the ID is not found in the registry.
 */
export function getCreationType(id: EnvironmentCreationTypeId): EnvironmentCreationType {
  for (const type of ENVIRONMENT_CREATION_TYPES) {
    if (type.id === id) {
      return type;
    }
  }
  throw new Error(`Environment creation type not found: ${id}`);
}
