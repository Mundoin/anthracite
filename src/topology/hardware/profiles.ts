/**
 * Hardware profile catalog — 21 procedural device profiles.
 *
 * Ported from design-review/anthracite-topology-hardware-model-kit-v0/src/hardwareProfiles.ts
 * in stage V1BE. unk1u carries family='unknown' per V1BD union widening.
 *
 * All faceplate coords in millimetres. Chassis dims also millimetres.
 */

import type {
  FaceplateItem,
  HardwareProfile,
  PortKind,
} from "./types";

const U = 44.45; // 1 rack unit
const W19 = 482.6; // 19" rack width

function portGridRJ45(
  x: number,
  y: number,
  cols: number,
  rows: number,
  idPrefix = "port",
): FaceplateItem {
  return {
    kind: "portGrid",
    x,
    y,
    cols,
    rows,
    pitchX: 14,
    pitchY: 13,
    portW: 12,
    portH: 10.5,
    idPrefix,
    portKind: "1g",
  };
}

function sfpRow(
  x: number,
  y: number,
  n: number,
  idPrefix = "sfp",
  portKind: PortKind = "10g",
): FaceplateItem {
  return { kind: "sfpRow", x, y, n, pitchX: 16, idPrefix, portKind };
}

function qsfpRow(
  x: number,
  y: number,
  n: number,
  idPrefix = "qsfp",
): FaceplateItem {
  return { kind: "qsfpRow", x, y, n, pitchX: 21, idPrefix };
}

function ledBank(
  x: number,
  y: number,
  labels: string[],
  idPrefix = "led",
): FaceplateItem {
  return { kind: "ledBank", x, y, labels, idPrefix };
}

export const SwitchProfiles: HardwareProfile[] = [
  {
    id: "access24",
    family: "switch",
    name: "1U Access Switch · 24 RJ45 + 4 SFP",
    dims: { w: W19, h: U, d: 300 },
    rackUnits: 1,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXS-124-G",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 6,
        text: "ANTHRACITE  AXS-124-G  ·  24× 1G + 4× SFP+",
        vendorPlate: true,
      },
      ledBank(8, 18, ["SYS", "FAN", "PSU", "MGMT"]),
      portGridRJ45(70, 14, 12, 2, "port"),
      sfpRow(W19 - 80, 14, 4, "sfp", "10g"),
      { kind: "ventStrip", x: W19 - 18, y: 10, w: 12, h: 24 },
    ],
  },
  {
    id: "access48",
    family: "switch",
    name: "1U Access Switch · 48 RJ45 + 4 SFP",
    dims: { w: W19, h: U, d: 320 },
    rackUnits: 1,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXS-148-G",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 6,
        text: "ANTHRACITE  AXS-148-G  ·  48× 1G + 4× SFP+",
        vendorPlate: true,
      },
      ledBank(8, 18, ["SYS", "FAN", "PSU", "MGMT"]),
      portGridRJ45(70, 14, 24, 2, "port"),
      sfpRow(W19 - 80, 14, 4, "sfp", "10g"),
      { kind: "ventStrip", x: W19 - 18, y: 10, w: 12, h: 24 },
    ],
  },
  {
    id: "leaf32q",
    family: "switch",
    name: "1U Datacenter Leaf · 32 QSFP",
    dims: { w: W19, h: U, d: 420 },
    rackUnits: 1,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXL-32QC",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 6,
        text: "ANTHRACITE  AXL-32QC  ·  32× QSFP28 100G",
        vendorPlate: true,
      },
      ledBank(8, 18, ["SYS", "FAN", "PSU"]),
      qsfpRow(60, 12, 16, "qsfp"),
      qsfpRow(60, 24, 16, "qsfp"),
    ],
  },
  {
    id: "dist2u",
    family: "switch",
    name: "2U Distribution Switch · stacked uplinks",
    dims: { w: W19, h: U * 2, d: 380 },
    rackUnits: 2,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXD-248-S",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 8,
        text: "ANTHRACITE  AXD-248-S  ·  DIST STACK",
        vendorPlate: true,
      },
      ledBank(8, 22, ["SYS", "FAN", "PSU", "STK", "MGMT"]),
      portGridRJ45(70, 18, 24, 2, "port"),
      portGridRJ45(70, 50, 24, 2, "port"),
      qsfpRow(W19 - 90, 24, 4, "uplink"),
      { kind: "fan", x: W19 - 30, y: 18, w: 22, h: 52, idPrefix: "fan", index: 0 },
    ],
  },
  {
    id: "core4u_sw",
    family: "switch",
    name: "4U Modular Core Switch · 6 line-cards",
    dims: { w: W19, h: U * 4, d: 600 },
    rackUnits: 4,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXC-4U-SW",
    faceplate: (() => {
      const items: FaceplateItem[] = [
        {
          kind: "label",
          x: 10,
          y: 8,
          text: "ANTHRACITE  AXC-4U-SW  ·  MODULAR CORE",
          vendorPlate: true,
        },
        {
          kind: "screen",
          x: 10,
          y: 18,
          w: 110,
          h: 22,
          text: ["SUPERVISOR · RP-A", "ACTIVE · 4 peers up"],
          idPrefix: "supervisor",
        },
        ledBank(130, 22, ["ACT", "STBY", "CON", "FAN"], "sysled"),
      ];
      const bayW = 140;
      const bayH = 50;
      const top = 50;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          items.push({
            kind: "bay",
            x: 10 + c * (bayW + 8),
            y: top + r * (bayH + 6),
            w: bayW,
            h: bayH,
            populated: idx !== 4,
            idPrefix: "bay",
            index: idx,
            cardKind: idx === 4 ? "empty" : "lc-48p",
          });
        }
      }
      items.push({
        kind: "psu",
        x: W19 - 70,
        y: 20,
        w: 62,
        h: 24,
        idPrefix: "psu",
        index: 0,
      });
      items.push({
        kind: "psu",
        x: W19 - 70,
        y: 50,
        w: 62,
        h: 24,
        idPrefix: "psu",
        index: 1,
      });
      return items;
    })(),
  },
];

