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
import { IntakeMode } from "./modes/intake/IntakeMode";
import { AssessPanel } from "./modes/assess/AssessPanel";
import type { AssessProfileCounts } from "./modes/assess/assessPipelinePlanner";
import { SettingsMode } from "./modes/settings/SettingsMode";
import { OpsConsoleMode } from "./modes/opsConsole/OpsConsoleMode";
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
import { getDiscoveryInventory } from "./api/discovery";
import { getTopologyView } from "./api/topology";
import type {
  Environment,
  EnvironmentReadiness,
  EnvironmentStatus,
} from "./types/environment";
import {
  toDiscoverySourceView,
  type DiscoverySourceView,
} from "./data/discoverySource";
import {
  toTopologySourceView,
  type TopologySourceView,
} from "./data/topologySource";
import { TopologyMode } from "./modes/topology/TopologyMode";
import { DiagnoseMode } from "./modes/diagnose/DiagnoseMode";
import { DiscoveryMode } from "./modes/discovery/DiscoveryMode";
import { BuildMode } from "./modes/build/BuildMode";
import { OperateMode } from "./modes/operate/OperateMode";
import type { OperateOverviewInputs } from "./modes/operate/operateOverview";
import {
  buildWorkbenchContextSummary,
  EMPTY_WORKBENCH_INTAKE_SUMMARY,
  type WorkbenchIntakeSummary,
} from "./state/workbenchContextSummary";
import { planLiveTopologyCollection } from "./api/liveCollection";
import { HierarchyMode } from "./modes/hierarchy/HierarchyMode";
import { getHierarchyView } from "./data/hierarchySource";
import { ROW_SEEDS } from "./data/hierarchySeeds";
import { emptyHistory, type DiscoveryRunHistory } from "./modes/discovery/discoveryRunHistory";
import { buildDiscoveryPlanningSummary } from "./modes/discovery/discoveryPlanningSummary";
import type { SeedEntry } from "./modes/discovery/seedPlanner";
import {
  EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY,
  type CrawlPreviewContextSummary,
} from "./modes/discovery/crawlPreviewContextSummary";
import {
  EMPTY_EVIDENCE_IMPORT_SUMMARY,
  applyEvidenceImportEvent,
  type EvidenceImportEvent,
  type EvidenceImportSummary,
} from "./modes/topology/evidenceImportSummary";

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

