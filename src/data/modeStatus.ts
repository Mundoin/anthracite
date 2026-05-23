import type { ModeId } from "../components/shell/ModeRail";

export type ModeBodyState = "built" | "not_connected";

export interface ModeStatus {
  readonly state: ModeBodyState;
  readonly engineName: string;
  readonly plannedStage?: string;
}

export const MODE_STATUS: Record<ModeId, ModeStatus> = {
  hierarchy:    { state: "built",         engineName: "Environment Engine" },
  devices:      { state: "not_connected", engineName: "Device Engine",              plannedStage: "post-D3" },
  intake:       { state: "built",         engineName: "Intake / Parser" },
  discovery:    { state: "built",         engineName: "Discovery Runner" }, // Added V1AX
  environments: { state: "built",         engineName: "Environment Engine" }, // Added V1BZ
  provisioning: { state: "not_connected", engineName: "Provisioning Engine" },
  assess:       { state: "built",         engineName: "Validator / Receipt" },
  operate:      { state: "not_connected", engineName: "Monitoring / Sentinel Engine" },
  topology:     { state: "built",         engineName: "Topology Engine" }, // Flipped V1AJ
  diagnose:     { state: "built",         engineName: "Diagnostic / Hypothesis Engine" }, // Flipped V1AW
  events:       { state: "not_connected", engineName: "Event Engine",               plannedStage: "post-D3" },
  security:     { state: "not_connected", engineName: "Compliance Engine" },
  dashboards:   { state: "not_connected", engineName: "Reporting Engine" },
  build:        { state: "not_connected", engineName: "Config Generation Engine" },
  settings:     { state: "built",         engineName: "Settings (local)" }, // Flipped V1AE
  opsConsole:   { state: "built",         engineName: "Ops Console (local)" }, // Added V1AE-A
};