export const RouterProfiles: HardwareProfile[] = [
  {
    id: "edge1u",
    family: "router",
    name: "1U Edge Router · mixed RJ45/SFP/WAN",
    dims: { w: W19, h: U, d: 340 },
    rackUnits: 1,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXR-100-E",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 6,
        text: "ANTHRACITE  AXR-100-E  ·  EDGE ROUTER · AS 65501",
        vendorPlate: true,
      },
      ledBank(8, 18, ["SYS", "WAN", "BGP", "MGMT"]),
      qsfpRow(72, 14, 2, "wan"),
      sfpRow(125, 14, 4, "sfp", "10g"),
      portGridRJ45(210, 14, 8, 2, "lan"),
      {
        kind: "screen",
        x: W19 - 80,
        y: 12,
        w: 70,
        h: 22,
        text: ["BGP UP · 4 peers", "AS 65501"],
        idPrefix: "screen",
      },
    ],
  },
  {
    id: "branch2u",
    family: "router",
    name: "2U Branch Router · LCD + service slots",
    dims: { w: W19, h: U * 2, d: 360 },
    rackUnits: 2,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXR-200-B",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 8,
        text: "ANTHRACITE  AXR-200-B  ·  BRANCH",
        vendorPlate: true,
      },
      {
        kind: "screen",
        x: 8,
        y: 18,
        w: 90,
        h: 32,
        text: ["apex-branch-04", "CPU 14%  WAN UP"],
        idPrefix: "lcd",
      },
      ledBank(105, 22, ["SYS", "WAN", "VPN", "BAT"]),
      {
        kind: "bay",
        x: 160,
        y: 18,
        w: 80,
        h: 32,
        populated: true,
        idPrefix: "svc",
        index: 0,
        cardKind: "lte",
      },
      {
        kind: "bay",
        x: 250,
        y: 18,
        w: 80,
        h: 32,
        populated: false,
        idPrefix: "svc",
        index: 1,
        cardKind: "empty",
      },
      qsfpRow(W19 - 110, 22, 2, "wan"),
      sfpRow(W19 - 110, 50, 4, "sfp", "10g"),
    ],
  },
  {
    id: "wancore2u",
    family: "router",
    name: "2U WAN/Core Router · dense SFP/QSFP",
    dims: { w: W19, h: U * 2, d: 420 },
    rackUnits: 2,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXR-202-C",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 8,
        text: "ANTHRACITE  AXR-202-C  ·  WAN / CORE",
        vendorPlate: true,
      },
      ledBank(8, 22, ["SYS", "FAN", "PSU", "BGP", "MPLS"]),
      qsfpRow(70, 18, 8, "qsfp"),
      sfpRow(70, 50, 16, "sfp", "10g"),
      { kind: "psu", x: W19 - 60, y: 18, w: 52, h: 26, idPrefix: "psu", index: 0 },
      { kind: "psu", x: W19 - 60, y: 48, w: 52, h: 26, idPrefix: "psu", index: 1 },
    ],
  },
  {
    id: "core4u_rt",
    family: "router",
    name: "4U Modular Core Router · RP + line-cards",
    dims: { w: W19, h: U * 4, d: 620 },
    rackUnits: 4,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXC-4U-RT",
    faceplate: (() => {
      const items: FaceplateItem[] = [
        {
          kind: "label",
          x: 10,
          y: 8,
          text: "ANTHRACITE  AXC-4U-RT  ·  MODULAR ROUTER",
          vendorPlate: true,
        },
        {
          kind: "screen",
          x: 10,
          y: 18,
          w: 130,
          h: 22,
          text: ["ROUTE PROCESSOR · ACTIVE", "BGP UP · 12 peers"],
          idPrefix: "rp",
        },
        ledBank(150, 22, ["RP-A", "RP-B", "CON", "MGMT"], "rpled"),
      ];
      const bayW = 140;
      const bayH = 50;
      const top = 50;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          items.push({
            kind: "bay",
            x: 10 + c * (bayW + 8),
            y: top + r * (bayH + 6),
            w: bayW,
            h: bayH,
            populated: idx !== 5,
            idPrefix: "bay",
            index: idx,
            cardKind: idx === 5 ? "empty" : "lc-100g",
          });
        }
      }
      items.push({ kind: "psu", x: W19 - 70, y: 20, w: 62, h: 24, idPrefix: "psu", index: 0 });
      items.push({ kind: "psu", x: W19 - 70, y: 50, w: 62, h: 24, idPrefix: "psu", index: 1 });
      return items;
    })(),
  },
  {
    id: "vrouter",
    family: "router",
    name: "Virtual Router · translucent appliance slab",
    dims: { w: W19, h: U * 2, d: 360 },
    rackUnits: 2,
    finish: "glass",
    virtual: true,
    vendor: "ANTHRACITE",
    model: "v-AXR-01",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 8,
        text: "VIRTUAL  v-AXR-01  ·  4 vCPU / 8 GB",
        vendorPlate: true,
      },
      {
        kind: "screen",
        x: 8,
        y: 22,
        w: 120,
        h: 30,
        text: ["K8S NETWORK NODE", "status: up · vIF ×6"],
        idPrefix: "vscreen",
      },
      ledBank(140, 26, ["VM", "NET", "CTL"]),
      sfpRow(W19 - 220, 26, 6, "vnic", "10g"),
    ],
  },
];