const DETAIL_SUBNAV_BASE: readonly SubNavItem[] = [
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
  const [discovery, setDiscovery] = useState<DiscoverySourceView>(() =>
    toDiscoverySourceView(null),
  );
  const [topology, setTopology] = useState<TopologySourceView>(() =>
    toTopologySourceView(null),
  );

  // V1BN — hoisted Discovery planning state (seeds + history).
  // Passed to DiscoveryMode as controlled props and wired to OperateMode via inputs.
  const [discoverySeeds, setDiscoverySeeds] = useState<ReadonlyArray<SeedEntry>>([]);
  const [discoveryHistory, setDiscoveryHistory] = useState<DiscoveryRunHistory>(
    emptyHistory(),
  );

  // V1BO — hoisted Intake summary state. Updated by IntakePanel's
  // onIntakeStateChange callback and used to build shared WorkbenchContextSummary.
  const [intakeSummary, setIntakeSummary] = useState<WorkbenchIntakeSummary>(
    EMPTY_WORKBENCH_INTAKE_SUMMARY,
  );

  // V1BQ — hoisted Crawl Preview context summary. Updated by CrawlPreviewPanel's
  // onSummaryChange callback. Sanitized (counts + ids only). Feeds Operate's
  // crawl_frontier_count via WorkbenchContextSummary.
  const [crawlPreviewSummary, setCrawlPreviewSummary] = useState<CrawlPreviewContextSummary>(
    EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY,
  );

  // V1BR/V1BS — hoisted Evidence Import summary. Sanitized (counts + small
  // labels only). V1BS activates the spine: DiscoveryMode SSH-handoff imports
  // and TopologyMode EvidenceImportPanel emit sanitized events via
  // onEvidenceImportEvent; the handler folds them through applyEvidenceImportEvent.
  const [evidenceImportSummary, setEvidenceImportSummary] = useState<EvidenceImportSummary>(
    EMPTY_EVIDENCE_IMPORT_SUMMARY,
  );

  const handleEvidenceImportEvent = useCallback((event: EvidenceImportEvent) => {
    setEvidenceImportSummary((prior) => applyEvidenceImportEvent(prior, event));
  }, []);

  const fetchDiscovery = useCallback(async (envId: string | null) => {
    try {
      const view = await getDiscoveryInventory(envId);
      setDiscovery(toDiscoverySourceView(view));
    } catch (err) {
      setDiscovery(toDiscoverySourceView(null, err));
    }
  }, []);

  const fetchTopology = useCallback(async (envId: string | null) => {
    try {
      const view = await getTopologyView(envId);
      setTopology(toTopologySourceView(view));
    } catch (err) {
      setTopology(toTopologySourceView(null, err));
    }
  }, []);

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
        await fetchDiscovery(r?.active_environment_id ?? null);
        await fetchTopology(r?.active_environment_id ?? null);
      } catch {
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDiscovery, fetchTopology]);

  const refreshEngineState = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([
        getActiveEnvironment(),
        getEnvironmentReadiness(),
      ]);
      setActive(a);
      setReadiness(r);
      await fetchDiscovery(r?.active_environment_id ?? null);
      await fetchTopology(r?.active_environment_id ?? null);
    } catch {
      /* ignored — keep last good state */
    }
  }, [fetchDiscovery, fetchTopology]);

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

  // V1AK — devices count derives from real Discovery inventory when source is
  // "real"; falls back to the existing seeded "2,184" otherwise. Honest count.
  // MUST stay above every early-return mode branch so hook order is stable
  // across mode switches (Rules of Hooks); previously below the branches,
  // which caused "Rendered fewer hooks than expected" on top-level mode
  // change and unmounted the React root (V1AW white-screen).
  const detailSubnav = useMemo<readonly SubNavItem[]>(
    () =>
      DETAIL_SUBNAV_BASE.map((item) =>
        item.id === "devices" && discovery.sourceState === "real"
          ? { ...item, count: discovery.totalRecords.toLocaleString("en-US") }
          : item,
      ),
    [discovery.sourceState, discovery.totalRecords],
  );

  // V1BN — derive Operate overview inputs from Discovery planning state.
  // Must live above all mode-branch early returns (Rules of Hooks).
  const discoveryPlanningSummary = useMemo(
    () => buildDiscoveryPlanningSummary(discoverySeeds, discoveryHistory),
    [discoverySeeds, discoveryHistory],
  );

  // V1BO — wire real topology counts via shared WorkbenchContextSummary.
  const workbenchContextSummary = useMemo(
    () => buildWorkbenchContextSummary({
      discoveryPlanning: discoveryPlanningSummary,
      topology,
      intake: intakeSummary,
      crawlPreview: crawlPreviewSummary,
      evidenceImport: evidenceImportSummary,
    }),
    [discoveryPlanningSummary, topology, intakeSummary, crawlPreviewSummary, evidenceImportSummary],
  );

  const operateOverviewInputs: OperateOverviewInputs = useMemo(() => ({
    staged_seed_count: workbenchContextSummary.discovery.seed_count,
    crawl_frontier_count: workbenchContextSummary.crawl_preview.frontier_count,
    evidence_import_count: workbenchContextSummary.evidence_import.accepted_evidence_total,
    topology_node_count: workbenchContextSummary.topology.node_count,
    topology_edge_count: workbenchContextSummary.topology.edge_count,
    intake_parsed_device_count: workbenchContextSummary.intake.parsed_device_count,
    intake_finding_count: workbenchContextSummary.intake.finding_count,
    intake_current_platform_id: workbenchContextSummary.intake.current_platform_id,
  }), [workbenchContextSummary]);

  // V1BP — derive Assess pipeline planner initial counts from Discovery planning state + Topology + Intake context.
  // Must live above all mode-branch early returns (Rules of Hooks).
  const assessInitialCounts: AssessProfileCounts = useMemo(() => ({
    seed_count: discoveryPlanningSummary.staged_seed_count,
    // expected_devices: derive from topology node_count when available;
    // honest fallback to total_seed_count when no topology yet.
    expected_devices: topology.nodeCount > 0
      ? topology.nodeCount
      : discoveryPlanningSummary.total_seed_count,
    // known_platforms: prefill from intake.current_platform_id when available;
    // otherwise 0. Operator can override post-mount.
    known_platforms: workbenchContextSummary.intake.current_platform_id !== null ? 1 : 0,
  }), [discoveryPlanningSummary, topology, workbenchContextSummary]);

  if (activeMode === "opsConsole") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={["Ops Console"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={statusRight(layoutView, undefined)}
      >
        <OpsConsoleMode discovery={discovery} />
      </AppShell>
    );
  }

  if (activeMode === "settings") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={[MODE_LABELS.settings ?? "Settings"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        inspector={<Inspector />}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={statusRight(layoutView, undefined)}
      >
        <SettingsMode />
      </AppShell>
    );
  }

  if (activeMode === "topology") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={["Topology"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={statusRight(layoutView, undefined)}
      >
        <TopologyMode
          topology={topology}
          onPlanLiveCollection={planLiveTopologyCollection}
          onEvidenceImportEvent={handleEvidenceImportEvent}
        />
      </AppShell>
    );
  }

  if (activeMode === "diagnose") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={["Diagnose"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={statusRight(layoutView, undefined)}
      >
        <DiagnoseMode discovery={discovery} topology={topology} />
      </AppShell>
    );
  }

  if (activeMode === "discovery") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={["Foundation", "Discovery"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={statusRight(layoutView, undefined)}
      >
        <DiscoveryMode
          seeds={discoverySeeds}
          onSeedsChange={setDiscoverySeeds}
          onCrawlPreviewSummaryChange={setCrawlPreviewSummary}
          history={discoveryHistory}
          onHistoryChange={setDiscoveryHistory}
          onEvidenceImportEvent={handleEvidenceImportEvent}
        />
      </AppShell>
    );
  }

  if (activeMode === "build") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={["Build"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={[
          { id: "note", label: "build · stateless · skeleton" },
        ]}
      >
        <BuildMode />
      </AppShell>
    );
  }

  if (activeMode === "operate") {
    return (
      <AppShell
        env={titleBarEnv}
        crumbs={["Operate"]}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={[
          { id: "note", label: "operate · stateless · skeleton" },
        ]}
      >
        <OperateMode operateOverviewInputs={operateOverviewInputs} />
      </AppShell>
    );
  }

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
        ]}
      >
        <IntakeMode
          activeEnvironmentId={active?.id ?? null}
          onDiscoveryImported={() => fetchDiscovery(active?.id ?? null)}
          onIntakeStateChange={setIntakeSummary}
        />
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
        ]}
      >
        <AssessPanel initialCounts={assessInitialCounts} />
      </AppShell>
    );
  }

  const crumbs = inListView
    ? ["Hierarchy", "Environments"]
    : ["Hierarchy", activeRow?.id ?? selectedRowId, detailSegmentLabel(detailSegment)];

  const subNav = inListView ? (
    <SubNav items={LIST_SUBNAV} activeId={listSegment} onChange={setListSegment} />
  ) : (
    <SubNav items={detailSubnav} activeId={detailSegment} onChange={setDetailSegment} />
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
      ) : detailSegment === "devices" ? (
        <HierarchyMode discovery={discovery} intakeSummary={intakeSummary} />
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
  const found = DETAIL_SUBNAV_BASE.find((s) => s.id === id);
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
    ];
  }
  return [
    {
      id: "note",
      label: `scope: ${activeRow?.id ?? "—"} · 38s since last poll · readiness ${activeRow?.readiness ?? 0}% · demo`,
    },
  ];
}
