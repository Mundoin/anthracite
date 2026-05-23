/**
 * Hardware Kit Preview — runtime proof for stage V1BE.
 *
 * Mounts the ported topology hardware kit in a real Anthracite Babylon
 * scene. Lets an operator step through every profile, orbit the camera,
 * pick zones, and read selected mesh metadata in an inspector pane.
 *
 * Accessed via the `?preview=hardware-kit` URL parameter (see App.tsx).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  AllProfiles,
  buildAllModels,
  buildMaterials,
  readZone,
  type BuiltModel,
  type HardwareProfile,
  type TelemetryState,
  type ZoneTag,
} from "../topology/hardware";

import "./HardwareKitPreview.css";

const TELEMETRY_STATES: TelemetryState[] = [
  "up",
  "warning",
  "critical",
  "down",
  "unknown",
];

interface SceneHandles {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
  models: Record<string, BuiltModel>;
  highlight: HighlightLayer;
  dispose: () => void;
}

function framingRadius(profile: HardwareProfile): number {
  const { w, h, d } = profile.dims;
  const max = Math.max(w, h, d);
  return (max / 100) * 1.65 + 0.5;
}

export function HardwareKitPreview(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const [activeId, setActiveId] = useState<string>(AllProfiles[0].id);
  const [telemetry, setTelemetry] = useState<TelemetryState>("up");
  const [pickedZone, setPickedZone] = useState<ZoneTag | null>(null);
  const [profileCount, setProfileCount] = useState<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.902, 0.929, 0.945, 1);
    scene.ambientColor = new Color3(0.40, 0.42, 0.45);

    const initialProfile =
      AllProfiles.find((p) => p.id === activeId) ?? AllProfiles[0];
    const camera = new ArcRotateCamera(
      "kit-cam",
      -Math.PI / 2,
      1.05,
      framingRadius(initialProfile),
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
      "kit-hemi",
      new Vector3(0, 1, 0),
      scene,
    );
    hemi.intensity = 0.55;
    hemi.diffuse = new Color3(0.90, 0.93, 0.96);
    hemi.groundColor = new Color3(0.55, 0.58, 0.60);

    const dir = new DirectionalLight(
      "kit-dir",
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
    const models = buildAllModels(scene, mats, { shadowGenerator });

    setProfileCount(Object.keys(models).length);

    const highlight = new HighlightLayer("kit-highlight", scene, {
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

    const initial = models[initialProfile.id];
    if (initial) initial.root.setEnabled(true);

    engine.runRenderLoop(() => scene.render());
    const handleResize = (): void => engine.resize();
    window.addEventListener("resize", handleResize);

    sceneRef.current = {
      engine,
      scene,
      camera,
      models,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    for (const id of Object.keys(handles.models)) {
      handles.models[id].root.setEnabled(id === activeId);
    }
    const profile = AllProfiles.find((p) => p.id === activeId);
    if (profile) {
      handles.camera.radius = framingRadius(profile);
    }
    handles.highlight.removeAllMeshes();
    setPickedZone(null);
  }, [activeId]);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    const active = handles.models[activeId];
    if (active) active.setTelemetry(telemetry);
  }, [telemetry, activeId]);

  const onSelectProfile = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      setActiveId(e.target.value);
    },
    [],
  );

  const groupedProfiles = useMemo(() => {
    const buckets: Record<string, HardwareProfile[]> = {
      switch: [],
      router: [],
      firewall: [],
      support: [],
      unknown: [],
    };
    for (const p of AllProfiles) buckets[p.family].push(p);
    return buckets;
  }, []);

  const activeProfile = AllProfiles.find((p) => p.id === activeId);

  return (
    <div className="hardware-kit-preview">
      <header className="hkp-header">
        <div className="hkp-title">
          <span className="hkp-stamp">ANTHRACITE · V1BE</span>
          <h1>Hardware Model Kit Preview</h1>
        </div>
        <div className="hkp-meta">
          profiles loaded: <strong>{profileCount}</strong> · scene scale 1u = 100mm
        </div>
      </header>

      <div className="hkp-body">
        <aside className="hkp-controls">
          <label className="hkp-field">
            <span>profile</span>
            <select value={activeId} onChange={onSelectProfile}>
              {Object.entries(groupedProfiles).map(([family, profiles]) => (
                <optgroup key={family} label={family}>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <fieldset className="hkp-field hkp-telemetry">
            <legend>telemetry</legend>
            {TELEMETRY_STATES.map((s) => (
              <label key={s} className={telemetry === s ? "active" : ""}>
                <input
                  type="radio"
                  name="telemetry"
                  value={s}
                  checked={telemetry === s}
                  onChange={() => setTelemetry(s)}
                />
                {s}
              </label>
            ))}
          </fieldset>

          {activeProfile && (
            <div className="hkp-profile-info">
              <div className="hkp-row">
                <span>family</span>
                <strong>{activeProfile.family}</strong>
              </div>
              <div className="hkp-row">
                <span>vendor · model</span>
                <strong>
                  {activeProfile.vendor} · {activeProfile.model}
                </strong>
              </div>
              <div className="hkp-row">
                <span>dims (mm)</span>
                <strong>
                  {activeProfile.dims.w} × {activeProfile.dims.h} ×{" "}
                  {activeProfile.dims.d}
                </strong>
              </div>
              {activeProfile.rackUnits && (
                <div className="hkp-row">
                  <span>rack units</span>
                  <strong>{activeProfile.rackUnits}U</strong>
                </div>
              )}
              <div className="hkp-row">
                <span>finish</span>
                <strong>{activeProfile.finish}</strong>
              </div>
              {activeProfile.virtual && (
                <div className="hkp-row hkp-virtual">virtual appliance</div>
              )}
            </div>
          )}
        </aside>

        <main className="hkp-canvas-wrap">
          <canvas ref={canvasRef} className="hkp-canvas" />
        </main>

        <aside className="hkp-inspector">
          <h2>Inspector</h2>
          {pickedZone ? (
            <div className="hkp-pick">
              <div className="hkp-pick-id">
                {pickedZone.modelId}.{pickedZone.kind}.{pickedZone.index}
              </div>
              <div className="hkp-row">
                <span>modelId</span>
                <strong>{pickedZone.modelId}</strong>
              </div>
              <div className="hkp-row">
                <span>zone kind</span>
                <strong>{pickedZone.kind}</strong>
              </div>
              <div className="hkp-row">
                <span>index</span>
                <strong>{pickedZone.index}</strong>
              </div>
              {pickedZone.kind === "port" && (
                <div className="hkp-row hkp-port-type">
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
            </div>
          ) : (
            <div className="hkp-empty">click any zone on the model</div>
          )}
        </aside>
      </div>

      <footer className="hkp-footer">
        <span>mesh ID format: <code>&lt;modelId&gt;.&lt;zoneKind&gt;.&lt;index&gt;</code></span>
        <span>example: <code>access48.port.17</code></span>
        <span>doctrine: V1BD · 10-kind taxonomy</span>
      </footer>
    </div>
  );
}