export const FirewallProfiles: HardwareProfile[] = [
  {
    id: "fw1u",
    family: "firewall",
    name: "1U Firewall · trust/untrust groups",
    dims: { w: W19, h: U, d: 320 },
    rackUnits: 1,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXF-100",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 6,
        text: "ANTHRACITE  AXF-100  ·  TRUST | UNTRUST",
        vendorPlate: true,
      },
      ledBank(8, 18, ["SYS", "HA", "VPN", "MGMT"]),
      portGridRJ45(70, 14, 8, 2, "trust"),
      portGridRJ45(200, 14, 8, 2, "untrust"),
      sfpRow(W19 - 80, 14, 4, "sfp", "10g"),
    ],
  },
  {
    id: "fw2u_ha",
    family: "firewall",
    name: "2U Firewall · HA + LCD + fans",
    dims: { w: W19, h: U * 2, d: 400 },
    rackUnits: 2,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXF-200-HA",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 8,
        text: "ANTHRACITE  AXF-200-HA  ·  ACTIVE/STANDBY",
        vendorPlate: true,
      },
      {
        kind: "screen",
        x: 8,
        y: 22,
        w: 100,
        h: 28,
        text: ["142,318 sessions", "HA  A/S  · sync ok"],
        idPrefix: "lcd",
      },
      ledBank(120, 24, ["SYS", "HA", "VPN", "IPS", "SSL"]),
      portGridRJ45(70, 52, 12, 2, "trust"),
      qsfpRow(260, 22, 4, "untrust"),
      sfpRow(260, 52, 4, "mgmt", "10g"),
      { kind: "fan", x: W19 - 30, y: 14, w: 22, h: 60, idPrefix: "fan", index: 0 },
    ],
  },
  {
    id: "fw_branch",
    family: "firewall",
    name: "Branch Firewall · WAN/LAN zones",
    dims: { w: 320, h: U, d: 240 },
    rackUnits: 1,
    finish: "lightMetal",
    vendor: "ANTHRACITE",
    model: "AXF-B-30",
    faceplate: [
      {
        kind: "label",
        x: 6,
        y: 6,
        text: "ANTHRACITE  AXF-B-30  ·  BRANCH",
        vendorPlate: true,
      },
      ledBank(6, 18, ["SYS", "WAN", "LAN", "VPN"]),
      portGridRJ45(72, 14, 4, 2, "wan"),
      portGridRJ45(140, 14, 4, 2, "lan"),
      sfpRow(220, 16, 2, "sfp", "10g"),
      { kind: "screen", x: 260, y: 14, w: 50, h: 24, text: ["UP"], idPrefix: "lcd" },
    ],
  },
  {
    id: "fw_dc",
    family: "firewall",
    name: "Datacenter Firewall · dense SFP/QSFP",
    dims: { w: W19, h: U * 2, d: 460 },
    rackUnits: 2,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXF-DC-2U",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 8,
        text: "ANTHRACITE  AXF-DC-2U  ·  DATACENTER",
        vendorPlate: true,
      },
      ledBank(8, 22, ["SYS", "HA", "IPS", "SSL", "TLS"]),
      qsfpRow(70, 18, 8, "q"),
      sfpRow(70, 50, 16, "sfp", "10g"),
      { kind: "psu", x: W19 - 60, y: 18, w: 52, h: 26, idPrefix: "psu", index: 0 },
      { kind: "psu", x: W19 - 60, y: 48, w: 52, h: 26, idPrefix: "psu", index: 1 },
    ],
  },
  {
    id: "vfirewall",
    family: "firewall",
    name: "Virtual Firewall · translucent slab",
    dims: { w: W19, h: U * 2, d: 360 },
    rackUnits: 2,
    finish: "glass",
    virtual: true,
    vendor: "ANTHRACITE",
    model: "v-AXF-01",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 8,
        text: "VIRTUAL  v-AXF-01  ·  8 vCPU / 16 GB",
        vendorPlate: true,
      },
      {
        kind: "screen",
        x: 8,
        y: 22,
        w: 120,
        h: 30,
        text: ["K8S SECURITY NODE", "142K sessions · IPS on"],
        idPrefix: "vscreen",
      },
      ledBank(140, 26, ["VM", "HA", "POL"]),
      sfpRow(W19 - 220, 26, 6, "vnic", "10g"),
    ],
  },
];

