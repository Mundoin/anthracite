import type { ModeId } from "../components/shell/ModeRail";

export type ModeBodyState = "built" | "not_connected";

export interface ModeStatus {
  readonly state: ModeBodyState;
  readonly engineName: string;
  readonly plannedStage?: string;
}

export const MODE_STATUS: Record<ModeId, ModeStatus> = {
  hierarchy:    { state: "built",         engineName: "Environment Engine" },
  intake:       { state: "built",         engineName: "Intake / Parser" },
  assess:       { state: "built",         engineName: "Validator / Receipt" },
  provisioning: { state: "not_connected", engineName: "Provisioning Engine" },
  operate:      { state: "not_connected", engineName: "Monitoring / Sentinel Engine" },
  topology:     { state: "built",         engineName: "Topology Engine" }, // Flipped V1AJ
  diagnose:     { state: "not_connected", engineName: "Diagnostic / Hypothesis Engine" },
  security:     { state: "not_connected", engineName: "Compliance Engine" },
  dashboards:   { state: "not_connected", engineName: "Reporting Engine" },
  build:        { state: "not_connected", engineName: "Config Generation Engine" },
  settings:     { state: "built",         engineName: "Settings (local)" }, // Flipped V1AE
  opsConsole:   { state: "built",         engineName: "Ops Console (local)" }, // Added V1AE-A
};
