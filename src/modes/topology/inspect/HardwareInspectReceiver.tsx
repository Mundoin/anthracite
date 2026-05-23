/**
 * Hardware Inspect Receiver — V1BH.
 *
 * Wraps the Blueprint topology canvas, swallows the V1BG inspect
 * intent, and lazy-loads the Babylon hardware scene when an inspect
 * begins. Critically: this file contains zero `@babylonjs/core`
 * imports. Babylon arrives in the bundle only after `React.lazy`
 * resolves `HardwareInspectScene` — which happens only after the
 * operator clicks `Inspect Hardware ▸` or double-clicks a node.
 *
 * Transition (240 ms cross-fade) follows the desk doctrine
 * `interaction-state-machine.md` FOCUSED → ORBIT lifecycle ordering
 * (see V1BD decision 5). Scene build is deferred to React.lazy +
 * Suspense; disposal happens on unmount after the reverse fade ends.
 */

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
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

export function HardwareInspectReceiver({
  canvasProps,
}: HardwareInspectReceiverProps): JSX.Element {
  const [intent, setIntent] = useState<HardwareInspectIntent | null>(null);
  const [phase, setPhase] = useState<Phase>("map");

  // Reset entire receiver when the underlying graph view changes — the
  // selected node may no longer exist.
  useEffect(() => {
    setIntent(null);
    setPhase("map");
  }, [canvasProps.view]);

  const onInspect = useCallback(
    (next: HardwareInspectIntent): void => {
      setIntent(next);
      setPhase("entering");
    },
    [],
  );

  // After the scene chunk resolves and renders, settle into the
  // steady "scene" phase. The "entering" → "scene" hop drives the
  // 240 ms opacity tween via CSS.
  useEffect(() => {
    if (phase !== "entering") return;
    const id = window.setTimeout(() => setPhase("scene"), TRANSITION_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const onClose = useCallback((): void => {
    setPhase("exiting");
  }, []);

  // After the reverse tween ends, unmount the scene so the engine
  // disposes (cleanup runs in HardwareInspectScene's useEffect return).
  useEffect(() => {
    if (phase !== "exiting") return;
    const id = window.setTimeout(() => {
      setIntent(null);
      setPhase("map");
    }, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const showScene = intent !== null;
  const mapOpacityClass = useMemo(() => {
    switch (phase) {
      case "map":
        return "hir-layer hir-layer--visible";
      case "entering":
        return "hir-layer hir-layer--fading-out";
      case "scene":
        return "hir-layer hir-layer--hidden";
      case "exiting":
        return "hir-layer hir-layer--fading-in";
    }
  }, [phase]);

  const sceneOpacityClass = useMemo(() => {
    switch (phase) {
      case "entering":
        return "hir-layer hir-layer--fading-in";
      case "scene":
        return "hir-layer hir-layer--visible";
      case "exiting":
        return "hir-layer hir-layer--fading-out";
      case "map":
        return "hir-layer hir-layer--hidden";
    }
  }, [phase]);

  return (
    <div
      className="hardware-inspect-receiver"
      data-testid="hardware-inspect-receiver"
      data-phase={phase}
    >
      <div className={mapOpacityClass} data-testid="hir-map-layer">
        <BlueprintTopologyCanvas {...canvasProps} onInspect={onInspect} />
      </div>

      {showScene && intent && (
        <div className={sceneOpacityClass} data-testid="hir-scene-layer">
          <Suspense fallback={<SceneFallback />}>
            <HardwareInspectScene intent={intent} onClose={onClose} />
          </Suspense>
        </div>
      )}

      <InspectionLockMarks
        phase={phase}
        anchor={intent?.anchor}
        viewport={intent?.viewport}
      />
    </div>
  );
}

function SceneFallback(): ReactNode {
  // V1BJ — choreographed loading state: drafting grid backdrop,
  // cyan accent strip, mono caps stencil. Reads as "loading
  // intentionally", not "broken".
  return (
    <div className="hir-fallback" data-testid="hir-fallback">
      <div className="hir-fallback-strip" />
      <div className="hir-fallback-stencil">loading hardware scene…</div>
    </div>
  );
}