export const SupportProfiles: HardwareProfile[] = [
  {
    id: "wap",
    family: "support",
    name: "Wireless AP · ceiling form",
    dims: { w: 220, h: 35, d: 220 },
    finish: "lightMetal",
    vendor: "ANTHRACITE",
    model: "AXW-AP7",
    faceplate: [
      {
        kind: "label",
        x: 10,
        y: 6,
        text: "ANTHRACITE  AXW-AP7  ·  Wi-Fi 7",
        vendorPlate: true,
      },
      ledBank(10, 16, ["PWR", "2.4", "5", "6"]),
      portGridRJ45(100, 12, 1, 1, "poe"),
      {
        kind: "screen",
        x: 130,
        y: 12,
        w: 70,
        h: 18,
        text: ["SSID: corp-iot", "54 clients"],
        idPrefix: "screen",
      },
    ],
  },
  {
    id: "server1u",
    family: "support",
    name: "Server / VM Host · 1U compute",
    dims: { w: W19, h: U, d: 700 },
    rackUnits: 1,
    finish: "lightMetal",
    vendor: "ANTHRACITE",
    model: "AXH-1U",
    faceplate: (() => {
      const items: FaceplateItem[] = [
        {
          kind: "label",
          x: 8,
          y: 6,
          text: "ANTHRACITE  AXH-1U  ·  COMPUTE NODE",
          vendorPlate: true,
        },
        ledBank(8, 18, ["PWR", "HDD", "NIC", "IDR"]),
      ];
      for (let i = 0; i < 8; i++) {
        items.push({
          kind: "bay",
          x: 60 + i * 34,
          y: 12,
          w: 30,
          h: 26,
          populated: i !== 7,
          idPrefix: "drive",
          index: i,
          cardKind: "ssd",
        });
      }
      items.push(sfpRow(W19 - 80, 16, 4, "nic", "25g"));
      return items;
    })(),
  },
  {
    id: "blade10u",
    family: "support",
    name: "Blade Chassis · 8 vertical blades",
    dims: { w: W19, h: U * 10, d: 700 },
    rackUnits: 10,
    finish: "darkMetal",
    vendor: "ANTHRACITE",
    model: "AXB-10U",
    faceplate: (() => {
      const items: FaceplateItem[] = [
        {
          kind: "label",
          x: 12,
          y: 8,
          text: "ANTHRACITE  AXB-10U  ·  BLADE CHASSIS",
          vendorPlate: true,
        },
        ledBank(W19 - 110, 12, ["SYS", "POW", "FAN"], "sysled"),
      ];
      const bladeW = 50;
      const bladeH = 380;
      const top = 36;
      for (let b = 0; b < 8; b++) {
        items.push({
          kind: "blade",
          x: 14 + b * (bladeW + 4),
          y: top,
          w: bladeW,
          h: bladeH,
          populated: b !== 6,
          idPrefix: "blade",
          index: b,
        });
      }
      items.push({
        kind: "screen",
        x: W19 - 60,
        y: 36,
        w: 50,
        h: 200,
        text: ["FABRIC", "IM-A", "active"],
        idPrefix: "fabric",
      });
      items.push(qsfpRow(W19 - 60, 250, 2, "fab"));
      items.push(qsfpRow(W19 - 60, 280, 2, "fab"));
      items.push({ kind: "psu", x: 14, y: 422, w: 90, h: 22, idPrefix: "psu", index: 0 });
      items.push({ kind: "psu", x: 110, y: 422, w: 90, h: 22, idPrefix: "psu", index: 1 });
      items.push({ kind: "psu", x: 206, y: 422, w: 90, h: 22, idPrefix: "psu", index: 2 });
      items.push({ kind: "fan", x: 304, y: 422, w: 80, h: 22, idPrefix: "fan", index: 0 });
      items.push({ kind: "fan", x: 390, y: 422, w: 80, h: 22, idPrefix: "fan", index: 1 });
      return items;
    })(),
  },
  {
    id: "sfp_module",
    family: "support",
    name: "SFP/QSFP Module · removable optic",
    dims: { w: 60, h: 18, d: 90 },
    finish: "lightMetal",
    vendor: "ANTHRACITE",
    model: "AXO-QSFP28-LR4",
    faceplate: [
      {
        kind: "label",
        x: 4,
        y: 3,
        text: "QSFP28 100G LR4",
        size: 3.5,
        vendorPlate: true,
      },
      ledBank(4, 10, ["LINK", "TX"]),
      { kind: "qsfpRow", x: 28, y: 5, n: 1, pitchX: 20, idPrefix: "optic" },
    ],
  },
  {
    id: "patch1u",
    family: "support",
    name: "Patch / Optic Panel · 24-port passive",
    dims: { w: W19, h: U, d: 100 },
    rackUnits: 1,
    finish: "lightMetal",
    vendor: "ANTHRACITE",
    model: "AXP-24LC",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 6,
        text: "ANTHRACITE  AXP-24LC  ·  24× LC DUPLEX",
        vendorPlate: true,
      },
      portGridRJ45(60, 14, 12, 2, "lc"),
    ],
  },
];

export const UnknownProfiles: HardwareProfile[] = [
  {
    id: "unk1u",
    family: "unknown",
    name: "Unknown Device · generic 1U fallback",
    dims: { w: W19, h: U, d: 280 },
    rackUnits: 1,
    finish: "lightMetal",
    vendor: "ANTHRACITE",
    model: "AXU-UNK",
    faceplate: [
      {
        kind: "label",
        x: 8,
        y: 6,
        text: "UNKNOWN DEVICE  ·  unclassified",
        vendorPlate: true,
      },
      ledBank(8, 18, ["SYS", "UNK", "UNK", "UNK"]),
      { kind: "label", x: 80, y: 16, text: "hostname: unknown", size: 4 },
    ],
  },
];

export const AllProfiles: HardwareProfile[] = [
  ...SwitchProfiles,
  ...RouterProfiles,
  ...FirewallProfiles,
  ...SupportProfiles,
  ...UnknownProfiles,
];

export function findProfile(id: string): HardwareProfile | undefined {
  return AllProfiles.find((p) => p.id === id);
}
