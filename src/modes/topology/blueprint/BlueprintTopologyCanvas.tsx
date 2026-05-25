/**
 * Blueprint Topology Canvas — V1BF + V1BG + V1BJ + V1BL.
 *
 * 2D readable map of the active Lab Environment when no imported
 * evidence is present.
 *
 * V1BL — full-surface canvas. The fixed-width right `Selection`
 * column is gone. Click any node and a compact passport card floats
 * over the drafting paper near the picked glyph. When a hardware
 * inspection bay is open (`inspectingNodeId` prop), selecting a
 * different node surfaces a "Re-inspect to switch" hint inside the
 * floating card instead of auto-destroying the bay.
 */

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";

import { EnvironmentLifecycleContext } from "../../../state/EnvironmentLifecycleContext";
import type {
  GraphReadyTopologyEdge,
  GraphReadyTopologyView,
} from "../topologyReview";
import type { RenderGraphDataSource } from "../renderGraph";
import {
  FAMILY_FRAME,
  defaultProfileIdFor,
  pickDensityBand,
  type DensityBand,
  type NodeFamilyCode,
} from "./blueprintGlyph";
import {
  passportFor,
  type HardwareInspectIntent,
  type HardwarePassport,
} from "./hardwarePassport";
import { placeCallout } from "../inspect/calloutPlacement";
// V1BM — layout engine extracted into its own module. The canvas
// no longer owns the ring formula; it picks a scenario-aware layout
// via `layoutNodes(view.nodes, layoutHint)`.
import {
  detectScenario,
  layoutNodes,
  type LayoutHint,
  type NodeLayout,
  type ScenarioKind,
} from "./blueprintLayouts";
// V1BN — edge routing: elbow for branch/campus/datacenter, curve for
// metro, straight for fallback / dot density.
import { routeEdge } from "./blueprintEdges";
import { TopologyEnvSelector } from "../TopologyEnvSelector";
import { DEVICE_ICON, DEVICE_ICON_VIEWBOX } from "./deviceIcons";
import type { LabOperationalState } from "../../../types/labEnvironment";
import { TopologyStateLegend } from "./TopologyStateLegend";
import { computeAffectedFocus, type AffectedFocus } from "./affectedFocus";
import {
  formatSourceProvenance,
  type TopologySourceInfo,
} from "../topologySource";
import {
  buildDiagnoseHandoffFromAffectedFocus,
  type DiagnoseHandoffPayload,
} from "../diagnoseHandoff";
import "./BlueprintTopologyCanvas.css";

// V1BU — state to ring colour mapping
const LAB_STATE_TO_RING_COLOR: Record<LabOperationalState, string> = {
  healthy: "var(--topo-ok)",
  warning: "var(--topo-warn)",
  degraded: "var(--topo-err)",
  down: "var(--topo-critical)",
  maintenance: "var(--topo-maint)",
  unknown: "var(--topo-deferred)",
};

