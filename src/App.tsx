import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { AppShell } from "./components/shell/AppShell";
import {
  Inspector,
  type InspectorHealthCell,
  type InspectorIdentityRow,
  type InspectorInterfaceRow,
  type InspectorSubject,
  type InspectorTabSpec,
} from "./components/shell/Inspector";
import type { EnvDotState, TitleBarEnv } from "./components/shell/TitleBar";
import type { ModeId } from "./components/shell/ModeRail";
import { SubNav, type SubNavItem } from "./components/shell/SubNav";
import {
  SecondaryNav,
  type SecondaryNavGroup,
} from "./components/shell/SecondaryNav";
import type { StatusCell, StatusSignal } from "./components/shell/StatusBar";
import {
  EnvironmentCentreD1,
  type EnvRow,
  type KpiSpec,
} from "./components/d1/EnvironmentCentreD1";
import {
  EnvironmentDetailD2,
  type EventRow,
  type KpiMiniSpec,
  type ReadinessDomain,
  type SiteRow,
} from "./components/d2/EnvironmentDetailD2";
import {
  getActiveEnvironment,
  getEnvironmentReadiness,
  listEnvironments,
  setActiveEnvironment,
} from "./api/environment";
import type {
  Environment,
  EnvironmentReadiness,
  EnvironmentStatus,
} from "./types/environment";

type View = "list" | "detail";

const STATUS_TO_DOT: Record<EnvironmentStatus, EnvDotState> = {
  healthy: "ok",
  degraded: "warn",
  offline: "err",
  unknown: "idle",
};

const STATUS_TO_SIGNAL: Record<EnvironmentStatus, StatusSignal> = {
  healthy: "ok",
  degraded: "warn",
  offline: "err",
  unknown: "idle",
};

const LIST_SUBNAV: readonly SubNavItem[] = [
  { id: "all", label: "All", count: 8 },
  { id: "production", label: "Production", count: 4 },
  { id: "staging", label: "Staging", count: 1 },
  { id: "lab", label: "Lab", count: 1 },
  { id: "tenants", label: "Tenants", count: 1 },
  { id: "isolated", label: "Isolated", count: 1 },
];

const DETAIL_SUBNAV: readonly SubNavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "sites", label: "Sites", count: 41 },
  { id: "devices", label: "Devices", count: "2,184" },
  { id: "topology", label: "Topology" },
  { id: "configs", label: "Configs" },
  { id: "baselines", label: "Baselines" },
  { id: "events", label: "Events", count: 4 },
  { id: "compliance", label: "Compliance" },
  { id: "audit", label: "Audit" },
];

interface RowSeed {
  readonly group: "production" | "non-prod" | "special";
  readonly id: string;
  readonly region: string;
  readonly scope: string;
  readonly sites: number;
  readonly readiness: number;
  readonly l2: number;
  readonly l3: number;
  readonly ebgp: number;
  readonly drift: number;
  readonly events: number;
  readonly owner: string;
  readonly last: string;
}

const ROW_SEEDS: readonly RowSeed[] = [
  { group: "production", id: "apex-prod-emea", region: "London / Frankfurt / Amsterdam", scope: "EMEA · Production", sites: 41, readiness: 96, l2: 99, l3: 97, ebgp: 91, drift: 23, events: 4, owner: "NetOps EU", last: "38s ago" },
  { group: "production", id: "apex-prod-amer", region: "Ashburn / SJC / DFW", scope: "AMER · Production", sites: 56, readiness: 92, l2: 98, l3: 95, ebgp: 88, drift: 41, events: 2, owner: "NetOps US", last: "1m ago" },
  { group: "production", id: "apex-prod-apac", region: "Tokyo / Singapore / Sydney", scope: "APAC · Production", sites: 28, readiness: 84, l2: 94, l3: 88, ebgp: 80, drift: 87, events: 9, owner: "NetOps APAC", last: "2m ago" },
  { group: "production", id: "apex-edge-retail", region: "412 retail sites", scope: "Global · Retail Edge", sites: 412, readiness: 78, l2: 92, l3: 85, ebgp: 76, drift: 122, events: 14, owner: "Retail NetEng", last: "4m ago" },
  { group: "non-prod", id: "apex-staging-emea", region: "London / Frankfurt", scope: "EMEA · Staging", sites: 6, readiness: 88, l2: 95, l3: 90, ebgp: 84, drift: 14, events: 0, owner: "NetOps EU", last: "11m ago" },
  { group: "non-prod", id: "apex-lab-london", region: "London · MTH-LAB-7", scope: "EMEA · Lab", sites: 1, readiness: 100, l2: 100, l3: 100, ebgp: 100, drift: 0, events: 0, owner: "Platform Eng", last: "8s ago" },
  { group: "special", id: "apex-iso-mtn-dc", region: "Mountain View · DC-3", scope: "AMER · Isolated DC", sites: 1, readiness: 41, l2: 78, l3: 60, ebgp: 55, drift: 188, events: 22, owner: "Compliance", last: "21m ago" },
  { group: "special", id: "apex-tenant-novax", region: "AMS / FRA · MSP", scope: "Tenant · Novax", sites: 18, readiness: 94, l2: 98, l3: 94, ebgp: 90, drift: 7, events: 1, owner: "MSP-A", last: "47s ago" },
];

