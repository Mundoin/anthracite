import type { StatusSignal } from "../components/shell/StatusBar";
import type { ReadinessDomain, EventRow, SiteRow } from "../components/d2/EnvironmentDetailD2";
import type { InspectorHealthCell, InspectorInterfaceRow } from "../components/shell/Inspector";
import type { RowSeed } from "./hierarchyTypes";

export const ROW_SEEDS: readonly RowSeed[] = [
  { group: "production", id: "apex-prod-emea", region: "London / Frankfurt / Amsterdam", scope: "EMEA · Production", sites: 41, readiness: 96, l2: 99, l3: 97, ebgp: 91, drift: 23, events: 4, owner: "NetOps EU", last: "38s ago" },
  { group: "production", id: "apex-prod-amer", region: "Ashburn / SJC / DFW", scope: "AMER · Production", sites: 56, readiness: 92, l2: 98, l3: 95, ebgp: 88, drift: 41, events: 2, owner: "NetOps US", last: "1m ago" },
  { group: "production", id: "apex-prod-apac", region: "Tokyo / Singapore / Sydney", scope: "APAC · Production", sites: 28, readiness: 84, l2: 94, l3: 88, ebgp: 80, drift: 87, events: 9, owner: "NetOps APAC", last: "2m ago" },
  { group: "production", id: "apex-edge-retail", region: "412 retail sites", scope: "Global · Retail Edge", sites: 412, readiness: 78, l2: 92, l3: 85, ebgp: 76, drift: 122, events: 14, owner: "Retail NetEng", last: "4m ago" },
  { group: "non-prod", id: "apex-staging-emea", region: "London / Frankfurt", scope: "EMEA · Staging", sites: 6, readiness: 88, l2: 95, l3: 90, ebgp: 84, drift: 14, events: 0, owner: "NetOps EU", last: "11m ago" },
  { group: "non-prod", id: "apex-lab-london", region: "London · MTH-LAB-7", scope: "EMEA · Lab", sites: 1, readiness: 100, l2: 100, l3: 100, ebgp: 100, drift: 0, events: 0, owner: "Platform Eng", last: "8s ago" },
  { group: "special", id: "apex-iso-mtn-dc", region: "Mountain View · DC-3", scope: "AMER · Isolated DC", sites: 1, readiness: 41, l2: 78, l3: 60, ebgp: 55, drift: 188, events: 22, owner: "Compliance", last: "21m ago" },
  { group: "special", id: "apex-tenant-novax", region: "AMS / FRA · MSP", scope: "Tenant · Novax", sites: 18, readiness: 94, l2: 98, l3: 94, ebgp: 90, drift: 7, events: 1, owner: "MSP-A", last: "47s ago" },
  { group: "special", id: "env-fab-demo", region: "Synthetic · Local", scope: "Demo · Fabricated", sites: 1, readiness: 100, l2: 100, l3: 100, ebgp: 100, drift: 0, events: 0, owner: "Fabricator", last: "fabricated" },
];

export const ROW_STATUS_FALLBACK: Record<string, StatusSignal> = {
  "apex-prod-emea": "ok",
  "apex-prod-amer": "ok",
  "apex-prod-apac": "warn",
  "apex-edge-retail": "warn",
  "apex-staging-emea": "idle",
  "apex-lab-london": "ok",
  "apex-iso-mtn-dc": "err",
  "apex-tenant-novax": "ok",
  "env-fab-demo": "idle",
};

export const DEVICE_FALLBACK: Record<string, number> = {
  "apex-prod-emea": 2184,
  "apex-prod-amer": 3041,
  "apex-prod-apac": 1604,
  "apex-edge-retail": 1648,
  "apex-staging-emea": 312,
  "apex-lab-london": 64,
  "apex-iso-mtn-dc": 188,
  "apex-tenant-novax": 904,
  "env-fab-demo": 3,
};

export const DETAIL_DOMAINS_SEED: readonly ReadinessDomain[] = [
  { id: "l2", label: "L2 fabric", pct: 99, fraction: "417 / 418", status: "ok" },
  { id: "l3", label: "L3 underlay", pct: 97, fraction: "802 / 827", status: "ok" },
  { id: "ebgp", label: "eBGP edge", pct: 91, fraction: "54 / 59", status: "warn" },
  { id: "oob", label: "Out-of-band mgmt", pct: 100, fraction: "2184 / 2184", status: "ok" },
  { id: "ntp", label: "NTP discipline", pct: 88, fraction: "1922 / 2184", status: "warn" },
  { id: "tacacs", label: "TACACS reachability", pct: 76, fraction: "1660 / 2184", status: "warn" },
  { id: "syslog", label: "Syslog ingest", pct: 100, fraction: "2184 / 2184", status: "ok" },
];

