// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ NOTE FOR OCC IMPLEMENTERS                                                   │
// │ This file is the canonical TypeScript source. In the preview it is loaded   │
// │ via Babel-standalone with the `typescript` preset, which only strips type │
// │ annotations — it does not resolve ES module syntax. Cross-file linkage is  │
// │ therefore done through `window.Anthracite*` globals (see end of file).   │
// │ When integrating into a real bundler (Vite/esbuild/tsc), restore the       │
// │ `import` / `export` keywords as needed.                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

// Anthracite — Hardware Model Kit · runtime types
//
// Loaded via Babel standalone with the TypeScript preset; all type
// annotations are stripped at runtime. The shapes below are the contract
// between hardwareProfiles.ts and buildHardwareModel.ts.

type ZoneKind =
  | 'chassis' | 'port' | 'bay' | 'module'
  | 'led' | 'psu' | 'fan' | 'blade' | 'screen' | 'label';

type PortKind = '1g' | '10g' | '25g' | '40g' | '100g' | 'console';

type TelemetryState = 'up' | 'down' | 'warning' | 'critical' | 'unknown';

/** Faceplate is a 2D layout in millimetres, anchored at the chassis front. */
type FaceplateItem =
  | { kind: 'portGrid';  x: number; y: number; cols: number; rows: number;
      pitchX: number; pitchY: number; portW: number; portH: number;
      idPrefix: string; portKind?: PortKind }
  | { kind: 'sfpRow';    x: number; y: number; n: number; pitchX: number;
      idPrefix: string; portKind?: PortKind }
  | { kind: 'qsfpRow';   x: number; y: number; n: number; pitchX: number;
      idPrefix: string }
  | { kind: 'ledBank';   x: number; y: number; labels: string[]; idPrefix: string }
  | { kind: 'screen';    x: number; y: number; w: number; h: number;
      text?: string[]; idPrefix: string }
  | { kind: 'bay';       x: number; y: number; w: number; h: number;
      populated: boolean; idPrefix: string; index: number; cardKind?: string }
  | { kind: 'blade';     x: number; y: number; w: number; h: number;
      populated: boolean; idPrefix: string; index: number }
  | { kind: 'psu';       x: number; y: number; w: number; h: number;
      idPrefix: string; index: number }
  | { kind: 'fan';       x: number; y: number; w: number; h: number;
      idPrefix: string; index: number }
  | { kind: 'label';     x: number; y: number; text: string; size?: number;
      vendorPlate?: boolean }
  | { kind: 'ventStrip'; x: number; y: number; w: number; h: number };

type ChassisFinish =
  | 'darkMetal'    // matte dark steel
  | 'lightMetal'   // brushed aluminium
  | 'glass';       // translucent — virtual appliances

type HardwareProfile = {
  id:       string;           // 'access48' etc — used as <model> in mesh IDs
  name:     string;           // human display name
  family:   'switch' | 'router' | 'firewall' | 'support';
  dims:     { w: number; h: number; d: number };  // millimetres
  finish:   ChassisFinish;
  virtual?: boolean;          // translucent + dashed wire pass
  vendor:   string;
  model:    string;
  faceplate: FaceplateItem[];
  rackUnits?: number;
};

type BuiltModel = {
  profileId:   string;
  root:        any;           // BABYLON.TransformNode
  pickables:   any[];         // BABYLON.AbstractMesh[]
  zoneMap:     Map<string, { kind: ZoneKind; index: number }>;
  setTelemetry?: (state: TelemetryState) => void;
};
