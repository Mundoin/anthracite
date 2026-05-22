/**
 * Fabricator Engine — TypeScript types (D4A).
 *
 * Fabricated environments are synthetic/demo data generated deterministically
 * by src/engines/fabricator.ts. They never represent live network state.
 * All records carry provenance: "fabricated" to satisfy the honesty contract.
 *
 * Doctrine: DataSourceState "demo" — see src/types/dataSource.ts.
 */

export type FabricatedProvenance = "fabricated";

export type FabricatedDeviceSource = "fabricated";
export type FabricatedLinkSource = "fabricated";

export interface FabricatedDevice {
  readonly id: string;
  readonly name: string;
  readonly vendor: string;
  readonly platform: string;
  readonly role_hint: "device";
  readonly source: FabricatedDeviceSource;
}

export interface FabricatedLink {
  readonly id: string;
  readonly source_device_id: string;
  readonly target_device_id: string;
  readonly kind: "manual";
  readonly source: FabricatedLinkSource;
}

export interface FabricatorEnvironment {
  readonly environment_id: string;
  readonly name: string;
  readonly devices: readonly FabricatedDevice[];
  readonly links: readonly FabricatedLink[];
  readonly provenance: FabricatedProvenance;
  readonly schema_version: "1";
}
