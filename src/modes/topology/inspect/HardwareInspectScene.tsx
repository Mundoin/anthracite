/**
 * Hardware Inspect Scene — V1BH + V1BI polish.
 *
 * Focused single-profile Babylon scene that the inspect receiver mounts
 * after an inspect intent arrives. This module owns every
 * `@babylonjs/core` import, so the receiver and the rest of the
 * Topology mode stay Babylon-free at parse time.
 *
 * V1BI adds:
 *   - header chips for trigger + family with cyan accent strip
 *   - corner frame brackets around the canvas (drafting frame)
 *   - orbit hint strip
 *   - floating leader-line callout for picked meshes (anchored to
 *     last pointer position over the canvas)
 */

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  HighlightLayer,
  PointerEventTypes,
  Scene,
  ShadowGenerator,
  Vector3,
  type Mesh,
  type PointerInfo,
} from "@babylonjs/core";

import {
  buildHardwareModel,
  buildMaterials,
  findProfile,
  readZone,
  type BuiltModel,
  type HardwareProfile,
  type ZoneTag,
} from "../../../topology/hardware";
import type { HardwareInspectIntent } from "../blueprint/hardwarePassport";

import "./HardwareInspectScene.css";

export interface HardwareInspectSceneProps {
  readonly intent: HardwareInspectIntent;
  readonly onClose: () => void;
}

interface SceneHandles {
  engine: Engine;
  scene: Scene;
  built: BuiltModel | null;
  highlight: HighlightLayer;
  dispose: () => void;
}

interface CalloutAnchor {
  /** Position relative to the canvas wrap, in pixels. */
  x: number;
  y: number;
}

function framingRadius(profile: HardwareProfile): number {
  const { w, h, d } = profile.dims;
  const max = Math.max(w, h, d);
  return (max / 100) * 1.65 + 0.5;
}

function portTypeFor(index: number): string {
  if (index >= 2000) return "QSFP";
  if (index >= 1000) return "SFP";
  return "RJ45";
}

export function HardwareInspectScene({
  intent,
  onClose,
}: HardwareInspectSceneProps): JSX.Element {
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const [pickedZone, setPickedZone] = useState<ZoneTag | null>(null);
  const [calloutAnchor, setCalloutAnchor] = useState<CalloutAnchor | null>(null);

  const profile = findProfile(intent.profileId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile) return;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.902, 0.929, 0.945, 1);
    scene.ambientColor = new Color3(0.40, 0.42, 0.45);

    const camera = new ArcRotateCamera(
      "inspect-cam",
      -Math.PI / 2,
      1.05,
      framingRadius(profile),
      Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 80;
    camera.lowerRadiusLimit = 0.5;
    camera.upperRadiusLimit = 6.0;
    camera.minZ = 0.05;
    camera.maxZ = 50;

    const hemi = new HemisphericLight(
      "inspect-hemi",
      new Vector3(0, 1, 0),
      scene,
    );
    hemi.intensity = 0.55;
    hemi.diffuse = new Color3(0.90, 0.93, 0.96);
    hemi.groundColor = new Color3(0.55, 0.58, 0.60);

    const dir = new DirectionalLight(
      "inspect-dir",
      new Vector3(-0.4, -1.0, -0.5),
      scene,
    );
    dir.position = new Vector3(2, 4, 2);
    dir.intensity = 0.95;

    const shadowGenerator = new ShadowGenerator(1024, dir);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    shadowGenerator.darkness = 0.55;

    const mats = buildMaterials(scene);
    const built = buildHardwareModel(scene, profile, mats, { shadowGenerator });
    built.root.setEnabled(true);
    built.setTelemetry("up");

    const highlight = new HighlightLayer("inspect-highlight", scene, {
      isStroke: true,
      mainTextureRatio: 1,
    });

    const onPointer = (evt: PointerInfo): void => {
      if (evt.type !== PointerEventTypes.POINTERPICK) return;
      const pick = evt.pickInfo;
      if (!pick || !pick.hit || !pick.pickedMesh) {
        setPickedZone(null);
        setCalloutAnchor(null);
        highlight.removeAllMeshes();
        return;
      }
      const zone = readZone(pick.pickedMesh);
      if (!zone) {
        setPickedZone(null);
        setCalloutAnchor(null);
        highlight.removeAllMeshes();
        return;
      }
      // Derive anchor from the pointer event, mapped into the canvas
      // wrap's coordinate space so the callout positions correctly
      // regardless of scroll / parent transforms.
      const wrap = canvasWrapRef.current;
      const pe = evt.event as PointerEvent | undefined;
      if (wrap && pe) {
        const rect = wrap.getBoundingClientRect();
        setCalloutAnchor({
          x: pe.clientX - rect.left,
          y: pe.clientY - rect.top,
        });
      }
      setPickedZone(zone);
      highlight.removeAllMeshes();
      highlight.addMesh(pick.pickedMesh as Mesh, Color3.FromHexString("#1B9FD6"));
    };
    scene.onPointerObservable.add(onPointer);

    engine.runRenderLoop(() => scene.render());
    const handleResize = (): void => engine.resize();
    window.addEventListener("resize", handleResize);

    sceneRef.current = {
      engine,
      scene,
      built,
      highlight,
      dispose: () => {
        window.removeEventListener("resize", handleResize);
        scene.dispose();
        engine.dispose();
      },
    };

    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [profile]);

  const onBack = useCallback((): void => {
    onClose();
  }, [onClose]);

  if (!profile) {
    return (
      <div className="his-error" data-testid="his-error">
        <header className="his-header">
          <button
            type="button"
            className="his-back"
            onClick={onBack}
            data-testid="his-back"
          >
            ◂ Back to map
          </button>
          <span className="his-title">Unknown profile</span>
        </header>
        <div className="his-empty">
          No hardware profile registered for id{" "}
          <code>{intent.profileId}</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="hardware-inspect-scene" data-testid="hardware-inspect-scene">
      <header className="his-header" data-testid="his-header">
        <button
          type="button"
          className="his-back"
          onClick={onBack}
          data-testid="his-back"
        >
          ◂ Back to map
        </button>
        <span className="his-label" data-testid="his-label">
          {intent.label}
        </span>
        <span className="his-chip" data-chip="family">
          <span>family</span>
          <strong>{intent.family}</strong>
        </span>
        <span className="his-chip" data-chip="profile">
          <span>profile</span>
          <strong data-testid="his-profile-id">{intent.profileId}</strong>
        </span>
        <span className="his-chip" data-chip="model">
          <span>model</span>
          <strong>
            {profile.vendor} · {profile.model}
          </strong>
        </span>
        <span
          className="his-chip his-chip--trigger"
          data-chip="trigger"
          data-testid="his-trigger-chip"
        >
          <span>opened via</span>
          <strong>{intent.trigger}</strong>
        </span>
      </header>

      <div
        ref={canvasWrapRef}
        className="his-canvas-wrap"
        data-testid="his-canvas-wrap"
      >
        <canvas ref={canvasRef} className="his-canvas" />

        {/* drafting frame — corner brackets that frame the inspection viewport */}
        <div className="his-frame" aria-hidden="true">
          <span className="his-frame-corner his-frame-corner--tl" />
          <span className="his-frame-corner his-frame-corner--tr" />
          <span className="his-frame-corner his-frame-corner--bl" />
          <span className="his-frame-corner his-frame-corner--br" />
        </div>

        {/* orbit hint — bottom strip with subtle iconography */}
        <div className="his-orbit-hint" data-testid="his-orbit-hint">
          <span>drag · orbit</span>
          <span className="his-sep">·</span>
          <span>scroll · zoom</span>
          <span className="his-sep">·</span>
          <span>click · pick zone</span>
        </div>

        {/* floating leader-line callout */}
        {pickedZone && calloutAnchor && (
          <PickCallout
            anchor={calloutAnchor}
            zone={pickedZone}
            profileId={profile.id}
          />
        )}
      </div>
    </div>
  );
}

