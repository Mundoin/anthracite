/**
 * Hardware passport — derive port / module / chassis facts from a
 * `HardwareProfile` without booting Babylon. Pure data traversal.
 *
 * Stage V1BG. Imports from `src/topology/hardware/profiles` + `./types`
 * directly (not the package barrel) so no eager Babylon code paths are
 * reachable — only erased type imports.
 *
 * Doctrine references:
 *   - design-review/.../desk-design-board/contracts/role-to-glyph-to-primitive-map.md
 *   - design-review/.../model-kit-v0/contracts/topology-selection-to-model-map.md
 */

import { findProfile } from "../../../topology/hardware/profiles";
import type {
  FaceplateItem,
  HardwareProfile,
} from "../../../topology/hardware/types";

export interface HardwarePassport {
  /** Profile id from the hardware kit (e.g. `access24`, `unk1u`). */
  readonly profileId: string;
  /** Human-readable profile name. */
  readonly name: string;
  /** Vendor stamp on the faceplate (e.g. "ANTHRACITE"). */
  readonly vendor: string;
  /** Model stamp (e.g. "AXS-148-G"). */
  readonly model: string;
  /** Chassis family bucket from the kit (switch / router / …). */
  readonly chassisFamily: HardwareProfile["family"];
  /** Translucent appliance flag — propagates to the glass finish. */
  readonly virtual: boolean;
  /** Rack units. `null` for non-rack form factors (WAP, SFP module). */
  readonly rackUnits: number | null;
  /** Physical dimensions in millimetres. */
  readonly dims: HardwareProfile["dims"];
  /** Counts derived from the faceplate. */
  readonly counts: PortAndModuleCounts;
}

export interface PortAndModuleCounts {
  readonly rj45: number;
  readonly sfp: number;
  readonly qsfp: number;
  readonly totalPorts: number;
  readonly bays: number;
  readonly blades: number;
  readonly psu: number;
  readonly fan: number;
  readonly leds: number;
  readonly screens: number;
}

function emptyCounts(): PortAndModuleCounts {
  return {
    rj45: 0,
    sfp: 0,
    qsfp: 0,
    totalPorts: 0,
    bays: 0,
    blades: 0,
    psu: 0,
    fan: 0,
    leds: 0,
    screens: 0,
  };
}

function tallyItem(
  item: FaceplateItem,
  acc: {
    rj45: number;
    sfp: number;
    qsfp: number;
    bays: number;
    blades: number;
    psu: number;
    fan: number;
    leds: number;
    screens: number;
  },
): void {
  switch (item.kind) {
    case "portGrid":
      acc.rj45 += item.cols * item.rows;
      break;
    case "sfpRow":
      acc.sfp += item.n;
      break;
    case "qsfpRow":
      acc.qsfp += item.n;
      break;
    case "bay":
      acc.bays += 1;
      break;
    case "blade":
      acc.blades += 1;
      break;
    case "psu":
      acc.psu += 1;
      break;
    case "fan":
      acc.fan += 1;
      break;
    case "ledBank":
      acc.leds += item.labels.length;
      break;
    case "screen":
      acc.screens += 1;
      break;
    case "label":
    case "ventStrip":
      // labels are signage; module variants arrive via populated bays.
      break;
  }
}

function countsFor(profile: HardwareProfile): PortAndModuleCounts {
  const acc = {
    rj45: 0,
    sfp: 0,
    qsfp: 0,
    bays: 0,
    blades: 0,
    psu: 0,
    fan: 0,
    leds: 0,
    screens: 0,
  };
  for (const item of profile.faceplate) tallyItem(item, acc);
  return {
    rj45: acc.rj45,
    sfp: acc.sfp,
    qsfp: acc.qsfp,
    totalPorts: acc.rj45 + acc.sfp + acc.qsfp,
    bays: acc.bays,
    blades: acc.blades,
    psu: acc.psu,
    fan: acc.fan,
    leds: acc.leds,
    screens: acc.screens,
  };
}

/**
 * Build a passport for the given hardware profile id. Returns `null`
 * when the id does not resolve in the kit.
 */
export function passportFor(profileId: string): HardwarePassport | null {
  const profile = findProfile(profileId);
  if (!profile) return null;
  return {
    profileId: profile.id,
    name: profile.name,
    vendor: profile.vendor,
    model: profile.model,
    chassisFamily: profile.family,
    virtual: profile.virtual === true,
    rackUnits: profile.rackUnits ?? null,
    dims: profile.dims,
    counts: countsFor(profile),
  };
}

/**
 * Convenience — passport that defaults to `unk1u`'s shape when the id
 * is unknown. Useful for UIs that must always render *something*.
 */
export function passportOrUnknown(profileId: string): HardwarePassport {
  return passportFor(profileId) ?? passportFor("unk1u") ?? {
    profileId: "unk1u",
    name: "Unknown Device",
    vendor: "ANTHRACITE",
    model: "AXU-UNK",
    chassisFamily: "unknown",
    virtual: false,
    rackUnits: 1,
    dims: { w: 482.6, h: 44.45, d: 280 },
    counts: emptyCounts(),
  };
}

/**
 * Intent payload emitted when the operator asks to inspect the
 * hardware behind a selected topology node. Stage V1BG keeps this
 * inside the Blueprint canvas; V1BH wires the receiver that swaps the
 * canvas for the 3D `HardwareKitPreview`. V1BJ adds an optional
 * `anchor`/`viewport` pair so the receiver can originate the
 * transition reticle from the selected node's screen position.
 */
export interface HardwareInspectIntent {
  readonly source: "blueprint";
  /** Topology node id from the active env / imported evidence. */
  readonly nodeId: string;
  /** Hardware kit profile id this node resolved to. */
  readonly profileId: string;
  /** Family code from the 8-family topology contract. */
  readonly family: string;
  /** What triggered the intent. */
  readonly trigger: "cta" | "doubleclick";
  /** Hostname / display label at the time of the intent. */
  readonly label: string;
  /**
   * Screen rect of the selected glyph at intent dispatch time,
   * measured in pixels relative to the inspect receiver's overlay
   * (which contains both the Blueprint canvas and the inspect scene).
   * Optional — when absent the receiver falls back to viewport centre.
   */
  readonly anchor?: AnchorRect;
  /** Viewport size of the receiver overlay at intent dispatch. */
  readonly viewport?: { readonly w: number; readonly h: number };
}

export interface AnchorRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
