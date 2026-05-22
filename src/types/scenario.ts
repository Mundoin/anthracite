/**
 * Scenario catalogue types (D4D).
 *
 * A scenario describes a deterministic synthetic environment profile: device count,
 * link count, scale category, and lifecycle status. Scenarios are immutable records
 * that parameterize the fabricator engine.
 */

export type ScenarioScaleProfile = "micro" | "small" | "medium" | "large" | "mega";
export type ScenarioLifecycleStatus = "available" | "planned" | "experimental";
export type ScenarioSourceKind = "synthetic";
export type ScenarioMaturity = "stable" | "experimental" | "planned";

export type ScenarioCapability =
  | "topology"
  | "inventory"
  | "interfaces"
  | "addressing"
  | "configs"
  | "routing"
  | "services"
  | "security";

export type ScenarioFutureSurface =
  | "topology"
  | "inventory"
  | "configs"
  | "reports"
  | "troubleshooting";

export interface ScenarioRecord {
  readonly scenario_id: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly scale_profile: ScenarioScaleProfile;
  readonly intended_use: string;
  readonly device_count: number;             // KEEP — alias for target_device_count for backward compat
  readonly link_count: number;               // KEEP — alias for target_link_count
  readonly target_device_count: number;       // NEW
  readonly target_link_count: number;         // NEW
  readonly max_device_count: number;          // NEW (≤ 128)
  readonly max_link_count: number;            // NEW (≤ 384)
  readonly source_kind: ScenarioSourceKind;
  readonly seed: string;                      // KEEP — alias for scenario_seed
  readonly scenario_seed: string;             // NEW
  readonly lifecycle_status: ScenarioLifecycleStatus;  // KEEP — current field
  readonly maturity: ScenarioMaturity;        // NEW
  readonly limitations: readonly string[];
  readonly capabilities: readonly ScenarioCapability[];   // NEW
  readonly future_surfaces: readonly ScenarioFutureSurface[];  // NEW
}