function formatState(state: LabOperationalState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export interface BlueprintTopologyCanvasProps {
  readonly view: GraphReadyTopologyView;
  readonly dataSource: RenderGraphDataSource;
  readonly onInspect?: (intent: HardwareInspectIntent) => void;
  /**
   * V1BL — node id currently mounted inside the hardware inspection
   * bay. When set and the operator selects a different node, the
   * floating passport surfaces a "Re-inspect to switch" hint instead
   * of auto-destroying the active inspection.
   */
  readonly inspectingNodeId?: string | null;
  /**
   * V1BZ — Diagnose handoff seam. When provided, the passport renders
   * an "Open in Diagnose" CTA that delivers a deterministic payload
   * built from the selected node + V1BX affected focus + V1BY source
   * contract. Parent owns the mode switch.
   */
  readonly onOpenDiagnose?: (payload: DiagnoseHandoffPayload) => void;
}

const VIEWBOX_PAD = 64;

function viewboxOf(layouts: NodeLayout[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (layouts.length === 0) {
    return { x: -200, y: -200, w: 400, h: 400 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const l of layouts) {
    const f = FAMILY_FRAME[l.family];
    minX = Math.min(minX, l.x - f.w);
    maxX = Math.max(maxX, l.x + f.w);
    minY = Math.min(minY, l.y - f.h);
    maxY = Math.max(maxY, l.y + f.h);
  }
  return {
    x: minX - VIEWBOX_PAD,
    y: minY - VIEWBOX_PAD,
    w: maxX - minX + VIEWBOX_PAD * 2,
    h: maxY - minY + VIEWBOX_PAD * 2,
  };
}

/**
 * V1BN.hotfix-1 — dot-density mini-glyph. Per-family shape so dense
 * scenes (Metro 96) keep role identity. Shapes chosen to be visually
 * distinct at ~10 px and remain readable when many cluster together.
 */
function dotFamilyStroke(family: NodeFamilyCode): string {
  // V1BR.hotfix-3 — per-family dot OUTLINE colour. Body stays empty so the
  // dense Metro view reads as colour-coded rings, not coloured blots.
  switch (family) {
    case "FW":
      return "var(--topo-fam-fw)";
    case "CORE-RT":
    case "EDGE-RT":
      return "var(--topo-fam-router)";
    case "ACC-SW":
    case "DIST-SW":
    case "WAP":
      return "var(--topo-fam-switch)";
    case "SRV":
      return "var(--topo-fam-server)";
    case "UNK":
    default:
      return "var(--topo-node-unknown-stroke)";
  }
}

function DotMini({
  family,
  selected,
}: {
  family: NodeFamilyCode;
  selected: boolean;
}): JSX.Element {
  const fill = selected ? "var(--topo-cyan)" : "none";
  const stroke = selected ? "var(--topo-cyan)" : dotFamilyStroke(family);
  const sw = selected ? 1.5 : 1.25;
  switch (family) {
    case "FW":
      return (
        <rect
          className="bt-node-dot bt-node-dot--fw"
          x={-7}
          y={-7}
          width={14}
          height={14}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case "CORE-RT":
      return (
        <polygon
          className="bt-node-dot bt-node-dot--core"
          points="0,-9 9,0 0,9 -9,0"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case "EDGE-RT":
      return (
        <rect
          className="bt-node-dot bt-node-dot--edge"
          x={-9}
          y={-5}
          width={18}
          height={10}
          rx={3}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case "DIST-SW":
      return (
        <rect
          className="bt-node-dot bt-node-dot--dist"
          x={-5}
          y={-8}
          width={10}
          height={16}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case "ACC-SW":
      return (
        <rect
          className="bt-node-dot bt-node-dot--acc"
          x={-8}
          y={-4}
          width={16}
          height={8}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case "WAP":
      return (
        <polygon
          className="bt-node-dot bt-node-dot--wap"
          points="0,-9 9,5 -9,5"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case "SRV":
      return (
        <circle
          className="bt-node-dot bt-node-dot--srv"
          r={selected ? 9 : 7}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    case "UNK":
    default:
      return (
        <circle
          className="bt-node-dot bt-node-dot--unk"
          r={selected ? 9 : 6}
          fill={selected ? "var(--topo-cyan)" : "none"}
          stroke={stroke}
          strokeWidth={sw}
          opacity={0.75}
        />
      );
  }
}

interface GlyphProps {
  layout: NodeLayout;
  band: DensityBand;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  onInspectIntent: (nodeId: string) => void;
  // V1BL-F — initiated by Glyph's onPointerDown; parent runs the
  // window-level pointermove/up listeners that turn it into a drag.
  onNodeDragStart: (nodeId: string, clientX: number, clientY: number) => void;
  // V1BX — this node is a neighbour in the selected node's affected focus.
  focusAffected?: boolean;
}

function Glyph({
  layout,
  band,
  selected,
  onSelect,
  onInspectIntent,
  onNodeDragStart,
  focusAffected,
}: GlyphProps): JSX.Element {
  const { node, family, x, y } = layout;
  const frame = FAMILY_FRAME[family];

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleDoubleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onInspectIntent(node.id);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>): void => {
    if (e.button !== 0) return;
    // Stop the SVG-level pointerdown (canvas pan) from also firing.
    e.stopPropagation();
    onNodeDragStart(node.id, e.clientX, e.clientY);
  };

  if (band === "dot") {
    // V1BN.hotfix-1 — role-aware mini-glyph in dot density. Metro 96
    // used to render every device as an identical circle, throwing
    // away the V1BN identity inference. Now each family carries a
    // distinct micro shape so firewalls / routers / switches / APs /
    // servers stay visually distinguishable even at 96+ density.
    return (
      <g
        className="bt-node"
        transform={`translate(${x} ${y})`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        data-testid={`bt-node-${node.id}`}
        data-density="dot"
        data-family={family}
        data-family-mini={family}
        data-focus={focusAffected ? "affected-neighbor" : undefined}
      >
        {/* V1BS.hotfix-2 — invisible hit-target so outline-only dots
         * remain draggable / clickable / double-clickable at Metro
         * density. Without this, pointer events fall through the
         * empty interiors of the V1BR.hf3 outline dots. */}
        <rect
          className="bt-node-frame"
          x={-12}
          y={-12}
          width={24}
          height={24}
          rx={3}
        />
        <DotMini family={family} selected={selected} />
        {/* V1BS.hotfix-2 — hostname label at all densities. Smaller
         * font for dot band so it doesn't crowd Metro. */}
        <text className="bt-node-label bt-node-label--dot" x={0} y={14}>
          {node.label}
        </text>
        {selected && <circle className="bt-node-focus-ring" r={16} />}
      </g>
    );
  }

  const showFaceplate = band === "full" || band === "faceplate";
  // V1BS.hotfix-2 — hostname visible on every band (full / faceplate /
  // silhouette). Bujar's contract: each device must show its name.
  const showLabel = true;

  const operationalState = node.operational_state ?? "healthy";
  const ringColor = LAB_STATE_TO_RING_COLOR[operationalState];

  return (
    <g
      className="bt-node"
      transform={`translate(${x} ${y})`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      data-testid={`bt-node-${node.id}`}
      data-density={band}
      data-family={family}
      data-state={operationalState}
      data-focus={focusAffected ? "affected-neighbor" : undefined}
    >
      <rect
        className="bt-node-state-ring"
        x={-frame.w / 2 - 4}
        y={-frame.h / 2 - 4}
        width={frame.w + 8}
        height={frame.h + 8}
        rx={frame.rx + 2}
        stroke={ringColor}
      />
      {/* V1BS — invisible hit-target rect. Drives drag bbox, focus-ring
       * placement, click hit detection. The visible device shape is
       * the icon below, rendered icon-as-frame. */}
      <rect
        className="bt-node-frame"
        x={-frame.w / 2}
        y={-frame.h / 2}
        width={frame.w}
        height={frame.h}
        rx={frame.rx}
      />
      {/* V1BS — icon-as-frame. Source viewBox is 64×64; we scale it onto
       * the family frame w/h. Stroke inherits family colour via
       * `currentColor` from `.bt-node[data-family=...]` in CSS. */}
      <g
        className="bt-node-icon"
        transform={`translate(${-frame.w / 2} ${-frame.h / 2}) scale(${frame.w / DEVICE_ICON_VIEWBOX.w} ${frame.h / DEVICE_ICON_VIEWBOX.h})`}
      >
        {DEVICE_ICON[family]}
      </g>
      {/* V1BS — small family code label, sits just above the hostname.
       * Icons are self-identifying so the code stays tiny + recessed. */}
      {showFaceplate && (
        <text
          className={
            family === "UNK"
              ? "bt-node-family-code bt-node-family-code--unk"
              : "bt-node-family-code"
          }
          x={0}
          y={frame.h / 2 - 1}
          data-family-glyph={family === "UNK" ? "unknown" : "known"}
        >
          {family === "UNK" ? "?" : family}
        </text>
      )}
      {showLabel && (
        <text className="bt-node-label" x={0} y={frame.h / 2 + 10}>
          {node.label}
        </text>
      )}
      {selected && (
        <rect
          className="bt-node-focus-ring"
          x={-frame.w / 2 - 1}
          y={-frame.h / 2 - 1}
          width={frame.w + 2}
          height={frame.h + 2}
          rx={frame.rx + 1}
        />
      )}
    </g>
  );
}

interface EdgeProps {
  edge: GraphReadyTopologyEdge;
  from: NodeLayout;
  to: NodeLayout;
  active: boolean;
  focusAffected: boolean;
  scenario: ScenarioKind;
  band: DensityBand;
}

function Edge({ edge, from, to, active, focusAffected, scenario, band }: EdgeProps): JSX.Element {
  const route = routeEdge({ x: from.x, y: from.y }, { x: to.x, y: to.y }, {
    scenario,
    band,
  });
  return (
    <path
      className={active ? "bt-edge is-active" : "bt-edge"}
      d={route.d}
      data-testid={`bt-edge-${edge.id}`}
      data-route-kind={route.kind}
      data-state={edge.operational_state ?? "healthy"}
      data-focus={focusAffected ? "affected" : undefined}
    />
  );
}

const PASSPORT_W = 280;
const PASSPORT_H_EST = 220;

// V1BL-B — pan / zoom limits.
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 8.0;
const ZOOM_STEP = 1.12;
const PAN_THRESHOLD_PX = 5;
// V1BL-F — minimum content visible after clamp (in viewBox units).
const PAN_GUARD_VBU = 96;
// V1BL-F — Fit leaves a comfortable margin around the bounding box.
const FIT_MARGIN_PX = 48;

interface ViewTransform {
  tx: number;
  ty: number;
  scale: number;
}

const IDENTITY_TRANSFORM: ViewTransform = { tx: 0, ty: 0, scale: 1 };

interface Vb {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PointOffset {
  dx: number;
  dy: number;
}

/**
 * V1BL-F — clamp a candidate transform so at least PAN_GUARD_VBU of
 * content stays visible inside the SVG's viewBox on each axis. Without
 * this the operator can pan the graph indefinitely off-screen and lose
 * the devices.
 */
function clampTransform(t: ViewTransform, vb: Vb): ViewTransform {
  const txMin = vb.x + PAN_GUARD_VBU - (vb.x + vb.w) * t.scale;
  const txMax = vb.x + vb.w - PAN_GUARD_VBU - vb.x * t.scale;
  const tyMin = vb.y + PAN_GUARD_VBU - (vb.y + vb.h) * t.scale;
  const tyMax = vb.y + vb.h - PAN_GUARD_VBU - vb.y * t.scale;
  // When zoomed-out so far the bounds invert (txMin > txMax), centre.
  const cx = (vb.x + vb.w * 0.5) * (1 - t.scale);
  const cy = (vb.y + vb.h * 0.5) * (1 - t.scale);
  return {
    tx: txMin > txMax ? cx : Math.min(txMax, Math.max(txMin, t.tx)),
    ty: tyMin > tyMax ? cy : Math.min(tyMax, Math.max(tyMin, t.ty)),
    scale: t.scale,
  };
}

export function BlueprintTopologyCanvas({
  view,
  dataSource,
  onInspect,
  inspectingNodeId,
  onOpenDiagnose,
}: BlueprintTopologyCanvasProps): JSX.Element {
  const lifecycle = useContext(EnvironmentLifecycleContext);
  const active = lifecycle?.active ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [passportPos, setPassportPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  // V1BL-B — pan/zoom transform applied to all canvas content via a
  // wrapping <g transform>. The SVG viewBox stays put.
  const [transform, setTransform] = useState<ViewTransform>(IDENTITY_TRANSFORM);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    moved: boolean;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setSelectedId(null);
    setPassportPos(null);
    setTransform(IDENTITY_TRANSFORM);
    // V1BQ — load persisted overrides for the incoming environment.
    // Read via ref so `lifecycle` is not a dep (adding it would re-fire on
    // every position-persist, resetting the transform mid-session).
    const savedPositions =
      lifecycleRef.current?.active?.topology_presentation?.node_positions ?? {};
    if (Object.keys(savedPositions).length === 0) {
      setNodeOffsets({});
    } else {
      const offsets: Record<string, PointOffset> = {};
      for (const l of baseLayoutsRef.current) {
        const pos = savedPositions[l.node.id];
        if (pos) {
          offsets[l.node.id] = { dx: pos.x - l.x, dy: pos.y - l.y };
        }
      }
      setNodeOffsets(offsets);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // V1BN.hotfix-2 — initial auto-fit ref. Declared here so the
  // useLayoutEffect (placed after fitView below) can read it.
  const initialFitRef = useRef<GraphReadyTopologyView | null>(null);

  // V1BL-F — per-node offsets from generated layout, applied on top of
  // the deterministic `layoutNodes` output. V1BQ — drag writes here and
  // persists to env record; Reset/Fit do not clear persisted placements.
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, PointOffset>>({});
  const suppressNextClickRef = useRef<string | null>(null);

  // V1BQ — stable refs for use inside window-level event listeners without
  // stale closure issues. Updated synchronously before window handlers run.
  const baseLayoutsRef = useRef<NodeLayout[]>([]);
  const nodeOffsetsRef = useRef<Record<string, PointOffset>>({});
  const activeEnvIdRef = useRef<string | null>(null);
  const updateTopologyPositionsRef = useRef<((envId: string, positions: Record<string, { readonly x: number; readonly y: number }>) => void) | null>(null);
  // V1BQ — lifecycle ref so the view-change effect reads current lifecycle
  // without adding it to the dep array (which would fire on every persist).
  const lifecycleRef = useRef(lifecycle);

  // V1BM — scenario-aware layout selection. The hint is derived from
  // the active lab record's `scenario_id` + name + the view's
  // environment id; the layout module dispatches to branch / campus /
  // datacenter / metro / fallback based on keywords + node count.
  const layoutHint = useMemo<LayoutHint>(() => {
    const labPayload = active?.lab_payload as
      | { scenario_id?: string | null }
      | undefined;
    return {
      scenarioId: labPayload?.scenario_id ?? null,
      envName: active?.name ?? view.environment_id ?? null,
    };
  }, [active, view.environment_id]);

  const baseLayouts = useMemo(
    () => layoutNodes(view.nodes, layoutHint),
    [view.nodes, layoutHint],
  );

  // V1BN — scenario kind drives edge routing (elbow / curve / straight).
  const scenarioKind = useMemo<ScenarioKind>(
    () => detectScenario(layoutHint, view.nodes.length),
    [layoutHint, view.nodes.length],
  );
  const layouts = useMemo(() => {
    if (Object.keys(nodeOffsets).length === 0) return baseLayouts;
    return baseLayouts.map((l) => {
      const off = nodeOffsets[l.node.id];
      return off ? { ...l, x: l.x + off.dx, y: l.y + off.dy } : l;
    });
  }, [baseLayouts, nodeOffsets]);
  const layoutById = useMemo(() => {
    const m = new Map<string, NodeLayout>();
    for (const l of layouts) m.set(l.node.id, l);
    return m;
  }, [layouts]);

  const band = useMemo(() => pickDensityBand(layouts.length), [layouts.length]);
  const vb = useMemo(() => viewboxOf(layouts), [layouts]);

  // V1BQ — keep refs current so window-level drag handlers and the view-change
  // effect can read latest values without adding them to dep arrays.
  lifecycleRef.current = lifecycle;
  baseLayoutsRef.current = baseLayouts;
  nodeOffsetsRef.current = nodeOffsets;
  activeEnvIdRef.current = active?.environment_id ?? null;
  updateTopologyPositionsRef.current = lifecycle?.updateTopologyPositions ?? null;

  const activeEdgeIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const ids = new Set<string>();
    for (const e of view.edges) {
      if (e.source_node_id === selectedId || e.target_node_id === selectedId) {
        ids.add(e.id);
      }
    }
    return ids;
  }, [selectedId, view.edges]);

  const affectedFocus: AffectedFocus = useMemo(
    () => computeAffectedFocus({
      selectedNodeId: selectedId,
      nodes: view.nodes,
      edges: view.edges,
      sourceKind: view.source?.kind,   // V1BY
    }),
    [selectedId, view.nodes, view.edges, view.source?.kind],
  );

  const onSelect = useCallback((nodeId: string): void => {
    // V1BL-F — if this click was the tail of a drag, swallow it so
    // selection doesn't toggle on drop.
    if (suppressNextClickRef.current === nodeId) {
      suppressNextClickRef.current = null;
      return;
    }
    setSelectedId((curr) => (curr === nodeId ? null : nodeId));
  }, []);

  const clearSelection = useCallback((): void => {
    setSelectedId(null);
  }, []);

  // ── V1BL-B pan / zoom handlers ─────────────────────────────────

  // V1BQ — Reset only restores pan/zoom. Persisted node placements
  // are NOT cleared here; they survive Reset/Fit per spec.
  const resetView = useCallback((): void => {
    setTransform(IDENTITY_TRANSFORM);
  }, []);

  const fitView = useCallback((): void => {
    const svg = svgRef.current;
    if (!svg) {
      setTransform(IDENTITY_TRANSFORM);
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      setTransform(IDENTITY_TRANSFORM);
      return;
    }
    // Content bbox in world coords (vb already inflates by VIEWBOX_PAD
    // on every side, so inner content lives in [vb.x+PAD, vb.x+vb.w-PAD]).
    const contentMinX = vb.x + VIEWBOX_PAD;
    const contentMinY = vb.y + VIEWBOX_PAD;
    const contentW = Math.max(1, vb.w - VIEWBOX_PAD * 2);
    const contentH = Math.max(1, vb.h - VIEWBOX_PAD * 2);
    const marginVbX = (FIT_MARGIN_PX * vb.w) / rect.width;
    const marginVbY = (FIT_MARGIN_PX * vb.h) / rect.height;
    const targetScale = Math.min(
      (vb.w - marginVbX * 2) / contentW,
      (vb.h - marginVbY * 2) / contentH,
    );
    const scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetScale));
    const contentCenterX = contentMinX + contentW / 2;
    const contentCenterY = contentMinY + contentH / 2;
    const visibleCenterX = vb.x + vb.w / 2;
    const visibleCenterY = vb.y + vb.h / 2;
    setTransform({
      tx: visibleCenterX - scale * contentCenterX,
      ty: visibleCenterY - scale * contentCenterY,
      scale,
    });
  }, [vb.x, vb.y, vb.w, vb.h]);

  // V1BN.hotfix-2 — initial auto-fit on view change. Pre-hotfix the
  // canvas mounted with identity transform and a viewBox derived from
  // layout bbox. For square-ish layouts (metro/datacenter) on wide
  // SVG rects, `preserveAspectRatio="xMidYMid meet"` letterboxed
  // content into a top-centred band — Bujar read this as "metro
  // trapped in upper part of the canvas". Fitting once per view
  // change after the SVG rect is measured guarantees content fills
  // the visible work surface on first paint. Subsequent user
  // pan/zoom is preserved because this fires only on view ref change.
  useLayoutEffect(() => {
    if (initialFitRef.current === view) return;
    initialFitRef.current = view;
    if (view.nodes.length === 0) return;
    const raf = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      fitView();
    });
    return () => cancelAnimationFrame(raf);
  }, [view, fitView]);

  const screenToViewbox = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const rx = vb.w / rect.width;
      const ry = vb.h / rect.height;
      return {
        x: vb.x + (clientX - rect.left) * rx,
        y: vb.y + (clientY - rect.top) * ry,
      };
    },
    [vb.x, vb.y, vb.w, vb.h],
  );

  // V1BL-G — wheel = zoom only. The V1BL-C Figma model (plain wheel
  // pans, Ctrl+wheel zooms, Shift+wheel horizontal pan) was confusing
  // operators about whether the wheel zoomed the canvas or scrolled
  // the page. New rule: wheel anywhere over the canvas zooms around
  // the pointer, modifiers are no-ops. Pan stays exclusively on
  // click-and-drag. Page never scrolls under the canvas (native
  // non-passive listener owns preventDefault).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent): void => {
      e.preventDefault();
      const ptr = screenToViewbox(e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      setTransform((t) => {
        const ns = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, t.scale * factor));
        if (ns === t.scale) return t;
        const next: ViewTransform = !ptr
          ? { ...t, scale: ns }
          : (() => {
              const k = ns / t.scale;
              return {
                tx: ptr.x - (ptr.x - t.tx) * k,
                ty: ptr.y - (ptr.y - t.ty) * k,
                scale: ns,
              };
            })();
        return clampTransform(next, vb);
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [screenToViewbox, vb.w, vb.h]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): void => {
      if (e.button !== 0) return;
      // ignore drags that start on a node — node click stays a click
      if ((e.target as Element).closest('[data-testid^="bt-node-"]')) return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTx: transform.tx,
        startTy: transform.ty,
        moved: false,
      };
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        /* jsdom + non-pointer browsers */
      }
    },
    [transform.tx, transform.ty],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): void => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > PAN_THRESHOLD_PX) {
        drag.moved = true;
      }
      if (drag.moved) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const rx = vb.w / rect.width;
        const ry = vb.h / rect.height;
        setTransform((t) =>
          clampTransform(
            { ...t, tx: drag.startTx + dx * rx, ty: drag.startTy + dy * ry },
            vb,
          ),
        );
      }
    },
    [vb.w, vb.h, vb.x, vb.y],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): void => {
      const drag = dragRef.current;
      dragRef.current = null;
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!drag) return;
      // Click-without-drag on empty SVG → clear selection (drag is pan)
      if (!drag.moved) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  // Esc dismisses the floating passport.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection]);

  // ── V1BL-F node-drag ──────────────────────────────────────────────
  //
  // A node-drag is triggered by `Glyph.onPointerDown` and tracked
  // entirely outside React state until it crosses PAN_THRESHOLD_PX.
  // Once it crosses the threshold, we commit position updates to
  // `nodeOffsets` so the SVG re-renders the glyph + adjacent edges
  // at the new world coords. On pointerup, if the drag crossed the
  // threshold we suppress the synthetic `click` that fires last so
  // selection doesn't toggle. Below-threshold pointerup falls through
  // and the existing click handler runs (selection toggle).
  const nodeDragRef = useRef<{
    nodeId: string;
    startCX: number;
    startCY: number;
    startDx: number;
    startDy: number;
    moved: boolean;
    /**
     * V1BM.hotfix-1 — screen-pixels-per-world-unit, captured at
     * drag-start. The pre-hotfix handler recomputed `vb.w / rect.w`
     * on every tick, but the viewBox grew as the dragged node
     * pushed the layout bbox outward — feedback loop that
     * accelerated the drag rate mid-gesture (the node outran the
     * cursor). Snapshotting once on pointerdown keeps the rate
     * stable for the duration of the gesture. Uses the SVG's
     * uniform aspectFit so both axes scale correctly even when the
     * viewBox aspect doesn't match the SVG element aspect.
     */
    pxPerWorld: number;
  } | null>(null);

  const onNodeDragStart = useCallback(
    (nodeId: string, clientX: number, clientY: number): void => {
      const off = nodeOffsets[nodeId];
      const svg = svgRef.current;
      let pxPerWorld = 1;
      if (svg) {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const aspectFit = Math.min(rect.width / vb.w, rect.height / vb.h);
          pxPerWorld = aspectFit * transform.scale;
        }
      }
      nodeDragRef.current = {
        nodeId,
        startCX: clientX,
        startCY: clientY,
        startDx: off?.dx ?? 0,
        startDy: off?.dy ?? 0,
        moved: false,
        pxPerWorld: pxPerWorld > 0 ? pxPerWorld : 1,
      };
    },
    [nodeOffsets, vb.w, vb.h, transform.scale],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      const d = nodeDragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startCX;
      const dy = e.clientY - d.startCY;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > PAN_THRESHOLD_PX) {
        d.moved = true;
      }
      if (!d.moved) return;
      const worldDx = dx / d.pxPerWorld;
      const worldDy = dy / d.pxPerWorld;
      setNodeOffsets((prev) => ({
        ...prev,
        [d.nodeId]: { dx: d.startDx + worldDx, dy: d.startDy + worldDy },
      }));
    };
    const onUp = (): void => {
      const d = nodeDragRef.current;
      nodeDragRef.current = null;
      if (d && d.moved) {
        suppressNextClickRef.current = d.nodeId;
        // V1BQ — persist final node position for active environment.
        const envId = activeEnvIdRef.current;
        const persistFn = updateTopologyPositionsRef.current;
        if (envId && persistFn) {
          const off = nodeOffsetsRef.current[d.nodeId];
          const base = baseLayoutsRef.current.find((l) => l.node.id === d.nodeId);
          if (off && base) {
            persistFn(envId, {
              [d.nodeId]: { x: base.x + off.dx, y: base.y + off.dy },
            });
          }
        }
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const rootRef = useRef<HTMLElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

  // V1BL-C — bumped whenever the canvas-wrap element resizes (bay open
  // / close, window resize). Drives passport repositioning so the card
  // stays glued to the selected glyph after layout changes.
  const [resizeTick, setResizeTick] = useState(0);

  // V1BW — legend toggle: when true, healthy nodes + edges fade to low
  // opacity so affected items pop. Selection state always wins.
  const [affectedOnly, setAffectedOnly] = useState<boolean>(false);

  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setResizeTick((n) => (n + 1) % 1_000_000);
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // V1BL — position the floating passport near the selected glyph in
  // canvas-wrap coords, using the V1BJ edge-aware placement helper.
  // V1BL-B — recompute on every transform change so the passport
  // tracks pan and zoom.
  // V1BL-C — `resizeTick` participates so the passport tracks canvas
  // resize too (split-bay open/close, window resize).
  useLayoutEffect(() => {
    if (!selectedId) {
      setPassportPos(null);
      return;
    }
    const wrap = canvasWrapRef.current;
    const nodeEl = rootRef.current?.querySelector<SVGGraphicsElement>(
      `[data-testid="bt-node-${selectedId}"]`,
    );
    if (!wrap || !nodeEl) return;
    const wr = wrap.getBoundingClientRect();
    const nr = nodeEl.getBoundingClientRect();
    const anchor = {
      x: nr.left + nr.width / 2 - wr.left,
      y: nr.top + nr.height / 2 - wr.top,
    };
    const placement = placeCallout(
      anchor,
      { w: PASSPORT_W, h: PASSPORT_H_EST },
      { w: wr.width, h: wr.height },
    );
    setPassportPos({ left: placement.cardLeft, top: placement.cardTop });
  }, [selectedId, view, band, transform, resizeTick]);

  const dispatchInspect = useCallback(
    (nodeId: string, trigger: HardwareInspectIntent["trigger"]): void => {
      const target = layoutById.get(nodeId);
      if (!target) return;
      const isVirtual =
        (target.node.role_hint || "").toLowerCase().includes("virtual") ||
        (target.node.role_hint || "").toLowerCase().includes("vm");
      const profileId = defaultProfileIdFor(target.family, { virtual: isVirtual });

      const root = rootRef.current;
      const nodeEl = root?.querySelector<SVGGraphicsElement>(
        `[data-testid="bt-node-${nodeId}"]`,
      );
      const overlayEl =
        (root?.closest(".hardware-inspect-receiver") as HTMLElement | null) ??
        root;
      let anchor: HardwareInspectIntent["anchor"];
      let viewport: HardwareInspectIntent["viewport"];
      if (nodeEl && overlayEl) {
        const nr = nodeEl.getBoundingClientRect();
        const or = overlayEl.getBoundingClientRect();
        anchor = {
          x: nr.left - or.left,
          y: nr.top - or.top,
          w: nr.width,
          h: nr.height,
        };
        viewport = { w: or.width, h: or.height };
      }

      const intent: HardwareInspectIntent = {
        source: "blueprint",
        nodeId,
        profileId,
        family: target.family,
        trigger,
        label: target.node.label,
        anchor,
        viewport,
      };
      if (onInspect) {
        onInspect(intent);
      } else {
        // eslint-disable-next-line no-console
        console.info("[blueprint] inspect intent", intent);
      }
    },
    [layoutById, onInspect],
  );

  const onInspectIntent = useCallback(
    (nodeId: string): void => {
      setSelectedId(nodeId);
      dispatchInspect(nodeId, "doubleclick");
    },
    [dispatchInspect],
  );

  const onInspectCtaClick = useCallback((): void => {
    if (!selectedId) return;
    dispatchInspect(selectedId, "cta");
  }, [selectedId, dispatchInspect]);

  // V1BZ — Diagnose handoff CTA. Builds the payload from the live
  // selection + affected-focus + V1BY source contract, then hands it
  // upward via `onOpenDiagnose`. No-op when the callback is absent or
  // selection is empty.
  const onOpenDiagnoseClick = useCallback((): void => {
    if (!selectedId || !onOpenDiagnose) return;
    const sel = layoutById.get(selectedId);
    if (!sel) return;
    const payload = buildDiagnoseHandoffFromAffectedFocus({
      view,
      selectedNode: sel.node,
      affectedFocus,
      environmentId: active?.environment_id ?? view.environment_id ?? undefined,
    });
    onOpenDiagnose(payload);
  }, [selectedId, onOpenDiagnose, layoutById, view, affectedFocus, active]);

  const envName =
    active?.name ?? view.environment_id ?? "(no active environment)";
  // V1BY-HF2 — env selector is the single environment identity when more
  // than one env is visible. Otherwise fall back to a plain env-name rail
  // item so the rail always carries an identity anchor.
  const hasEnvSelector = (lifecycle?.visible_environments?.length ?? 0) >= 2;
  // V1BY-HF1 — dataSource prop kept on the interface for callers but the
  // visible GENERATED-LAB badge is gone; the consolidated provenance group
  // now reads from view.source.
  void dataSource;

  const selectedNode = selectedId ? layoutById.get(selectedId)?.node ?? null : null;
  const selectedFamily = selectedId ? layoutById.get(selectedId)?.family ?? null : null;
  const selectedPassport: HardwarePassport | null = useMemo(() => {
    if (!selectedFamily) return null;
    const isVirtual =
      !!selectedNode &&
      ((selectedNode.role_hint || "").toLowerCase().includes("virtual") ||
        (selectedNode.role_hint || "").toLowerCase().includes("vm"));
    const profileId = defaultProfileIdFor(selectedFamily, { virtual: isVirtual });
    return passportFor(profileId);
  }, [selectedFamily, selectedNode]);
  const selectedNeighbours = useMemo(() => {
    if (!selectedId) return [] as string[];
    const out = new Set<string>();
    for (const e of view.edges) {
      if (e.source_node_id === selectedId) out.add(e.target_node_id);
      else if (e.target_node_id === selectedId) out.add(e.source_node_id);
    }
    return [...out].sort();
  }, [selectedId, view.edges]);

  const showSwitchHint =
    selectedId !== null &&
    inspectingNodeId != null &&
    inspectingNodeId !== selectedId;

  return (
    <section
      ref={rootRef}
      className="blueprint-topology"
      data-testid="blueprint-topology"
      data-density={band}
      data-node-count={layouts.length}
      data-affected-only={affectedOnly ? "true" : "false"}
    >
      {view.nodes.length === 0 && (
        <div
          className="bt-empty-overlay"
          data-testid="bt-empty-overlay"
          role="status"
          aria-label="Simulated graph payload is empty"
        >
          <span>Simulated graph payload is empty</span>
          <span className="bt-empty-overlay-hint">
            active environment has no devices to render
          </span>
        </div>
      )}
      {/* V1BY-HF2 — uniform metadata rail. Single CSS class family
       * (.bt-header-item) drives every visible element: env selector
       * (or env-name fallback), node/link/density counts, and the
       * consolidated provenance group. No bold labels, no bold values,
       * one font-size + weight + letter-spacing across the rail. The
       * separate left env title and the duplicate scenario pair are
       * gone — env identity reads from the selector (or its fallback)
       * once. */}
      <header className="bt-header" data-testid="bt-header">
        {hasEnvSelector ? (
          <TopologyEnvSelector />
        ) : (
          <span
            className="bt-header-item bt-header-item--env"
            data-testid="bt-header-env"
          >
            {envName}
          </span>
        )}
        <span className="bt-header-item">
          <span className="bt-header-item__label">nodes</span>
          <span className="bt-header-item__value">{view.nodes.length}</span>
        </span>
        <span className="bt-header-item">
          <span className="bt-header-item__label">links</span>
          <span className="bt-header-item__value">{view.edges.length}</span>
        </span>
        <span className="bt-header-item">
          <span className="bt-header-item__label">density</span>
          <span className="bt-header-item__value">{band}</span>
        </span>
        {(() => {
          const sourceInfo: TopologySourceInfo | undefined = view.source;
          return (
            <span
              className="bt-header-item bt-header-item--provenance"
              data-testid="bt-header-provenance"
              data-source-kind={sourceInfo?.kind ?? "unknown"}
              data-freshness={sourceInfo?.freshness ?? "unknown"}
            >
              {formatSourceProvenance(sourceInfo)}
            </span>
          );
        })()}
      </header>

      <div
        className="bt-canvas-wrap"
        ref={canvasWrapRef}
        data-testid="bt-canvas-wrap"
        data-scale={transform.scale.toFixed(3)}
        data-tx={transform.tx.toFixed(2)}
        data-ty={transform.ty.toFixed(2)}
      >
        <svg
          ref={svgRef}
          className="bt-canvas"
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-testid="bt-svg"
          data-topology-svg-layer="true"
        >
          <g
            transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
            data-testid="bt-transform-root"
          >
            {/* V1BM.hotfix-1 — grid moved to CSS background on
             * .bt-canvas-wrap so it covers the full work surface
             * regardless of viewBox aspect padding. */}

            <g aria-label="links">
              {view.edges.map((edge) => {
                const from = layoutById.get(edge.source_node_id);
                const to = layoutById.get(edge.target_node_id);
                if (!from || !to) return null;
                return (
                  <Edge
                    key={edge.id}
                    edge={edge}
                    from={from}
                    to={to}
                    active={activeEdgeIds.has(edge.id)}
                    focusAffected={affectedFocus.affectedEdgeIds.has(edge.id)}
                    scenario={scenarioKind}
                    band={band}
                  />
                );
              })}
            </g>

            <g aria-label="nodes">
              {layouts.map((l) => (
                <Glyph
                  key={l.node.id}
                  layout={l}
                  band={band}
                  selected={selectedId === l.node.id}
                  onSelect={onSelect}
                  onInspectIntent={onInspectIntent}
                  onNodeDragStart={onNodeDragStart}
                  focusAffected={affectedFocus.affectedNeighborIds.has(l.node.id)}
                />
              ))}
            </g>
          </g>
        </svg>

        {/* V1BW — topology state legend */}
        <TopologyStateLegend
          view={view}
          affectedOnly={affectedOnly}
          onToggleAffectedOnly={setAffectedOnly}
        />

        {/* V1BL-B — canvas navigation strip */}
        <div className="bt-nav" data-testid="bt-nav" aria-label="Canvas navigation">
          <button
            type="button"
            className="bt-nav-btn"
            data-testid="bt-nav-fit"
            onClick={fitView}
            title="Fit graph to viewport"
          >
            Fit
          </button>
          <button
            type="button"
            className="bt-nav-btn"
            data-testid="bt-nav-reset"
            onClick={resetView}
            title="Reset pan/zoom (node placements preserved)"
          >
            Reset
          </button>
          <span
            className="bt-nav-zoom"
            data-testid="bt-nav-zoom"
          >
            {Math.round(transform.scale * 100)}%
          </span>
        </div>

        {selectedNode && (
          <div
            className="bt-passport-floating"
            data-testid="bt-passport-floating"
            style={
              passportPos
                ? { left: passportPos.left, top: passportPos.top }
                : undefined
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bt-passport-strip" />
            <div className="bt-passport-id" data-testid="bt-summary-id">
              {selectedNode.id}
            </div>
            <div className="bt-passport-row">
              <span>label</span>
              <strong>{selectedNode.label}</strong>
            </div>
            <div className="bt-passport-row">
              <span>family</span>
              <strong>{selectedFamily}</strong>
            </div>
            <div className="bt-passport-row">
              <span>role hint</span>
              <strong>{selectedNode.role_hint || "—"}</strong>
            </div>
            <div className="bt-passport-row">
              <span>neighbours</span>
              <strong>{selectedNeighbours.length}</strong>
            </div>
            <div className="bt-passport-row" data-testid="bt-passport-state-row">
              <span>state</span>
              <strong data-state={selectedNode.operational_state ?? "healthy"}>
                {formatState(selectedNode.operational_state ?? "healthy")}
              </strong>
            </div>

            {affectedFocus.hasSelection &&
              (affectedFocus.affectedEdgeIds.size > 0 || affectedFocus.affectedNeighborIds.size > 0) && (
              <div className="bt-passport-focus" data-testid="bt-passport-focus">
                <div className="bt-passport-focus-title">Affected focus</div>
                <div className="bt-passport-row">
                  <span>worst</span>
                  <strong data-state={affectedFocus.worstState}>
                    {formatState(affectedFocus.worstState)}
                  </strong>
                </div>
                <div className="bt-passport-row">
                  <span>links</span>
                  <strong data-testid="bt-passport-focus-link-count">
                    {affectedFocus.affectedEdgeIds.size}
                  </strong>
                </div>
                <div className="bt-passport-row">
                  <span>neighbours</span>
                  <strong data-testid="bt-passport-focus-neighbor-count">
                    {affectedFocus.affectedNeighborIds.size}
                  </strong>
                </div>
                {affectedFocus.neighborLabels.length > 0 && (
                  <div className="bt-passport-focus-names" data-testid="bt-passport-focus-names">
                    {affectedFocus.neighborLabels.join(" · ")}
                  </div>
                )}
              </div>
            )}

            {selectedPassport && (
              <div
                className={
                  selectedPassport.profileId === "unk1u"
                    ? "bt-passport-hw is-soft"
                    : "bt-passport-hw"
                }
                data-testid="bt-summary-passport"
              >
                <div className="bt-passport-row">
                  <span>profile id</span>
                  <strong data-testid="bt-passport-profile">
                    {selectedPassport.profileId}
                  </strong>
                </div>
                <div className="bt-passport-row">
                  <span>chassis</span>
                  <strong>{selectedPassport.chassisFamily}</strong>
                </div>
                <div className="bt-passport-row">
                  <span>model</span>
                  <strong>
                    {selectedPassport.vendor} · {selectedPassport.model}
                  </strong>
                </div>
                {selectedPassport.rackUnits !== null && (
                  <div className="bt-passport-row">
                    <span>rack units</span>
                    <strong>{selectedPassport.rackUnits}U</strong>
                  </div>
                )}
                {selectedPassport.counts.totalPorts > 0 && (
                  <div className="bt-passport-row">
                    <span>ports</span>
                    <strong>
                      {selectedPassport.counts.rj45} /{" "}
                      {selectedPassport.counts.sfp} /{" "}
                      {selectedPassport.counts.qsfp}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {showSwitchHint && (
              <div
                className="bt-passport-switch-hint"
                data-testid="bt-passport-switch-hint"
              >
                Hardware bay shows another device — re-inspect to switch.
              </div>
            )}

            <button
              type="button"
              className="bt-inspect-cta"
              data-testid="bt-inspect-cta"
              onClick={onInspectCtaClick}
              aria-label={`Inspect hardware for ${selectedNode.label}`}
            >
              {showSwitchHint ? "Re-inspect Hardware ▸" : "Inspect Hardware ▸"}
            </button>

            {onOpenDiagnose && (
              <button
                type="button"
                className={
                  affectedFocus.hasSelection &&
                  (affectedFocus.affectedEdgeIds.size > 0 ||
                    affectedFocus.affectedNeighborIds.size > 0)
                    ? "bt-diagnose-cta is-strong"
                    : "bt-diagnose-cta"
                }
                data-testid="bt-diagnose-cta"
                onClick={onOpenDiagnoseClick}
                aria-label={`Open ${selectedNode.label} in Diagnose`}
              >
                Open in Diagnose ▸
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
