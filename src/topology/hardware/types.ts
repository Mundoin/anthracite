/**
 * Anthracite Topology Hardware Kit — runtime types.
 *
 * Ported from design-review/anthracite-topology-hardware-model-kit-v0/src/hardwareModelTypes.ts
 * in stage V1BE. Family union widened to include 'unknown' per V1BD decision 3.
 *
 * Canonical mesh ID format: <modelId>.<zoneKind>.<index>
 * See design-review/.../contracts/pickable-zone-id-contract.md
 */

import type { AbstractMesh, TransformNode } from "@babylonjs/core";

export type ZoneKind =
  | "chassis"
  | "port"
  | "bay"
  | "module"
  | "led"
  | "psu"
  | "fan"
  | "blade"
  | "screen"
  | "label";

export type PortKind = "1g" | "10g" | "25g" | "40g" | "100g" | "console";

export type TelemetryState = "up" | "down" | "warning" | "critical" | "unknown";

export type ChassisFinish = "darkMetal" | "lightMetal" | "glass";

export type HardwareFamily =
  | "switch"
  | "router"
  | "firewall"
  | "support"
  | "unknown";

export type FaceplateItem =
  | {
      kind: "portGrid";
      x: number;
      y: number;
      cols: number;
      rows: number;
      pitchX: number;
      pitchY: number;
      portW: number;
      portH: number;
      idPrefix: string;
      portKind?: PortKind;
    }
  | {
      kind: "sfpRow";
      x: number;
      y: number;
      n: number;
      pitchX: number;
      idPrefix: string;
      portKind?: PortKind;
    }
  | {
      kind: "qsfpRow";
      x: number;
      y: number;
      n: number;
      pitchX: number;
      idPrefix: string;
    }
  | {
      kind: "ledBank";
      x: number;
      y: number;
      labels: string[];
      idPrefix: string;
    }
  | {
      kind: "screen";
      x: number;
      y: number;
      w: number;
      h: number;
      text?: string[];
      idPrefix: string;
    }
  | {
      kind: "bay";
      x: number;
      y: number;
      w: number;
      h: number;
      populated: boolean;
      idPrefix: string;
      index: number;
      cardKind?: string;
    }
  | {
      kind: "blade";
      x: number;
      y: number;
      w: number;
      h: number;
      populated: boolean;
      idPrefix: string;
      index: number;
    }
  | {
      kind: "psu";
      x: number;
      y: number;
      w: number;
      h: number;
      idPrefix: string;
      index: number;
    }
  | {
      kind: "fan";
      x: number;
      y: number;
      w: number;
      h: number;
      idPrefix: string;
      index: number;
    }
  | {
      kind: "label";
      x: number;
      y: number;
      text: string;
      size?: number;
      vendorPlate?: boolean;
    }
  | {
      kind: "ventStrip";
      x: number;
      y: number;
      w: number;
      h: number;
    };

export interface HardwareProfile {
  id: string;
  name: string;
  family: HardwareFamily;
  dims: { w: number; h: number; d: number };
  finish: ChassisFinish;
  virtual?: boolean;
  vendor: string;
  model: string;
  faceplate: FaceplateItem[];
  rackUnits?: number;
}

export interface ZoneTag {
  modelId: string;
  kind: ZoneKind;
  index: number;
}

export interface BuiltModel {
  profileId: string;
  root: TransformNode;
  pickables: AbstractMesh[];
  zoneMap: Map<string, { kind: ZoneKind; index: number }>;
  setTelemetry: (state: TelemetryState) => void;
}

export interface AnthraciteMeshMetadata {
  anthracite: ZoneTag;
}