const ROW_STATUS_FALLBACK: Record<string, StatusSignal> = {
  "apex-prod-emea": "ok",
  "apex-prod-amer": "ok",
  "apex-prod-apac": "warn",
  "apex-edge-retail": "warn",
  "apex-staging-emea": "idle",
  "apex-lab-london": "ok",
  "apex-iso-mtn-dc": "err",
  "apex-tenant-novax": "ok",
};

const DEVICE_FALLBACK: Record<string, number> = {
  "apex-prod-emea": 2184,
  "apex-prod-amer": 3041,
  "apex-prod-apac": 1604,
  "apex-edge-retail": 1648,
  "apex-staging-emea": 312,
  "apex-lab-london": 64,
  "apex-iso-mtn-dc": 188,
  "apex-tenant-novax": 904,
};

const INSPECTOR_TABS: readonly InspectorTabSpec[] = [
  { id: "overview", label: "Overview" },
  { id: "interfaces", label: "Interfaces" },
  { id: "routing", label: "Routing" },
  { id: "config", label: "Config" },
  { id: "events", label: "Events" },
];

export default function App(): JSX.Element {
  const [view, setView] = useState<View>("list");
  const [activeMode, setActiveMode] = useState<ModeId>("hierarchy");
  const [listSegment, setListSegment] = useState<string>("all");
  const [detailSegment, setDetailSegment] = useState<string>("overview");
  const [inspectorTab, setInspectorTab] = useState<string>("overview");
  const [envs, setEnvs] = useState<readonly Environment[]>([]);
  const [active, setActive] = useState<Environment | null>(null);
  const [readiness, setReadiness] = useState<EnvironmentReadiness | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, a, r] = await Promise.all([
          listEnvironments(),
          getActiveEnvironment(),
          getEnvironmentReadiness(),
        ]);
        if (cancelled) return;
        setEnvs(list);
        setActive(a);
        setReadiness(r);
      } catch {
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshEngineState = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([
        getActiveEnvironment(),
        getEnvironmentReadiness(),
      ]);
      setActive(a);
      setReadiness(r);
    } catch {
      /* ignored — keep last good state */
    }
  }, []);

  const selectEnv = useCallback(
    async (id: string, openDetail: boolean) => {
      try {
        await setActiveEnvironment(id);
        await refreshEngineState();
      } catch {
        /* ignored */
      }
      if (openDetail) {
        setView("detail");
        setDetailSegment("overview");
      }
    },
    [refreshEngineState],
  );

  const titleBarEnv = useMemo<TitleBarEnv | null>(() => {
    if (active) {
      return {
        id: active.id,
        scope: `${active.kind} · ${active.device_count.toLocaleString("en-US")} devices`,
        state: STATUS_TO_DOT[active.status],
      };
    }
    return {
      id: "apex-prod-emea",
      scope: "EMEA · Production · 2,184 devices",
      state: "ok",
    };
  }, [active]);

  const selectedRowId = active?.id ?? "apex-prod-emea";

  const rows = useMemo<readonly EnvRow[]>(() => {
    const byEngineId = new Map(envs.map((e) => [e.id, e] as const));
    return ROW_SEEDS.map((seed) => {
      const live = byEngineId.get(seed.id);
      return {
        id: seed.id,
        status: live ? STATUS_TO_SIGNAL[live.status] : ROW_STATUS_FALLBACK[seed.id] ?? "idle",
        region: seed.region,
        scope: seed.scope,
        devices: live?.device_count ?? DEVICE_FALLBACK[seed.id] ?? 0,
        sites: seed.sites,
        readiness: seed.readiness,
        l2: seed.l2,
        l3: seed.l3,
        ebgp: seed.ebgp,
        drift: seed.drift,
        events: seed.events,
        owner: seed.owner,
        last: seed.last,
      };
    });
  }, [envs]);

  const listKpis = useMemo<readonly KpiSpec[]>(() => {
    const totalEnvs = readiness?.total_environments ?? ROW_SEEDS.length;
    const totalDevices = readiness?.total_devices ?? rows.reduce((s, r) => s + r.devices, 0);
    return [
      {
        id: "reachable",
        label: "Reachable",
        value: totalDevices.toLocaleString("en-US"),
        sub: `${totalEnvs} environments`,
        delta: "+0",
        deltaDir: "flat",
        parts: [readiness?.healthy_count ?? 0, readiness?.degraded_count ?? 0, readiness?.offline_count ?? 0] as const,
      },
      {
        id: "readiness",
        label: "Readiness avg",
        value: "91 %",
        sub: `across ${totalEnvs} environments`,
        delta: "+0.3",
        deltaDir: "up",
        parts: [91, 9, 0] as const,
      },
      {
        id: "drift",
        label: "Drift lines",
        value: rows.reduce((s, r) => s + r.drift, 0).toLocaleString("en-US"),
        sub: "67 baselines",
        delta: "+18",
        deltaDir: "down",
        parts: [0, 100, 0] as const,
      },
      {
        id: "events",
        label: "Open events",
        value: rows.reduce((s, r) => s + r.events, 0).toLocaleString("en-US"),
        sub: "37 warn · 15 err",
        delta: "+4",
        deltaDir: "down",
        parts: [0, 37, 15] as const,
      },
    ];
  }, [readiness, rows]);

  const secondaryGroups = useMemo<readonly SecondaryNavGroup[]>(() => {
    const out: Record<RowSeed["group"], SecondaryNavGroup> = {
      production: { id: "production", heading: "PRODUCTION", items: [] },
      "non-prod": { id: "non-prod", heading: "NON-PROD", items: [] },
      special: { id: "special", heading: "SPECIAL", items: [] },
    };
    for (const row of rows) {
      const seed = ROW_SEEDS.find((s) => s.id === row.id);
      if (!seed) continue;
      (out[seed.group].items as Array<{
        id: string;
        label: string;
        sub: string;
        status: StatusSignal;
      }>).push({
        id: row.id,
        label: row.id,
        sub: `${row.devices.toLocaleString("en-US")} devices · ${row.sites} sites`,
        status: row.status,
      });
    }
    return [out.production, out["non-prod"], out.special];
  }, [rows]);

  const activeRow = rows.find((r) => r.id === selectedRowId) ?? rows[0];

  const detailKpis = useMemo<readonly KpiMiniSpec[]>(() => {
    const r = activeRow;
    if (!r) return [];
    const reach = Math.max(0, r.devices - Math.round(r.devices * 0.018));
    return [
      { id: "reach", label: "Reachable", value: reach.toLocaleString("en-US"), sub: `/ ${r.devices.toLocaleString("en-US")}`, delta: "-3", deltaDir: "down" },
      { id: "readiness", label: "Readiness", value: `${r.readiness} %`, sub: "LEAF-BASE-EU", delta: "+0.4", deltaDir: "up" },
      { id: "drift", label: "Drift", value: r.drift.toLocaleString("en-US"), sub: "7 baselines", delta: "+4", deltaDir: "down" },
      { id: "events", label: "Open events", value: r.events.toLocaleString("en-US"), sub: `${Math.max(0, r.events - 1)} warn · 1 err`, delta: "+1", deltaDir: "down" },
      { id: "bgp", label: "BGP estab", value: "1,406", sub: "/ 1,408 sessions", delta: "-2", deltaDir: "down" },
      { id: "bw", label: "Bandwidth p95", value: "412 Gbps", sub: "EU backbone", delta: "+1.2%", deltaDir: "up" },
    ];
  }, [activeRow]);

  const detailDomains: readonly ReadinessDomain[] = [
    { id: "l2", label: "L2 fabric", pct: 99, fraction: "417 / 418", status: "ok" },
    { id: "l3", label: "L3 underlay", pct: 97, fraction: "802 / 827", status: "ok" },
    { id: "ebgp", label: "eBGP edge", pct: 91, fraction: "54 / 59", status: "warn" },
    { id: "oob", label: "Out-of-band mgmt", pct: 100, fraction: "2184 / 2184", status: "ok" },
    { id: "ntp", label: "NTP discipline", pct: 88, fraction: "1922 / 2184", status: "warn" },
    { id: "tacacs", label: "TACACS reachability", pct: 76, fraction: "1660 / 2184", status: "warn" },
    { id: "syslog", label: "Syslog ingest", pct: 100, fraction: "2184 / 2184", status: "ok" },
  ];

  const detailEvents: readonly EventRow[] = [
    { id: "1", t: "17:42:08", sev: "err",  src: "fra-leaf-04.apex", cat: "link",   msg: "Eth1/14 transitioned down · LACP partner unreachable" },
    { id: "2", t: "17:41:55", sev: "warn", src: "lon-leaf-11.apex", cat: "optic",  msg: "Pre-FEC BER on Eth49/1 rising · 1.2e-6 over 5m" },
    { id: "3", t: "17:38:11", sev: "warn", src: "lon-leaf-12.apex", cat: "config", msg: "Drift detected · 4 lines diverge from baseline LEAF-BASE-EU" },
    { id: "4", t: "17:36:02", sev: "err",  src: "ams-edge-03.apex", cat: "bgp",    msg: "eBGP peer 185.34.12.4 went idle · hold timer expired" },
    { id: "5", t: "17:31:48", sev: "info", src: "lon-core-01.apex", cat: "engine", msg: "Polling cycle 04124 complete · 2,184/2,184 reachable" },
    { id: "6", t: "17:29:30", sev: "warn", src: "par-leaf-01.apex", cat: "temp",   msg: "Inlet temperature 42°C · threshold 40°C" },
  ];

  const detailSites: readonly SiteRow[] = [
    { id: "lon", status: "ok",   site: "LON-CORE", region: "EMEA-North",   role: "core+spine", devices: 248, reach: 248, readiness: 99, events: 1, maint: "sat 02:00 BST" },
    { id: "fra", status: "ok",   site: "FRA-CORE", region: "EMEA-Central", role: "core",       devices: 180, reach: 180, readiness: 98, events: 0, maint: "sun 03:00 CET" },
    { id: "ams", status: "ok",   site: "AMS-EDGE", region: "EMEA-North",   role: "edge",       devices: 96,  reach: 95,  readiness: 94, events: 1, maint: "fri 23:00 CET" },
    { id: "par", status: "warn", site: "PAR-EDGE", region: "EMEA-West",    role: "edge",       devices: 64,  reach: 62,  readiness: 86, events: 2, maint: "thu 22:00 CET" },
    { id: "dub", status: "ok",   site: "DUB-EDGE", region: "EMEA-West",    role: "edge",       devices: 48,  reach: 48,  readiness: 97, events: 0, maint: "sat 01:00 IST" },
    { id: "muc", status: "warn", site: "MUC-DC1",  region: "EMEA-South",   role: "dc",         devices: 140, reach: 138, readiness: 82, events: 1, maint: "wed 02:30 CET" },
    { id: "mad", status: "ok",   site: "MAD-EDGE", region: "EMEA-West",    role: "edge",       devices: 38,  reach: 38,  readiness: 99, events: 0, maint: "—" },
    { id: "mil", status: "idle", site: "MIL-EDGE", region: "EMEA-South",   role: "edge",       devices: 32,  reach: 32,  readiness: 91, events: 0, maint: "next week" },
  ];

  const inspectorSubject: InspectorSubject | undefined = activeRow
    ? {
        status: activeRow.status,
        title: activeRow.id,
        subtitle: `${activeRow.scope} · ${activeRow.region}`,
      }
    : undefined;

  const inspectorIdentity: readonly InspectorIdentityRow[] = activeRow && active
    ? [
        { k: "Environment", v: active.id },
        { k: "Kind", v: active.kind },
        { k: "Status", v: active.status },
        { k: "Devices", v: active.device_count.toLocaleString("en-US") },
        { k: "Sites", v: activeRow.sites.toLocaleString("en-US") },
        { k: "Region", v: activeRow.region },
        { k: "Owner", v: activeRow.owner },
        { k: "Updated", v: active.updated_at },
        { k: "Last poll", v: activeRow.last },
      ]
    : [];

  const inspectorHealth: readonly InspectorHealthCell[] = activeRow
    ? [
        { label: "CPU avg", value: "14 %", pct: 14 },
        { label: "Memory", value: "38 %", pct: 38 },
        { label: "Inlet", value: "37 °C", pct: 37 },
        { label: "Power", value: "dual" },
      ]
    : [];

  const inspectorInterfaces: readonly InspectorInterfaceRow[] = [
    { status: "ok",   name: "Eth1/1",  peer: "→ lon-spine-01 Eth7/1", bw: "94.2 G" },
    { status: "ok",   name: "Eth1/2",  peer: "→ lon-spine-02 Eth7/1", bw: "91.4 G" },
    { status: "ok",   name: "Eth1/3",  peer: "→ lon-spine-03 Eth7/1", bw: "88.2 G" },
    { status: "ok",   name: "Eth49/1", peer: "→ ams-edge-03 Eth5/3",  bw: "38.1 G" },
    { status: "ok",   name: "Eth50/1", peer: "→ fra-core-01 Eth7/3",  bw: "52.3 G" },
    { status: "warn", name: "Eth5/14", peer: "→ lon-leaf-11 Eth52",   bw: "4.1 G" },
  ];

  const inListView = view === "list";

  const crumbs = inListView
    ? ["Hierarchy", "Environments"]
    : ["Hierarchy", activeRow?.id ?? selectedRowId, detailSegmentLabel(detailSegment)];

  const subNav = inListView ? (
    <SubNav items={LIST_SUBNAV} activeId={listSegment} onChange={setListSegment} />
  ) : (
    <SubNav items={DETAIL_SUBNAV} activeId={detailSegment} onChange={setDetailSegment} />
  );

  const secondary = (
    <SecondaryNav
      title="HIERARCHY"
      subtitle={`Environments · ${rows.length}`}
      groups={secondaryGroups}
      selectedId={selectedRowId}
      onSelect={(id) => void selectEnv(id, true)}
    />
  );

  const inspector = inListView ? (
    <Inspector />
  ) : (
    <Inspector
      subject={inspectorSubject}
      tabs={INSPECTOR_TABS}
      activeTabId={inspectorTab}
      onTabChange={setInspectorTab}
      identity={inspectorIdentity}
      health={inspectorHealth}
      interfaces={inspectorInterfaces}
      baselines={[
        { tone: "ok",   label: "in compliance", note: "LEAF-BASE-EU · v3 · 1,420 lines" },
        { tone: "warn", label: "3 lines drift", note: "CORE-AAA-V3" },
      ]}
    />
  );

  return (
    <AppShell
      env={titleBarEnv}
      crumbs={crumbs}
      activeMode={activeMode}
      onModeChange={setActiveMode}
      onCrumbClick={(i) => {
        // "Hierarchy" or "Environments" → return to list.
        if (i <= 1) setView("list");
      }}
      subnav={subNav}
      secondary={secondary}
      inspector={inspector}
      statusLeft={statusLeft(readiness, rows)}
      statusRight={statusRight(view, activeRow)}
    >
      {inListView ? (
        <EnvironmentCentreD1
          kpis={listKpis}
          rows={rows}
          selectedRowId={selectedRowId}
          onSelectRow={(id) => void selectEnv(id, true)}
        />
      ) : (
        <EnvironmentDetailD2
          kpis={detailKpis}
          domains={detailDomains}
          events={detailEvents}
          sites={detailSites}
          siteCount={activeRow?.sites ?? detailSites.length}
        />
      )}
    </AppShell>
  );
}

