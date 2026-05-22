import type { DataSourceState } from "../types/dataSource";
import type { FabricatorEnvironment } from "../types/fabricator";

export interface FabricatorSourceView {
  readonly sourceState: DataSourceState;
  readonly environmentId: string | null;
  readonly deviceCount: number;
  readonly linkCount: number;
  readonly message: string;
  readonly isEmpty: boolean;
  readonly environment: FabricatorEnvironment | null;
}

/**
 * Adapter from a FabricatorEnvironment to a UI-safe FabricatorSourceView.
 * Pure function — no side effects, no I/O.
 *
 * Fabricator always returns sourceState "demo" when an environment is present.
 * Null input maps to "not_connected" — the engine has not been called yet.
 *
 * Fabricated data is never "real", never "empty" (it always has content),
 * and never "unavailable" — the engine is always callable.
 */
export function toFabricatorSourceView(
  environment: FabricatorEnvironment | null,
): FabricatorSourceView {
  if (environment === null) {
    return {
      sourceState: "not_connected",
      environmentId: null,
      deviceCount: 0,
      linkCount: 0,
      message: "Fabricator engine not connected",
      isEmpty: false,
      environment: null,
    };
  }

  return {
    sourceState: "demo",
    environmentId: environment.environment_id,
    deviceCount: environment.devices.length,
    linkCount: environment.links.length,
    message: `Fabricated environment — ${environment.devices.length} devices, ${environment.links.length} links`,
    isEmpty: false,
    environment,
  };
}
