/**
 * Hardware Inspect Scene — V1BH.
 *
 * Focused single-profile Babylon scene that the inspect receiver mounts
 * after an inspect intent arrives. This module owns every
 * `@babylonjs/core` import, so the receiver and the rest of the
 * Topology mode stay Babylon-free at parse time.
 *
 * Scene scale, camera, lights, shadow, picking — pulled from the
 * same recipe as `src/preview/HardwareKitPreview.tsx` but trimmed to
 * a single profile + a smaller pick callout suitable for an inline
 * inspection over the topology canvas.
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

function framingRadius(profile: HardwareProfile): number {
  const { w, h, d } = profile.dims;
  const max = Math.max(w, h, d);
  return (max / 100) * 1.65 + 0.5;
}

export function HardwareInspectScene({
  intent,
  onClose,
}: HardwareInspectSceneProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const [pickedZone, setPickedZone] = useState<ZoneTag | null>(null);

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
        highlight.removeAllMeshes();
        return;
      }
      const zone = readZone(pick.pickedMesh);
      if (!zone) {
        setPickedZone(null);
        highlight.removeAllMeshes();
        return;
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
      <div className="his-error">
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
        <span className="his-label">{intent.label}</span>
        <span className="his-pair">
          <span>family</span>
          <strong>{intent.family}</strong>
        </span>
        <span className="his-pair">
          <span>profile</span>
          <strong data-testid="his-profile-id">{intent.profileId}</strong>
        </span>
        <span className="his-pair">
          <span>model</span>
          <strong>
            {profile.vendor} · {profile.model}
          </strong>
        </span>
      </header>

      <div className="his-canvas-wrap">
        <canvas ref={canvasRef} className="his-canvas" />
      </div>

      <aside className="his-pick" data-testid="his-pick">
        <h3>Picked mesh</h3>
        {pickedZone ? (
          <>
            <div className="his-pick-id">
              {pickedZone.modelId}.{pickedZone.kind}.{pickedZone.index}
            </div>
            <div className="his-row">
              <span>modelId</span>
              <strong>{pickedZone.modelId}</strong>
            </div>
            <div className="his-row">
              <span>zone kind</span>
              <strong>{pickedZone.kind}</strong>
            </div>
            <div className="his-row">
              <span>index</span>
              <strong>{pickedZone.index}</strong>
            </div>
            {pickedZone.kind === "port" && (
              <div className="his-row">
                <span>port type</span>
                <strong>
                  {pickedZone.index >= 2000
                    ? "QSFP"
                    : pickedZone.index >= 1000
                      ? "SFP"
                      : "RJ45"}
                </strong>
              </div>
            )}
          </>
        ) : (
          <div className="his-empty">click any port / module / LED</div>
        )}
      </aside>
    </div>
  );
}
