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
  GraphReadyTopologyNode,
  GraphReadyTopologyView,
} from "../topologyReview";
import type { RenderGraphDataSource } from "../renderGraph";
import {
  FAMILY_FRAME,
  defaultProfileIdFor,
  familyOf,
  pickDensityBand,
  stateRingColor,
  type DensityBand,
  type NodeFamilyCode,
} from "./blueprintGlyph";
import {
  passportFor,
  type HardwareInspectIntent,
  type HardwarePassport,
} from "./hardwarePassport";
import { placeCallout } from "../inspect/calloutPlacement";
import "./BlueprintTopologyCanvas.css";

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
}

interface NodeLayout {
  node: GraphReadyTopologyNode;
  family: NodeFamilyCode;
  x: number;
  y: number;
}

const GRID_SPACING = 32;
const VIEWBOX_PAD = 64;

function layoutNodes(nodes: readonly GraphReadyTopologyNode[]): NodeLayout[] {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const n = sorted.length;
  if (n === 0) return [];
  const ringSize = n <= 12 ? n : Math.ceil(Math.sqrt(n) * 2);
  const baseRadius = Math.max(140, 28 * ringSize);
  const out: NodeLayout[] = [];
  for (let i = 0; i < n; i++) {
    const ringIndex = Math.floor(i / ringSize);
    const slot = i % ringSize;
    const slotsThisRing = Math.min(ringSize, n - ringIndex * ringSize);
    const r = baseRadius + ringIndex * 110;
    const angle = (2 * Math.PI * slot) / slotsThisRing - Math.PI / 2;
    out.push({
      node: sorted[i],
      family: familyOf(sorted[i]),
      x: Math.round(r * Math.cos(angle)),
      y: Math.round(r * Math.sin(angle)),
    });
  }
  return out;
}

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

interface BlueprintGridProps {
  vbX: number;
  vbY: number;
  vbW: number;
  vbH: number;
}

function BlueprintGrid({ vbX, vbY, vbW, vbH }: BlueprintGridProps): JSX.Element {
  const lines: JSX.Element[] = [];
  const startX = Math.floor(vbX / GRID_SPACING) * GRID_SPACING;
  const startY = Math.floor(vbY / GRID_SPACING) * GRID_SPACING;
  for (let x = startX; x <= vbX + vbW; x += GRID_SPACING) {
    lines.push(
      <line
        key={`gx${x}`}
        className="bt-grid-line"
        x1={x}
        y1={vbY}
        x2={x}
        y2={vbY + vbH}
      />,
    );
  }
  for (let y = startY; y <= vbY + vbH; y += GRID_SPACING) {
    lines.push(
      <line
        key={`gy${y}`}
        className="bt-grid-line"
        x1={vbX}
        y1={y}
        x2={vbX + vbW}
        y2={y}
      />,
    );
  }
  return <g aria-hidden="true">{lines}</g>;
}

interface GlyphProps {
  layout: NodeLayout;
  band: DensityBand;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  onInspectIntent: (nodeId: string) => void;
}

