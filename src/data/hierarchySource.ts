import type { EnvRow, KpiSpec } from "../components/d1/EnvironmentCentreD1";
import type { ReadinessDomain, EventRow, SiteRow } from "../components/d2/EnvironmentDetailD2";
import type { InspectorIdentityRow, InspectorHealthCell, InspectorInterfaceRow } from "../components/shell/Inspector";
import type { StatusSignal } from "../components/shell/StatusBar";
import type { DataSourceState } from "../types/dataSource";
import type { Environment, EnvironmentReadiness, EnvironmentStatus } from "../types/environment";
import { ROW_SEEDS, ROW_STATUS_FALLBACK, DEVICE_FALLBACK, DETAIL_DOMAINS_SEED, DETAIL_EVENTS_SEED, DETAIL_SITES_SEED, INSPECTOR_HEALTH_SEED, INSPECTOR_INTERFACES_SEED } from "./hierarchySeeds";

const SIG: Record<EnvironmentStatus, StatusSignal> = { healthy: "ok", degraded: "warn", offline: "err", unknown: "idle" };

export interface HierarchyView {
  readonly rows: readonly EnvRow[];
  readonly listKpis: readonly KpiSpec[];
  readonly detailDomains: readonly ReadinessDomain[];
  readonly detailEvents: readonly EventRow[];
  readonly detailSites: readonly SiteRow[];
  readonly inspectorIdentity: readonly InspectorIdentityRow[];
  readonly inspectorHealth: readonly InspectorHealthCell[];
  readonly inspectorInterfaces: readonly InspectorInterfaceRow[];
  readonly sourceState: DataSourceState;
  readonly sourceStateByBlock: {
    readonly rows: DataSourceState;
    readonly listKpis: DataSourceState;
    readonly detailDomains: DataSourceState;
    readonly detailEvents: DataSourceState;
    readonly detailSites: DataSourceState;
    readonly inspectorIdentity: DataSourceState;
    readonly inspectorHealth: DataSourceState;
    readonly inspectorInterfaces: DataSourceState;
  };
}

export function getHierarchyView(input: {
  envs: readonly Environment[];
  readiness: EnvironmentReadiness | null;
}): HierarchyView {
  const { envs, readiness: r } = input;
  const byId = new Map(envs.map((e) => [e.id, e] as const));

  const rows: readonly EnvRow[] = ROW_SEEDS.map((s) => {
    const live = byId.get(s.id);
    return {
      id: s.id,
      status: live ? SIG[live.status] : ROW_STATUS_FALLBACK[s.id] ?? "idle",
      region: s.region, scope: s.scope,
      devices: live?.device_count ?? DEVICE_FALLBACK[s.id] ?? 0,
      sites: s.sites, readiness: s.readiness,
      l2: s.l2, l3: s.l3, ebgp: s.ebgp,
      drift: s.drift, events: s.events,
      owner: s.owner, last: s.last,
    };
  });

  const totalEnvs = r?.total_environments ?? ROW_SEEDS.length;
  const totalDevices = r?.total_devices ?? rows.reduce((acc, row) => acc + row.devices, 0);
  const listKpis: readonly KpiSpec[] = [
    { id: "reachable", label: "Reachable", value: totalDevices.toLocaleString("en-US"), sub: `${totalEnvs} environments`, delta: "+0", deltaDir: "flat", parts: [r?.healthy_count ?? 0, r?.degraded_count ?? 0, r?.offline_count ?? 0] as const },
    { id: "readiness", label: "Readiness avg", value: "91 %", sub: `across ${totalEnvs} environments`, delta: "+0.3", deltaDir: "up", parts: [91, 9, 0] as const },
    { id: "drift", label: "Drift lines", value: rows.reduce((acc, row) => acc + row.drift, 0).toLocaleString("en-US"), sub: "67 baselines", delta: "+18", deltaDir: "down", parts: [0, 100, 0] as const },
    { id: "events", label: "Open events", value: rows.reduce((acc, row) => acc + row.events, 0).toLocaleString("en-US"), sub: "37 warn · 15 err", delta: "+4", deltaDir: "down", parts: [0, 37, 15] as const },
  ];

  // readiness.active_environment_id drives live identity rows without a separate `active` param
  const activeEnv = r?.active_environment_id ? (envs.find((e) => e.id === r.active_environment_id) ?? null) : null;
  const inspectorIdentityIsReal = activeEnv !== null && r?.active_environment_id != null;
  const activeSeed = activeEnv ? (ROW_SEEDS.find((s) => s.id === activeEnv.id) ?? ROW_SEEDS[0]) : ROW_SEEDS[0];
  const inspectorIdentity: readonly InspectorIdentityRow[] = activeEnv
    ? [
        { k: "Environment", v: activeEnv.id }, { k: "Kind", v: activeEnv.kind },
        { k: "Status", v: activeEnv.status }, { k: "Devices", v: activeEnv.device_count.toLocaleString("en-US") },
        { k: "Sites", v: activeSeed.sites.toLocaleString("en-US") }, { k: "Region", v: activeSeed.region },
        { k: "Owner", v: activeSeed.owner }, { k: "Updated", v: activeEnv.updated_at },
        { k: "Last poll", v: activeSeed.last },
      ]
    : [];

  // Per H1: seeded contributor → aggregate is "demo"
  const bs: DataSourceState = "demo";
  return {
    rows, listKpis,
    detailDomains: DETAIL_DOMAINS_SEED, detailEvents: DETAIL_EVENTS_SEED, detailSites: DETAIL_SITES_SEED,
    inspectorIdentity, inspectorHealth: INSPECTOR_HEALTH_SEED, inspectorInterfaces: INSPECTOR_INTERFACES_SEED,
    sourceState: bs,
    sourceStateByBlock: { rows: bs, listKpis: bs, detailDomains: bs, detailEvents: bs, detailSites: bs, inspectorIdentity: inspectorIdentityIsReal ? "real" : "demo", inspectorHealth: bs, inspectorInterfaces: bs },
  };
}