function detailSegmentLabel(id: string): string {
  const found = DETAIL_SUBNAV.find((s) => s.id === id);
  return found?.label ?? "Overview";
}

function statusLeft(
  readiness: EnvironmentReadiness | null,
  rows: readonly EnvRow[],
): readonly StatusCell[] {
  const totalDevices = readiness?.total_devices ?? rows.reduce((s, r) => s + r.devices, 0);
  const drift = rows.reduce((s, r) => s + r.drift, 0);
  const events = rows.reduce((s, r) => s + r.events, 0);
  return [
    { id: "engine", label: "engines online", signal: "ok" },
    { id: "inventory", label: `inventory: ${totalDevices.toLocaleString("en-US")}` },
    { id: "drift", label: `drift: ${drift}`, signal: drift > 0 ? "warn" : "ok" },
    { id: "events", label: `events: ${events}`, signal: events > 0 ? "err" : "ok" },
  ];
}

function statusRight(view: View, activeRow?: EnvRow): readonly StatusCell[] {
  if (view === "list") {
    return [
      { id: "note", label: "hierarchy · 8 of 8 · sorted by readiness ↓" },
      { id: "ver", label: "v0.1.0" },
      { id: "core", label: "rust-core · ok", signal: "ok" },
    ];
  }
  return [
    {
      id: "note",
      label: `scope: ${activeRow?.id ?? "—"} · 38s since last poll · readiness ${activeRow?.readiness ?? 0}%`,
    },
    { id: "ver", label: "v0.1.0" },
    { id: "core", label: "rust-core · ok", signal: "ok" },
  ];
}
