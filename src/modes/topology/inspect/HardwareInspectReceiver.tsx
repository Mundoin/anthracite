/**
 * Hardware Inspect Receiver — V1BH + V1BJ + V1BK.
 *
 * V1BK — split layout. The receiver renders the Blueprint canvas as
 * the main column. When an inspect intent arrives, a right-side bay
 * slides in (240 ms), mounting a lazy-loaded Babylon hardware scene.
 * `◂ Back to map` collapses the bay (280 ms) so the operator never
 * loses sight of the topology surface.
 *
 * Critically: this file contains zero `@babylonjs/core` imports.
 * Babylon arrives in the bundle only after `React.lazy` resolves
 * `HardwareInspectScene` — which happens only after the operator
 * clicks `Inspect Hardware ▸` or double-clicks a node.
 */

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import { BlueprintTopologyCanvas } from "../blueprint/BlueprintTopologyCanvas";
import type { BlueprintTopologyCanvasProps } from "../blueprint/BlueprintTopologyCanvas";
import type { HardwareInspectIntent } from "../blueprint/hardwarePassport";
import { InspectionLockMarks } from "./InspectionLockMarks";

import "./HardwareInspectReceiver.css";

// Lazy-loaded so the inspect scene + its Babylon imports drop out of
// the main shell bundle. The chunk is only fetched after the first
// inspect intent arrives.
const HardwareInspectScene = lazy(() =>
  import("./HardwareInspectScene").then((m) => ({
    default: m.HardwareInspectScene,
  })),
);

type Phase = "map" | "entering" | "scene" | "exiting";

const TRANSITION_MS = 240;
const EXIT_MS = 280;

export interface HardwareInspectReceiverProps {
  readonly canvasProps: Omit<BlueprintTopologyCanvasProps, "onInspect">;
}

type BayWidthMode = "compact" | "wide";

export function HardwareInspectReceiver({
  canvasProps,
}: HardwareInspectReceiverProps): JSX.Element {
  const [intent, setIntent] = useState<HardwareInspectIntent | null>(null);
  const [phase, setPhase] = useState<Phase>("map");
  const [bayWidth, setBayWidth] = useState<BayWidthMode>("wide");

  // Reset entire receiver when the underlying graph view changes — the
  // selected node may no longer exist.
  useEffect(() => {
    setIntent(null);
    setPhase("map");
  }, [canvasProps.view]);

  const onInspect = useCallback((next: HardwareInspectIntent): void => {
    setIntent(next);
    setPhase("entering");
  }, []);

  // After the bay slide-in finishes (or scene chunk resolves and
  // renders, whichever is later from a UX standpoint), settle into
  // the steady "scene" phase.
  useEffect(() => {
    if (phase !== "entering") return;
    const id = window.setTimeout(() => setPhase("scene"), TRANSITION_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const onClose = useCallback((): void => {
    setPhase("exiting");
  }, []);

  // After the reverse slide finishes, unmount the scene so the engine
  // disposes (cleanup runs in HardwareInspectScene's useEffect return).
  useEffect(() => {
    if (phase !== "exiting") return;
    const id = window.setTimeout(() => {
      setIntent(null);
      setPhase("map");
    }, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const bayState: "opening" | "open" | "closing" | "closed" =
    phase === "entering"
      ? "opening"
      : phase === "scene"
        ? "open"
        : phase === "exiting"
          ? "closing"
          : "closed";

  return (
    <div
      className="hardware-inspect-receiver"
      data-testid="hardware-inspect-receiver"
      data-phase={phase}
    >
      <div className="hir-map" data-testid="hir-map-layer">
        <BlueprintTopologyCanvas
          {...canvasProps}
          onInspect={onInspect}
          inspectingNodeId={intent?.nodeId ?? null}
        />
      </div>

      {intent && (
        <div
          className="hir-bay"
          data-testid="hir-bay"
          data-bay-open={bayState}
          data-bay-width={bayWidth}
          aria-live="polite"
        >
          <div className="hir-bay-inner" data-testid="hir-scene-layer">
            <Suspense fallback={<SceneFallback />}>
              <HardwareInspectScene
                intent={intent}
                onClose={onClose}
                widthMode={bayWidth}
                onChangeWidth={setBayWidth}
              />
            </Suspense>
            <InspectionLockMarks
              phase={phase}
              anchor={intent.anchor}
              viewport={intent.viewport}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SceneFallback(): ReactNode {
  // Choreographed loading: drafting grid backdrop, cyan accent strip,
  // mono caps stencil. Reads as "loading intentionally", not "broken".
  return (
    <div className="hir-fallback" data-testid="hir-fallback">
      <div className="hir-fallback-strip" />
      <div className="hir-fallback-stencil">loading hardware scene…</div>
    </div>
  );
}
