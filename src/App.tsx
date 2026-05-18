import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { AppShell } from "./components/shell/AppShell";
import {
  Inspector,
  type InspectorSubject,
  type InspectorTabSpec,
} from "./components/shell/Inspector";
import type { EnvDotState, TitleBarEnv } from "./components/shell/TitleBar";
import type { ModeId } from "./components/shell/ModeRail";
import { MODE_LABELS } from "./components/shell/ModeRail";
import { ModeNotConnected } from "./components/shell/ModeNotConnected";
import { MODE_STATUS } from "./data/modeStatus";
import { SubNav, type SubNavItem } from "./components/shell/SubNav";
import {
  SecondaryNav,
  type SecondaryNavGroup,
} from "./components/shell/SecondaryNav";
import type { StatusCell, StatusSignal } from "./components/shell/StatusBar";
import { IntakePanel } from "./modes/intake/IntakePanel";
import { AssessPanel } from "./modes/assess/AssessPanel";
import {
  EnvironmentCentreD1,
  type EnvRow,
} from "./components/d1/EnvironmentCentreD1";
import {
  EnvironmentDetailD2,
  type KpiMiniSpec,
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
import { getHierarchyView } from "./data/hierarchySource";
import { ROW_SEEDS } from "./data/hierarchySeeds";

type View = "list" | "detail";

const STATUS_TO_DOT: Record<EnvironmentStatus, EnvDotState> = {
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

const INSPECTOR_TABS: readonly InspectorTabSpec[] = [
  { id: "overview", label: "Overview" },
  { id: "interfaces", label: "Interfaces" },
  { id: "routing", label: "Routing" },
  { id: "config", label: "Config" },
  { id: "events", label: "Events" },
];

export default function App(): JSX.Element {
  const [layoutView, setLayoutView] = useState<View>("list");
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
        setLayoutView("detail");
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

  const view = useMemo(() => getHierarchyView({ envs, readiness }), [envs, readiness]);

  const secondaryGroups = useMemo<readonly SecondaryNavGroup[]>(() => {
    const out: Record<"production" | "non-prod" | "special", SecondaryNavGroup> = {
      production: { id: "production", heading: "PRODUCTION", items: [] },
      "non-prod": { id: "non-prod", heading: "NON-PROD", items: [] },
      special: { id: "special", heading: "SPECIAL", items: [] },
    };
    for (const row of view.rows) {
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
  }, [view.rows]);

  const activeRow = view.rows.find((r) => r.id === selectedRowId) ?? view.rows[0];

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

  const inspectorSubject: InspectorSubject | undefined = activeRow
    ? {
        status: activeRow.status,
        title: activeRow.id,
        subtitle: `${activeRow.scope} · ${activeRow.region}`,
      }
    : undefined;

  const inListView = layoutView === "list";

  if (MODE_STATUS[activeMode].state === "not_connected") {
    const status = MODE_STATUS[activeMode];
    const label = MODE_LABELS[activeMode];
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={[label]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={statusRight(layoutView, undefined)}
      >
        <ModeNotConnected
          modeId={activeMode}
          modeLabel={label}
          engineName={status.engineName}
          plannedStage={status.plannedStage}
        />
      </AppShell>
    );
  }

  if (activeMode === "intake") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={["Foundation", "Intake"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={[
          { id: "note", label: "intake · stateless · single config" },
          { id: "ver", label: "v0.1.0" },
          { id: "core", label: "rust-core · ok", signal: "ok" },
        ]}
      >
        <IntakePanel />
      </AppShell>
    );
  }

  if (activeMode === "assess") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={["Governance", "Assess"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={[
          { id: "note", label: "assess · stateless · viewer" },
          { id: "ver", label: "v0.1.0" },
          { id: "core", label: "rust-core · ok", signal: "ok" },
        ]}
      >
        <AssessPanel />
      </AppShell>
    );
  }

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
      subtitle={`Environments · ${view.rows.length}`}
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
      identity={view.inspectorIdentity}
      health={view.inspectorHealth}
      interfaces={view.inspectorInterfaces}
      baselines={[
        { tone: "ok",   label: "in compliance", note: "LEAF-BASE-EU · v3 · 1,420 lines" },
        { tone: "warn", label: "3 lines drift", note: "CORE-AAA-V3" },
      ]}
      source={view.sourceStateByBlock.inspectorHealth}
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
        if (i <= 1) setLayoutView("list");
      }}
      subnav={subNav}
      secondary={secondary}
      inspector={inspector}
      statusLeft={statusLeft(readiness, view.rows)}
      statusRight={statusRight(layoutView, activeRow)}
    >
      {inListView ? (
        <EnvironmentCentreD1
          kpis={view.listKpis}
          rows={view.rows}
          selectedRowId={selectedRowId}
          onSelectRow={(id) => void selectEnv(id, true)}
          source={view.sourceStateByBlock.rows}
        />
      ) : (
        <EnvironmentDetailD2
          kpis={detailKpis}
          domains={view.detailDomains}
          events={view.detailEvents}
          sites={view.detailSites}
          siteCount={activeRow?.sites ?? view.detailSites.length}
          source={view.sourceStateByBlock.detailEvents}
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
    { id: "engine", label: "engines · unavail.", signal: "idle" },
    { id: "inventory", label: `inventory: ${totalDevices.toLocaleString("en-US")} · demo` },
    { id: "drift", label: `drift: ${drift} · demo`, signal: drift > 0 ? "warn" : "ok" },
    { id: "events", label: `events: ${events} · demo`, signal: events > 0 ? "err" : "ok" },
  ];
}

function statusRight(view: View, activeRow?: EnvRow): readonly StatusCell[] {
  if (view === "list") {
    return [
      { id: "note", label: "hierarchy · 8 of 8 · sorted by readiness ↓ · demo" },
      { id: "ver", label: "v0.1.0" },
      { id: "core", label: "rust-core · unavail.", signal: "idle" },
    ];
  }
  return [
    {
      id: "note",
      label: `scope: ${activeRow?.id ?? "—"} · 38s since last poll · readiness ${activeRow?.readiness ?? 0}% · demo`,
    },
    { id: "ver", label: "v0.1.0" },
    { id: "core", label: "rust-core · unavail.", signal: "idle" },
  ];
}