interface PickCalloutProps {
  anchor: CalloutAnchor;
  zone: ZoneTag;
  profileId: string;
}

const CALLOUT_W = 240;
const CALLOUT_OFFSET = 36;

function PickCallout({ anchor, zone, profileId }: PickCalloutProps): JSX.Element {
  // place callout up-and-right of the pick by default; the wrap clips
  // overflow so even off-screen anchors collapse gracefully.
  const left = Math.max(8, anchor.x + CALLOUT_OFFSET);
  const top = Math.max(8, anchor.y - CALLOUT_OFFSET - 64);

  // leader line — two-segment path from anchor up to callout top
  // (using inline SVG so it composes with the wrap's overflow rules)
  const leaderHeight = Math.max(0, anchor.y - top);

  return (
    <div
      className="his-callout"
      data-testid="his-callout"
      style={{ left, top, width: CALLOUT_W }}
    >
      <svg
        className="his-callout-leader"
        style={{
          left: anchor.x - left,
          top: -leaderHeight + (top + 0),
          // anchor leader from callout top-left
          width: Math.max(4, Math.abs(anchor.x - left) + 4),
          height: leaderHeight + 4,
        }}
        aria-hidden="true"
      >
        <circle
          cx={anchor.x - left}
          cy={leaderHeight}
          r={6}
          className="his-callout-ring"
        />
        <line
          x1={anchor.x - left}
          y1={leaderHeight - 6}
          x2={0}
          y2={0}
          className="his-callout-line"
        />
      </svg>

      <div className="his-callout-strip" data-testid="his-callout-strip" />
      <div className="his-callout-id" data-testid="his-callout-id">
        {zone.modelId}.{zone.kind}.{zone.index}
      </div>
      <div className="his-callout-row">
        <span>zone kind</span>
        <strong>{zone.kind}</strong>
      </div>
      <div className="his-callout-row">
        <span>index</span>
        <strong>{zone.index}</strong>
      </div>
      {zone.kind === "port" && (
        <div className="his-callout-row">
          <span>port type</span>
          <strong>{portTypeFor(zone.index)}</strong>
        </div>
      )}
      <div className="his-callout-row his-callout-row--meta">
        <span>profile</span>
        <strong>{profileId}</strong>
      </div>
    </div>
  );
}