function Glyph({
  layout,
  band,
  selected,
  onSelect,
  onInspectIntent,
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

  if (band === "dot") {
    // V1BL-A — graphite fill when idle, cyan only when selected.
    // Drops the green "soldier" look on high-density scenarios.
    return (
      <g
        className="bt-node"
        transform={`translate(${x} ${y})`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        data-testid={`bt-node-${node.id}`}
        data-density="dot"
      >
        <circle
          className="bt-node-dot"
          r={selected ? 12 : 8}
          fill={selected ? "var(--topo-cyan)" : "var(--topo-ink-2)"}
          stroke="var(--topo-line-2)"
          strokeWidth={selected ? 1.5 : 0.5}
        />
        {selected && <circle className="bt-node-focus-ring" r={16} />}
      </g>
    );
  }

  const showFaceplate = band === "full" || band === "faceplate";
  const showLabel = band === "full";

  return (
    <g
      className="bt-node"
      transform={`translate(${x} ${y})`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-testid={`bt-node-${node.id}`}
      data-density={band}
      data-family={family}
    >
      <rect
        className="bt-node-state-ring"
        x={-frame.w / 2 - 4}
        y={-frame.h / 2 - 4}
        width={frame.w + 8}
        height={frame.h + 8}
        rx={frame.rx + 2}
        stroke={stateRingColor("ok")}
      />
      <rect
        className="bt-node-frame"
        x={-frame.w / 2}
        y={-frame.h / 2}
        width={frame.w}
        height={frame.h}
        rx={frame.rx}
      />
      {showFaceplate && (
        <rect
          className="bt-node-faceplate"
          x={-frame.w / 2 + 6}
          y={frame.h / 2 - 7}
          width={frame.w - 12}
          height={3}
        />
      )}
      <text className="bt-node-family-code" x={0} y={0}>
        {family}
      </text>
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
}

function Edge({ edge, from, to, active }: EdgeProps): JSX.Element {
  return (
    <line
      className={active ? "bt-edge is-active" : "bt-edge"}
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      data-testid={`bt-edge-${edge.id}`}
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

interface ViewTransform {
  tx: number;
  ty: number;
  scale: number;
}

const IDENTITY_TRANSFORM: ViewTransform = { tx: 0, ty: 0, scale: 1 };

export function BlueprintTopologyCanvas({
  view,
  dataSource,
  onInspect,
  inspectingNodeId,
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
  }, [view]);

  const layouts = useMemo(() => layoutNodes(view.nodes), [view.nodes]);
  const layoutById = useMemo(() => {
    const m = new Map<string, NodeLayout>();
    for (const l of layouts) m.set(l.node.id, l);
    return m;
  }, [layouts]);

  const band = useMemo(() => pickDensityBand(layouts.length), [layouts.length]);
  const vb = useMemo(() => viewboxOf(layouts), [layouts]);

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

  const onSelect = useCallback((nodeId: string): void => {
    setSelectedId((curr) => (curr === nodeId ? null : nodeId));
  }, []);

  const clearSelection = useCallback((): void => {
    setSelectedId(null);
  }, []);

  // ── V1BL-B pan / zoom handlers ─────────────────────────────────

  const resetView = useCallback((): void => {
    setTransform(IDENTITY_TRANSFORM);
  }, []);

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

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>): void => {
      e.preventDefault();
      const ptr = screenToViewbox(e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      setTransform((t) => {
        const ns = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, t.scale * factor));
        if (ns === t.scale) return t;
        if (!ptr) {
          // No reliable pointer mapping — fall back to scaling in place.
          return { ...t, scale: ns };
        }
        const k = ns / t.scale;
        return {
          tx: ptr.x - (ptr.x - t.tx) * k,
          ty: ptr.y - (ptr.y - t.ty) * k,
          scale: ns,
        };
      });
    },
    [screenToViewbox],
  );

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
        setTransform((t) => ({
          ...t,
          tx: drag.startTx + dx * rx,
          ty: drag.startTy + dy * ry,
        }));
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

  const rootRef = useRef<HTMLElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

  // V1BL — position the floating passport near the selected glyph in
  // canvas-wrap coords, using the V1BJ edge-aware placement helper.
  // V1BL-B — recompute on every transform change so the passport
  // tracks pan and zoom.
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
  }, [selectedId, view, band, transform]);

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

  const envName =
    active?.name ?? view.environment_id ?? "(no active environment)";
  const scenarioId =
    (active?.lab_payload as { scenario_id?: string } | undefined)?.scenario_id ??
    null;
  const provenance = active?.provenance ?? null;
  const provenanceLabel = provenance ?? dataSource;

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
      <header className="bt-header" data-testid="bt-header">
        <span className="bt-header-name">{envName}</span>
        {scenarioId && (
          <span className="bt-header-pair">
            <span>scenario</span>
            <strong>{scenarioId}</strong>
          </span>
        )}
        <span className="bt-header-pair">
          <span>nodes</span>
          <strong>{view.nodes.length}</strong>
        </span>
        <span className="bt-header-pair">
          <span>links</span>
          <strong>{view.edges.length}</strong>
        </span>
        <span className="bt-header-pair">
          <span>density</span>
          <strong>{band}</strong>
        </span>
        <span
          className="bt-header-prov"
          data-prov={provenanceLabel}
          data-testid="bt-header-prov"
        >
          {provenanceLabel}
        </span>
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
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-testid="bt-svg"
        >
          <g
            transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
            data-testid="bt-transform-root"
          >
            <BlueprintGrid vbX={vb.x} vbY={vb.y} vbW={vb.w} vbH={vb.h} />

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
                />
              ))}
            </g>
          </g>
        </svg>

        {/* V1BL-B — canvas navigation strip */}
        <div className="bt-nav" data-testid="bt-nav" aria-label="Canvas navigation">
          <button
            type="button"
            className="bt-nav-btn"
            data-testid="bt-nav-fit"
            onClick={resetView}
            title="Fit graph to viewport"
          >
            Fit
          </button>
          <button
            type="button"
            className="bt-nav-btn"
            data-testid="bt-nav-reset"
            onClick={resetView}
            title="Reset to default view"
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

            {selectedPassport && (
              <div
                className="bt-passport-hw"
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
          </div>
        )}
      </div>
    </section>
  );
}