export const DETAIL_EVENTS_SEED: readonly EventRow[] = [
  { id: "1", t: "17:42:08", sev: "err",  src: "fra-leaf-04.apex", cat: "link",   msg: "Eth1/14 transitioned down · LACP partner unreachable" },
  { id: "2", t: "17:41:55", sev: "warn", src: "lon-leaf-11.apex", cat: "optic",  msg: "Pre-FEC BER on Eth49/1 rising · 1.2e-6 over 5m" },
  { id: "3", t: "17:38:11", sev: "warn", src: "lon-leaf-12.apex", cat: "config", msg: "Drift detected · 4 lines diverge from baseline LEAF-BASE-EU" },
  { id: "4", t: "17:36:02", sev: "err",  src: "ams-edge-03.apex", cat: "bgp",    msg: "eBGP peer 185.34.12.4 went idle · hold timer expired" },
  { id: "5", t: "17:31:48", sev: "info", src: "lon-core-01.apex", cat: "engine", msg: "Polling cycle 04124 complete · 2,184/2,184 reachable" },
  { id: "6", t: "17:29:30", sev: "warn", src: "par-leaf-01.apex", cat: "temp",   msg: "Inlet temperature 42°C · threshold 40°C" },
];

export const DETAIL_SITES_SEED: readonly SiteRow[] = [
  { id: "lon", status: "ok",   site: "LON-CORE", region: "EMEA-North",   role: "core+spine", devices: 248, reach: 248, readiness: 99, events: 1, maint: "sat 02:00 BST" },
  { id: "fra", status: "ok",   site: "FRA-CORE", region: "EMEA-Central", role: "core",       devices: 180, reach: 180, readiness: 98, events: 0, maint: "sun 03:00 CET" },
  { id: "ams", status: "ok",   site: "AMS-EDGE", region: "EMEA-North",   role: "edge",       devices: 96,  reach: 95,  readiness: 94, events: 1, maint: "fri 23:00 CET" },
  { id: "par", status: "warn", site: "PAR-EDGE", region: "EMEA-West",    role: "edge",       devices: 64,  reach: 62,  readiness: 86, events: 2, maint: "thu 22:00 CET" },
  { id: "dub", status: "ok",   site: "DUB-EDGE", region: "EMEA-West",    role: "edge",       devices: 48,  reach: 48,  readiness: 97, events: 0, maint: "sat 01:00 IST" },
  { id: "muc", status: "warn", site: "MUC-DC1",  region: "EMEA-South",   role: "dc",         devices: 140, reach: 138, readiness: 82, events: 1, maint: "wed 02:30 CET" },
  { id: "mad", status: "ok",   site: "MAD-EDGE", region: "EMEA-West",    role: "edge",       devices: 38,  reach: 38,  readiness: 99, events: 0, maint: "—" },
  { id: "mil", status: "idle", site: "MIL-EDGE", region: "EMEA-South",   role: "edge",       devices: 32,  reach: 32,  readiness: 91, events: 0, maint: "next week" },
];

export const INSPECTOR_HEALTH_SEED: readonly InspectorHealthCell[] = [
  { label: "CPU avg", value: "14 %", pct: 14 },
  { label: "Memory", value: "38 %", pct: 38 },
  { label: "Inlet", value: "37 °C", pct: 37 },
  { label: "Power", value: "dual" },
];

export const INSPECTOR_INTERFACES_SEED: readonly InspectorInterfaceRow[] = [
  { status: "ok",   name: "Eth1/1",  peer: "→ lon-spine-01 Eth7/1", bw: "94.2 G" },
  { status: "ok",   name: "Eth1/2",  peer: "→ lon-spine-02 Eth7/1", bw: "91.4 G" },
  { status: "ok",   name: "Eth1/3",  peer: "→ lon-spine-03 Eth7/1", bw: "88.2 G" },
  { status: "ok",   name: "Eth49/1", peer: "→ ams-edge-03 Eth5/3",  bw: "38.1 G" },
  { status: "ok",   name: "Eth50/1", peer: "→ fra-core-01 Eth7/3",  bw: "52.3 G" },
  { status: "warn", name: "Eth5/14", peer: "→ lon-leaf-11 Eth52",   bw: "4.1 G" },
];
