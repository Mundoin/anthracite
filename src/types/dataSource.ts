/**
 * V1AA — Hierarchy honesty contract types.
 * See docs/architecture/HIERARCHY_HONESTY_CONTRACT.md.
 */

export type DataSourceState =
  | "real"
  | "demo"
  | "empty"
  | "unavailable"
  | "not_connected";

export const HIERARCHY_HONESTY_CONTRACT_VERSION = 1 as const;

export const SOURCE_LABEL: Record<DataSourceState, string> = {
  real: "",
  demo: "Demo data — replace with live source",
  empty: "No data",
  unavailable: "Source unavailable",
  not_connected: "Engine not connected",
};
