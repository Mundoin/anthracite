import { useCallback, useEffect, useMemo, useRef, useState, useReducer, type JSX } from "react";
import { AppShell } from "./components/shell/AppShell";
import {
  Inspector,
  type InspectorSubject,
  type InspectorTabSpec,
} from "./components/shell/Inspector";
import type { EnvDotState, TitleBarEnv } from "./components/shell/TitleBar";
import type { ModeId } from "./components/shell/ModeRail";
import { MODE_LABELS } from "./components/shell/ModeRail";
import { ContextSidebar } from "./components/navigation/ContextSidebar";
import {
  createInitialNavigationState,
  navigationReducer,
} from "./components/navigation/navigationState";
import { MODE_CATALOGUE, propagateBadges } from "./contracts/modeCatalogue";
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
import {
  clearTopologyNeighborEvidence,
  getTopologyEvidenceSummary,
  importTopologyNeighborEvidence,
  importTopologyNeighborOutput,
} from "./api/topology";
import type {
  TopologyEvidenceMutationResult,
  TopologyEvidenceSummary,
} from "./types/topology";
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
import {
  buildAssessmentReadiness,
  type AssessmentReadiness,
} from "./state/assessmentReadiness";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  appendOperatorActivityEvent,
  buildOperatorActivitySummaryLabel,
  makeOperatorActivityEventId,
  type OperatorActivityEvent,
  type OperatorActivityEventKind,
  type OperatorActivityLedger,
  type OperatorActivityStatus,
  type OperatorActivityWorkbench,
  type OperatorActivityCounts,
} from "./state/operatorActivityLedger";
import {
  buildDiagnoseTriage,
  type DiagnoseTriage,
} from "./modes/diagnose/diagnoseTriage";
import {
  buildCortexCommandRegistry,
  type CortexCommandRegistry,
} from "./state/cortexCommandRegistry";
import {
  buildWorkbenchActionRouter,
  type WorkbenchActionRouter,
} from "./state/workbenchActionRouter";
import {
  buildAssessmentPreflightSnapshot,
  type AssessmentPreflightSnapshot,
} from "./modes/assess/assessmentPreflightSnapshot";
import {
  buildAssessmentReportDraft,
  type AssessmentReportDraft,
} from "./modes/assess/assessmentReportDraft";
import {
  buildBuildIntentWorkspace,
  type BuildIntentWorkspace,
} from "./modes/build/buildIntentWorkspace";
import {
  buildTopologyConstruct,
  type TopologyConstruct,
} from "./modes/topology/topologyConstructModel";
import {
  buildEnvironmentProfile,
  type EnvironmentProfile,
} from "./state/environmentProfile";
import {
  buildModeCapabilityMatrix,
  type ModeCapabilityMatrix,
} from "./state/modeCapabilityMatrix";
import {
  buildOperatorSessionExport,
  type OperatorSessionExport,
} from "./state/operatorSessionExport";
import {
  buildDesignHandoffContract,
  type DesignHandoffContract,
} from "./state/designHandoffContract";

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

  // D3A — Navigation state (ContextSidebar tree + child activation).
  const [navState, navDispatch] = useReducer(
    navigationReducer,
    createInitialNavigationState("hierarchy"),
  );

  // D3A — Cached catalogue with badge propagation.
  const catalogue = useMemo(() => propagateBadges(MODE_CATALOGUE), []);

  // D3A — Sync navState.activeMode when activeMode changes.
  // Rules of Hooks: Must stay above all mode-branch early returns.
  useEffect(() => {
    if (navState.activeMode !== activeMode) {
      navDispatch({ type: "set-mode", modeId: activeMode });
    }
  }, [activeMode, navState.activeMode]);

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

  // V1BV — Operator Activity Ledger. Append-only, in-memory. Captures
  // sanitized cross-workbench events (counts/labels/reason-codes only —
  // no raw payloads, configs, evidence, credentials, secrets, or
  // evidence_set_id). Sequence ref drives deterministic ids and avoids
  // re-render churn.
  const [operatorActivityLedger, setOperatorActivityLedger] =
    useState<OperatorActivityLedger>(EMPTY_OPERATOR_ACTIVITY_LEDGER);
  const operatorActivitySequenceRef = useRef<number>(0);

  const recordOperatorActivity = useCallback(
    (params: {
      workbench: OperatorActivityWorkbench;
      kind: OperatorActivityEventKind;
      status: OperatorActivityStatus;
      counts?: OperatorActivityCounts;
      source_label?: string | null;
      reason_code?: string | null;
      timestamp?: string;
    }) => {
      operatorActivitySequenceRef.current += 1;
      const counts = params.counts ?? {};
      const event: OperatorActivityEvent = {
        id: makeOperatorActivityEventId(params.kind, operatorActivitySequenceRef.current),
        timestamp: params.timestamp ?? new Date().toISOString(),
        workbench: params.workbench,
        kind: params.kind,
        status: params.status,
        source_label: params.source_label ?? null,
        summary_label: buildOperatorActivitySummaryLabel(
          params.kind,
          params.status,
          counts,
        ),
        counts,
        reason_code: params.reason_code ?? null,
      };
      setOperatorActivityLedger((prior) => appendOperatorActivityEvent(prior, event));
    },
    [],
  );

  const handleEvidenceImportEvent = useCallback(
    (event: EvidenceImportEvent) => {
      setEvidenceImportSummary((prior) => applyEvidenceImportEvent(prior, event));

      // V1BV — fold sanitized evidence event into the operator activity ledger.
      // Map EvidenceImportEvent.status → ledger kind/status, preserving counts.
      const isClear = event.kind === "clear";
      const kind: OperatorActivityEventKind = isClear
        ? "evidence_cleared"
        : event.status === "accepted"
          ? "evidence_import_accepted"
          : event.status === "no_mutation"
            ? "evidence_import_no_mutation"
            : "evidence_import_rejected";
      const status: OperatorActivityStatus = isClear
        ? "info"
        : event.status === "accepted"
          ? "accepted"
          : event.status === "no_mutation"
            ? "no_mutation"
            : "rejected";
      recordOperatorActivity({
        workbench: "topology",
        kind,
        status,
        counts: isClear
          ? {}
          : {
              accepted_evidence_count: event.accepted_count,
              rejected_evidence_count: event.rejected_count,
            },
        source_label: event.source_label,
        reason_code: event.reason_code,
        timestamp: event.timestamp,
      });
    },
    [recordOperatorActivity],
  );

  // V1BT — Topology evidence import / clear / summary wiring.
  //
  // App owns evidenceSummary + lastMutation state so the EvidenceImportPanel
  // can render the most recent mutation and refresh the summary after every
  // import. V1BS event emission still fires through onEvidenceImportEvent
  // (already wired above).
  const [topologyEvidenceSummary, setTopologyEvidenceSummary] = useState<
    TopologyEvidenceSummary | null
  >(null);
  const [topologyLastMutation, setTopologyLastMutation] = useState<
    TopologyEvidenceMutationResult | null
  >(null);

  const handleTopologyImportEvidence = useCallback(
    async (
      envId: string,
      evidence: Parameters<typeof importTopologyNeighborEvidence>[1],
      mode: Parameters<typeof importTopologyNeighborEvidence>[3],
    ): Promise<TopologyEvidenceMutationResult> => {
      const result = await importTopologyNeighborEvidence(envId, evidence, null, mode);
      setTopologyLastMutation(result);
      return result;
    },
    [],
  );

  const handleTopologyClearEvidence = useCallback(
    async (envId: string): Promise<TopologyEvidenceMutationResult> => {
      const result = await clearTopologyNeighborEvidence(envId);
      setTopologyLastMutation(result);
      return result;
    },
    [],
  );

  const handleTopologyFetchEvidenceSummary = useCallback(
    async (envId: string): Promise<TopologyEvidenceSummary> => {
      const summary = await getTopologyEvidenceSummary(envId);
      setTopologyEvidenceSummary(summary);
      return summary;
    },
    [],
  );

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

  // V1BU — Assessment readiness derived from the shared workbench context.
  // Pure projection; consumed by Assess (preflight surface) and Operate
  // (context row alongside existing next_action chain).
  const assessmentReadiness: AssessmentReadiness = useMemo(
    () => buildAssessmentReadiness(workbenchContextSummary),
    [workbenchContextSummary],
  );

  // V1BV — Derived-state → ledger bridges. Each uses a prior-value ref so an
  // event is appended only on a real transition (no re-emit on identical
  // re-renders, no emit on initial mount unless the value is non-empty).
  const priorStagedSeedCountRef = useRef<number>(
    discoveryPlanningSummary.staged_seed_count,
  );
  useEffect(() => {
    const next = discoveryPlanningSummary.staged_seed_count;
    const prior = priorStagedSeedCountRef.current;
    if (next !== prior && next > 0) {
      recordOperatorActivity({
        workbench: "discovery",
        kind: "seed_plan_generated",
        status: "info",
        counts: { seed_count: next },
      });
    }
    priorStagedSeedCountRef.current = next;
  }, [discoveryPlanningSummary.staged_seed_count, recordOperatorActivity]);

  const priorFrontierCountRef = useRef<number>(crawlPreviewSummary.frontier_count);
  useEffect(() => {
    const next = crawlPreviewSummary.frontier_count;
    const prior = priorFrontierCountRef.current;
    if (next !== prior && next > 0) {
      recordOperatorActivity({
        workbench: "discovery",
        kind: "crawl_preview_generated",
        status: "info",
        counts: { frontier_count: next },
      });
    }
    priorFrontierCountRef.current = next;
  }, [crawlPreviewSummary.frontier_count, recordOperatorActivity]);

  const priorIntakeParseStatusRef = useRef<typeof intakeSummary.parse_status>(
    intakeSummary.parse_status,
  );
  useEffect(() => {
    const next = intakeSummary.parse_status;
    const prior = priorIntakeParseStatusRef.current;
    if (next !== prior && next === "parsed") {
      recordOperatorActivity({
        workbench: "intake",
        kind: "intake_parse_completed",
        status: "accepted",
        counts: {
          parsed_device_count: intakeSummary.parsed_device_count,
          finding_count: intakeSummary.finding_count,
        },
        source_label: intakeSummary.current_platform_id,
      });
    }
    priorIntakeParseStatusRef.current = next;
  }, [
    intakeSummary.parse_status,
    intakeSummary.parsed_device_count,
    intakeSummary.finding_count,
    intakeSummary.current_platform_id,
    recordOperatorActivity,
  ]);

  const priorAssessOverallRef = useRef<AssessmentReadiness["overall_state"]>(
    assessmentReadiness.overall_state,
  );
  useEffect(() => {
    const next = assessmentReadiness.overall_state;
    const prior = priorAssessOverallRef.current;
    if (next !== prior && next !== "empty") {
      const status: OperatorActivityStatus =
        next === "ready"
          ? "accepted"
          : next === "blocked"
            ? "blocked"
            : "info";
      recordOperatorActivity({
        workbench: "assess",
        kind: "assess_readiness_generated",
        status,
        reason_code: assessmentReadiness.blocker_reason_codes[0] ?? null,
      });
    }
    priorAssessOverallRef.current = next;
  }, [
    assessmentReadiness.overall_state,
    assessmentReadiness.blocker_reason_codes,
    recordOperatorActivity,
  ]);

  // V1BW — Diagnose Evidence Triage projection. Pure deterministic derivation
  // from WorkbenchContextSummary + AssessmentReadiness + OperatorActivityLedger.
  // Consumed by DiagnoseMode (triage tool).
  const diagnoseTriage: DiagnoseTriage = useMemo(
    () =>
      buildDiagnoseTriage({
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        ledger: operatorActivityLedger,
      }),
    [workbenchContextSummary, assessmentReadiness, operatorActivityLedger],
  );

  // V1BX — Cortex Command Registry. Pure deterministic catalog of operator
  // commands with per-command availability resolved from current context.
  // App-owned data spine; UI surfacing deferred per scope. V1BY action
  // router consumes this registry.
  const cortexCommandRegistry: CortexCommandRegistry = useMemo(
    () =>
      buildCortexCommandRegistry({
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        ledger: operatorActivityLedger,
        triage: diagnoseTriage,
      }),
    [
      workbenchContextSummary,
      assessmentReadiness,
      operatorActivityLedger,
      diagnoseTriage,
    ],
  );

  // V1BY — Cross-Workbench Action Router. Pure deterministic projection of
  // safe context + V1BX registry into prioritized operator next-actions.
  // App-owned data spine; UI surfacing deferred per scope. Every emitted
  // action.command_id is registry-resolved (integrity test guards refs).
  const workbenchActionRouter: WorkbenchActionRouter = useMemo(
    () =>
      buildWorkbenchActionRouter({
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        ledger: operatorActivityLedger,
        triage: diagnoseTriage,
        registry: cortexCommandRegistry,
      }),
    [
      workbenchContextSummary,
      assessmentReadiness,
      operatorActivityLedger,
      diagnoseTriage,
      cortexCommandRegistry,
    ],
  );

  // V1BZ — Assessment Preflight Snapshot. Pure deterministic artifact
  // describing what Anthracite can assess from current safe context.
  // App-owned data spine; UI surfacing deferred per scope. report_draft
  // pipeline step resolves to deferred until V1CA wires the draft builder.
  const assessmentPreflightSnapshot: AssessmentPreflightSnapshot = useMemo(
    () =>
      buildAssessmentPreflightSnapshot({
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        triage: diagnoseTriage,
        ledger: operatorActivityLedger,
        router: workbenchActionRouter,
        registry: cortexCommandRegistry,
        reportDraftAvailable: true,
      }),
    [
      workbenchContextSummary,
      assessmentReadiness,
      diagnoseTriage,
      operatorActivityLedger,
      workbenchActionRouter,
      cortexCommandRegistry,
    ],
  );

  // V1CA — Assessment Report Draft. Deterministic Markdown + structured
  // draft on top of the V1BZ preflight snapshot. App-owned data spine;
  // UI surfacing deferred per scope. Honesty limitations always present.
  const assessmentReportDraft: AssessmentReportDraft = useMemo(
    () =>
      buildAssessmentReportDraft({
        preflight: assessmentPreflightSnapshot,
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        triage: diagnoseTriage,
        ledger: operatorActivityLedger,
        router: workbenchActionRouter,
        registry: cortexCommandRegistry,
      }),
    [
      assessmentPreflightSnapshot,
      workbenchContextSummary,
      assessmentReadiness,
      diagnoseTriage,
      operatorActivityLedger,
      workbenchActionRouter,
      cortexCommandRegistry,
    ],
  );
  void assessmentReportDraft;

  // V1CB — BUILD Intent Workspace. Deterministic local intent drafts +
  // receipts derived from safe context. App-owned data spine; UI
  // surfacing deferred per scope. No deploy, no device push, no rollback.
  const buildIntentWorkspace: BuildIntentWorkspace = useMemo(
    () =>
      buildBuildIntentWorkspace({
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        router: workbenchActionRouter,
        registry: cortexCommandRegistry,
        preflight: assessmentPreflightSnapshot,
      }),
    [
      workbenchContextSummary,
      assessmentReadiness,
      workbenchActionRouter,
      cortexCommandRegistry,
      assessmentPreflightSnapshot,
    ],
  );
  void buildIntentWorkspace;

  // V1CC — Topology Construct Model. Visual-independent semantic
  // construct for future topology canvas / 3D / model work. Nodes/links
  // sourced strictly from the current topology view (no invention);
  // risk flags + layout hints derived from safe summary + triage.
  const topologyConstruct: TopologyConstruct = useMemo(
    () =>
      buildTopologyConstruct({
        topology,
        summary: workbenchContextSummary,
        triage: diagnoseTriage,
        readiness: assessmentReadiness,
      }),
    [topology, workbenchContextSummary, diagnoseTriage, assessmentReadiness],
  );

  // V1CD — Environment Profile. Deterministic projection of "where am I
  // operating?" identity from cross-workbench spines + construct + build
  // workspace + preflight. App-owned data spine; UI surfacing deferred.
  const environmentProfile: EnvironmentProfile = useMemo(
    () =>
      buildEnvironmentProfile({
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        ledger: operatorActivityLedger,
        triage: diagnoseTriage,
        router: workbenchActionRouter,
        construct: topologyConstruct,
        build: buildIntentWorkspace,
        preflight: assessmentPreflightSnapshot,
      }),
    [
      workbenchContextSummary,
      assessmentReadiness,
      operatorActivityLedger,
      diagnoseTriage,
      workbenchActionRouter,
      topologyConstruct,
      buildIntentWorkspace,
      assessmentPreflightSnapshot,
    ],
  );

  // V1CE — Mode Capability Matrix. Honest per-mode/per-tool capability
  // projection. App-owned data spine; UI surfacing deferred. Future surfaces
  // stay deferred — never `available`. Backing command_id refs resolve in
  // registry (integrity test guards this).
  const modeCapabilityMatrix: ModeCapabilityMatrix = useMemo(
    () =>
      buildModeCapabilityMatrix({
        profile: environmentProfile,
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        registry: cortexCommandRegistry,
        router: workbenchActionRouter,
        triage: diagnoseTriage,
        preflight: assessmentPreflightSnapshot,
        draft: assessmentReportDraft,
        build: buildIntentWorkspace,
        construct: topologyConstruct,
      }),
    [
      environmentProfile,
      workbenchContextSummary,
      assessmentReadiness,
      cortexCommandRegistry,
      workbenchActionRouter,
      diagnoseTriage,
      assessmentPreflightSnapshot,
      assessmentReportDraft,
      buildIntentWorkspace,
      topologyConstruct,
    ],
  );

  // V1CF — Operator Session Export. Deterministic JSON + Markdown package
  // of all App-owned spines. NO file writing, NO save dialog, NO persistence,
  // NO PDF. App-owned data spine; UI surface deferred.
  const operatorSessionExport: OperatorSessionExport = useMemo(
    () =>
      buildOperatorSessionExport({
        profile: environmentProfile,
        summary: workbenchContextSummary,
        readiness: assessmentReadiness,
        ledger: operatorActivityLedger,
        triage: diagnoseTriage,
        registry: cortexCommandRegistry,
        router: workbenchActionRouter,
        preflight: assessmentPreflightSnapshot,
        draft: assessmentReportDraft,
        build: buildIntentWorkspace,
        construct: topologyConstruct,
        matrix: modeCapabilityMatrix,
      }),
    [
      environmentProfile,
      workbenchContextSummary,
      assessmentReadiness,
      operatorActivityLedger,
      diagnoseTriage,
      cortexCommandRegistry,
      workbenchActionRouter,
      assessmentPreflightSnapshot,
      assessmentReportDraft,
      buildIntentWorkspace,
      topologyConstruct,
      modeCapabilityMatrix,
    ],
  );

  // V1CG — Skeleton Freeze / Design Handoff Contract. Frozen semantic
  // contract for the next design rail (UI/UX/icons/topology/3D). Contract
  // only — no visual implementation. After V1CG: STOP skeleton expansion.
  const designHandoffContract: DesignHandoffContract = useMemo(
    () =>
      buildDesignHandoffContract({
        matrix: modeCapabilityMatrix,
        registry: cortexCommandRegistry,
        router: workbenchActionRouter,
        profile: environmentProfile,
        preflight: assessmentPreflightSnapshot,
        draft: assessmentReportDraft,
        build: buildIntentWorkspace,
        construct: topologyConstruct,
        triage: diagnoseTriage,
        sessionExport: operatorSessionExport,
      }),
    [
      modeCapabilityMatrix,
      cortexCommandRegistry,
      workbenchActionRouter,
      environmentProfile,
      assessmentPreflightSnapshot,
      assessmentReportDraft,
      buildIntentWorkspace,
      topologyConstruct,
      diagnoseTriage,
      operatorSessionExport,
    ],
  );
  void designHandoffContract;

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

  // D3A — Build ContextSidebar node. Rendered for modes with children > 0,
  // except Hierarchy (which keeps its existing secondary nav).
  // Must live above all mode-branch early returns (Rules of Hooks).
  const activeModeEntry = useMemo(
    () => catalogue.modes.find((m) => m.id === activeMode),
    [catalogue, activeMode],
  );
  const contextSidebar = useMemo(() => {
    if (!activeModeEntry || activeModeEntry.children.length === 0) return undefined;
    if (activeMode === "hierarchy") return undefined; // Hierarchy uses secondary nav
    return (
      <ContextSidebar
        catalogue={catalogue}
        activeMode={activeMode}
        activeChildPath={navState.activeChildPath}
        openIds={navState.sidebarOpenIds}
        onActivateChild={(path) =>
          navDispatch({ type: "set-child", modeId: activeMode, childPath: path })
        }
        onToggleNode={(nodeId) => navDispatch({ type: "toggle-node", nodeId })}
      />
    );
  }, [activeModeEntry, activeMode, catalogue, navState]);

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
        contextSidebar={contextSidebar}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={statusRight(layoutView, undefined)}
      >
        <TopologyMode
          topology={topology}
          onPlanLiveCollection={planLiveTopologyCollection}
          onEvidenceImportEvent={handleEvidenceImportEvent}
          onImportEvidence={handleTopologyImportEvidence}
          onImportRawNeighborOutput={importTopologyNeighborOutput}
          onClearEvidence={handleTopologyClearEvidence}
          onFetchEvidenceSummary={handleTopologyFetchEvidenceSummary}
          evidenceSummary={topologyEvidenceSummary}
          lastMutation={topologyLastMutation}
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
        contextSidebar={contextSidebar}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={statusRight(layoutView, undefined)}
      >
        <DiagnoseMode discovery={discovery} topology={topology} triage={diagnoseTriage} />
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
        contextSidebar={contextSidebar}
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
        contextSidebar={contextSidebar}
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
        contextSidebar={contextSidebar}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={[
          { id: "note", label: "operate · stateless · skeleton" },
        ]}
      >
        <OperateMode
          operateOverviewInputs={operateOverviewInputs}
          assessmentReadiness={assessmentReadiness}
          dashboardCards={designHandoffContract.dashboard_cards}
          dashboardSpines={{
            profile: environmentProfile,
            readiness: assessmentReadiness,
            router: workbenchActionRouter,
            triage: diagnoseTriage,
            ledger: operatorActivityLedger,
            construct: topologyConstruct,
            preflight: assessmentPreflightSnapshot,
            draft: assessmentReportDraft,
            build: buildIntentWorkspace,
            matrix: modeCapabilityMatrix,
          }}
        />
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
        contextSidebar={contextSidebar}
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
        contextSidebar={contextSidebar}
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
        contextSidebar={contextSidebar}
        statusLeft={statusLeft(readiness, view.rows)}
        statusRight={[
          { id: "note", label: "assess · stateless · viewer" },
        ]}
      >
        <AssessPanel initialCounts={assessInitialCounts} readiness={assessmentReadiness} />
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
