/**
 * Procedural Babylon model builder.
 *
 * Ported from design-review/anthracite-topology-hardware-model-kit-v0/src/buildHardwareModel.ts
 * in stage V1BE. Real ES imports replace window.Anthracite* globals;
 * Babylon types are imported from '@babylonjs/core' rather than declared
 * via the `BABYLON.*` namespace.
 *
 * Scene scale: 1 unit = 100 mm.
 */

import {
  DynamicTexture,
  type AbstractMesh,
  MeshBuilder,
  type Scene,
  type ShadowGenerator,
  StandardMaterial,
  Color3,
  TransformNode,
} from "@babylonjs/core";

import type { HardwareMaterials } from "./materials";
import { tagZone } from "./pickableZones";
import { demoTelemetry } from "./telemetryAdapter";
import type {
  BuiltModel,
  FaceplateItem,
  HardwareProfile,
  TelemetryState,
  ZoneKind,
} from "./types";

const MM = 1 / 100; // mm → scene units
const FACE_EPS = 0.0015;

interface BuildContext {
  scene: Scene;
  profile: HardwareProfile;
  mats: HardwareMaterials;
  parent: TransformNode;
  pickables: AbstractMesh[];
  zoneMap: Map<string, { kind: ZoneKind; index: number }>;
}

function countZones(
  zoneMap: Map<string, { kind: ZoneKind; index: number }>,
  kind: ZoneKind,
): number {
  let n = 0;
  for (const v of zoneMap.values()) if (v.kind === kind) n++;
  return n;
}

function countPortsInRange(
  zoneMap: Map<string, { kind: ZoneKind; index: number }>,
  min: number,
  maxExclusive: number,
): number {
  let n = 0;
  for (const v of zoneMap.values()) {
    if (v.kind === "port" && v.index >= min && v.index < maxExclusive) n++;
  }
  return n;
}

function textPlane(
  scene: Scene,
  name: string,
  text: string[],
  widthMm: number,
  heightMm: number,
  opts: { bg?: string; fg?: string; align?: "left" | "center"; cyan?: boolean } = {},
): AbstractMesh {
  const px = (mm: number): number => Math.max(32, Math.round(mm * 12));
  const TW = px(widthMm);
  const TH = px(heightMm);
  const dt = new DynamicTexture(
    `tex.${name}`,
    { width: TW, height: TH },
    scene,
    true,
  );
  // NullEngine (used in tests) returns null from getContext — geometry
  // still builds, only the text raster is skipped. Real WebGL contexts
  // hand back a 2D canvas context as expected.
  const ctx = dt.getContext() as CanvasRenderingContext2D | null;
  if (ctx) {
    ctx.fillStyle = opts.bg ?? (opts.cyan ? "#D3E6EE" : "#FAFCFD");
    ctx.fillRect(0, 0, TW, TH);
    ctx.font = `${Math.floor((TH / Math.max(2, text.length)) * 0.55)}px "Cascadia Mono", Consolas, monospace`;
    ctx.fillStyle = opts.fg ?? (opts.cyan ? "#074C6E" : "#0E1E2C");
    ctx.textBaseline = "middle";
    const lineH = TH / Math.max(1, text.length);
    for (let i = 0; i < text.length; i++) {
      const y = lineH * (i + 0.5);
      if (opts.align === "center") {
        ctx.textAlign = "center";
        ctx.fillText(text[i], TW / 2, y);
      } else {
        ctx.textAlign = "left";
        ctx.fillText(text[i], 8, y);
      }
    }
    dt.update();
  }

  const mat = new StandardMaterial(`mat.${name}`, scene);
  mat.diffuseTexture = dt;
  mat.specularColor = new Color3(0.05, 0.05, 0.05);
  mat.emissiveColor = new Color3(0.05, 0.05, 0.05);
  mat.backFaceCulling = false;

  const plane = MeshBuilder.CreatePlane(
    name,
    { width: widthMm * MM, height: heightMm * MM },
    scene,
  );
  plane.material = mat;
  plane.isPickable = false;
  return plane;
}

function tag(
  ctx: BuildContext,
  mesh: AbstractMesh,
  kind: ZoneKind,
  index: number,
): void {
  tagZone(mesh, ctx.profile.id, kind, index);
  ctx.pickables.push(mesh);
  ctx.zoneMap.set(mesh.id, { kind, index });
}

function buildItem(ctx: BuildContext, item: FaceplateItem): void {
  const w = ctx.profile.dims.w;
  const h = ctx.profile.dims.h;
  const mapX = (x: number, itemW: number): number =>
    (x + itemW / 2 - w / 2) * MM;
  const mapY = (y: number, itemH: number): number =>
    (h / 2 - (y + itemH / 2)) * MM;
  const faceZ = (ctx.profile.dims.d / 2) * MM + FACE_EPS;
  const { scene, mats, parent } = ctx;

  switch (item.kind) {
    case "portGrid": {
      for (let r = 0; r < item.rows; r++) {
        for (let c = 0; c < item.cols; c++) {
          const idx = r * item.cols + c;
          const px = item.x + c * item.pitchX;
          const py = item.y + r * item.pitchY;
          const box = MeshBuilder.CreateBox(
            `port.${idx}`,
            { width: item.portW * MM, height: item.portH * MM, depth: 0.006 },
            scene,
          );
          box.parent = parent;
          box.position.x = mapX(px, item.portW);
          box.position.y = mapY(py, item.portH);
          box.position.z = faceZ - 0.003;
          box.material = mats.portCavity;
          tag(ctx, box, "port", idx);
        }
      }
      break;
    }
    case "sfpRow": {
      // SFP range starts at 1000; offset by existing SFP zones so multiple
      // sfpRow items in one profile do not collide on mesh IDs.
      const base = 1000 + countPortsInRange(ctx.zoneMap, 1000, 2000);
      for (let i = 0; i < item.n; i++) {
        const cageW = 13.4;
        const cageH = 8.5;
        const px = item.x + i * item.pitchX;
        const box = MeshBuilder.CreateBox(
          `sfp.${i}`,
          { width: cageW * MM, height: cageH * MM, depth: 0.012 },
          scene,
        );
        box.parent = parent;
        box.position.x = mapX(px, cageW);
        box.position.y = mapY(item.y, cageH);
        box.position.z = faceZ - 0.006;
        box.material = mats.bayOpening;
        tag(ctx, box, "port", base + i);
      }
      break;
    }
    case "qsfpRow": {
      // QSFP range starts at 2000; offset by existing QSFP zones.
      const base = 2000 + countPortsInRange(ctx.zoneMap, 2000, 3000);
      for (let i = 0; i < item.n; i++) {
        const cageW = 18.4;
        const cageH = 8.5;
        const px = item.x + i * item.pitchX;
        const box = MeshBuilder.CreateBox(
          `qsfp.${i}`,
          { width: cageW * MM, height: cageH * MM, depth: 0.014 },
          scene,
        );
        box.parent = parent;
        box.position.x = mapX(px, cageW);
        box.position.y = mapY(item.y, cageH);
        box.position.z = faceZ - 0.007;
        box.material = mats.bayOpening;
        tag(ctx, box, "port", base + i);
      }
      break;
    }
    case "ledBank": {
      for (let i = 0; i < item.labels.length; i++) {
        const led = MeshBuilder.CreateCylinder(
          `led.${i}`,
          { diameter: 0.003, height: 0.002, tessellation: 16 },
          scene,
        );
        led.parent = parent;
        led.position.x = mapX(item.x + i * 4, 2);
        led.position.y = mapY(item.y, 2);
        led.position.z = faceZ;
        led.rotation.x = Math.PI / 2;
        led.material = mats.ledIdle;
        tag(ctx, led, "led", i);
      }
      break;
    }
    case "screen": {
      const screen = textPlane(
        scene,
        `screen.${item.idPrefix}`,
        item.text ?? ["screen"],
        item.w,
        item.h,
        { cyan: true, align: "left" },
      );
      screen.parent = parent;
      screen.position.x = mapX(item.x, item.w);
      screen.position.y = mapY(item.y, item.h);
      screen.position.z = faceZ + 0.001;
      const screenIdx = countZones(ctx.zoneMap, "screen");
      tag(ctx, screen, "screen", screenIdx);
      const frame = MeshBuilder.CreateBox(
        `screen.${item.idPrefix}.frame`,
        { width: (item.w + 2) * MM, height: (item.h + 2) * MM, depth: 0.004 },
        scene,
      );
      frame.parent = parent;
      frame.position.x = screen.position.x;
      frame.position.y = screen.position.y;
      frame.position.z = faceZ - 0.001;
      frame.material = mats.bayOpening;
      frame.isPickable = false;
      break;
    }
    case "bay": {
      const bay = MeshBuilder.CreateBox(
        `bay.${item.index}`,
        { width: item.w * MM, height: item.h * MM, depth: 0.020 },
        scene,
      );
      bay.parent = parent;
      bay.position.x = mapX(item.x, item.w);
      bay.position.y = mapY(item.y, item.h);
      bay.position.z = faceZ - 0.010;
      bay.material = item.populated ? mats.moduleBody : mats.bayOpening;
      tag(ctx, bay, "bay", item.index);
      if (item.populated) {
        const strip = MeshBuilder.CreateBox(
          `bay.${item.index}.card`,
          { width: (item.w - 4) * MM, height: 0.005, depth: 0.001 },
          scene,
        );
        strip.parent = parent;
        strip.position.x = bay.position.x;
        strip.position.y = bay.position.y - (item.h / 2 - 6) * MM;
        strip.position.z = faceZ + 0.0005;
        strip.material = mats.cyan;
        strip.isPickable = false;
      }
      break;
    }
    case "blade": {
      const blade = MeshBuilder.CreateBox(
        `blade.${item.index}`,
        { width: item.w * MM, height: item.h * MM, depth: 0.025 },
        scene,
      );
      blade.parent = parent;
      blade.position.x = mapX(item.x, item.w);
      blade.position.y = mapY(item.y, item.h);
      blade.position.z = faceZ - 0.012;
      blade.material = item.populated ? mats.moduleBody : mats.bayOpening;
      tag(ctx, blade, "blade", item.index);
      if (item.populated) {
        for (let k = 0; k < 2; k++) {
          const led = MeshBuilder.CreateCylinder(
            `blade.${item.index}.led.${k}`,
            { diameter: 0.0025, height: 0.001, tessellation: 12 },
            scene,
          );
          led.parent = parent;
          led.position.x = blade.position.x;
          led.position.y = blade.position.y + (item.h / 2 - 8 - k * 4) * MM;
          led.position.z = faceZ + 0.0005;
          led.rotation.x = Math.PI / 2;
          led.material = k === 0 ? mats.ledOk : mats.cyan;
          led.isPickable = false;
        }
      }
      break;
    }
    case "psu": {
      const psu = MeshBuilder.CreateBox(
        `psu.${item.index}`,
        { width: item.w * MM, height: item.h * MM, depth: 0.030 },
        scene,
      );
      psu.parent = parent;
      psu.position.x = mapX(item.x, item.w);
      psu.position.y = mapY(item.y, item.h);
      psu.position.z = faceZ - 0.015;
      psu.material = mats.moduleBody;
      tag(ctx, psu, "psu", item.index);
      break;
    }
    case "fan": {
      const fan = MeshBuilder.CreateBox(
        `fan.${item.index}`,
        { width: item.w * MM, height: item.h * MM, depth: 0.020 },
        scene,
      );
      fan.parent = parent;
      fan.position.x = mapX(item.x, item.w);
      fan.position.y = mapY(item.y, item.h);
      fan.position.z = faceZ - 0.010;
      fan.material = mats.bayOpening;
      tag(ctx, fan, "fan", item.index);
      const hub = MeshBuilder.CreateCylinder(
        `fan.${item.index}.hub`,
        {
          diameter: Math.min(item.w, item.h) * 0.6 * MM,
          height: 0.001,
          tessellation: 16,
        },
        scene,
      );
      hub.parent = parent;
      hub.position.x = fan.position.x;
      hub.position.y = fan.position.y;
      hub.position.z = faceZ + 0.0005;
      hub.rotation.x = Math.PI / 2;
      hub.material = mats.moduleBody;
      hub.isPickable = false;
      break;
    }
    case "label": {
      const labelW = Math.min(item.text.length * 2.8, ctx.profile.dims.w - 12);
      const labelH = Math.max(item.size ?? 4, 4);
      const plane = textPlane(
        scene,
        `label.${item.x}.${item.y}`,
        [item.text],
        labelW,
        labelH,
        {
          bg: item.vendorPlate ? "#FAFCFD" : "transparent",
          fg: "#0E1E2C",
          align: "left",
        },
      );
      plane.parent = parent;
      plane.position.x = mapX(item.x, labelW);
      plane.position.y = mapY(item.y, labelH);
      plane.position.z = faceZ + 0.0005;
      if (item.vendorPlate) {
        plane.isPickable = false;
      } else {
        const labelIdx = countZones(ctx.zoneMap, "label");
        tag(ctx, plane, "label", labelIdx);
      }
      break;
    }
    case "ventStrip": {
      const v = MeshBuilder.CreateBox(
        `vent.${item.x}`,
        { width: item.w * MM, height: item.h * MM, depth: 0.004 },
        scene,
      );
      v.parent = parent;
      v.position.x = mapX(item.x, item.w);
      v.position.y = mapY(item.y, item.h);
      v.position.z = faceZ - 0.002;
      v.material = mats.bayOpening;
      v.isPickable = false;
      break;
    }
  }
}

export interface BuildOptions {
  shadowGenerator?: ShadowGenerator;
}

export function buildHardwareModel(
  scene: Scene,
  profile: HardwareProfile,
  mats: HardwareMaterials,
  opts: BuildOptions = {},
): BuiltModel {
  const root = new TransformNode(`model.${profile.id}`, scene);
  const pickables: AbstractMesh[] = [];
  const zoneMap = new Map<string, { kind: ZoneKind; index: number }>();
  const ctx: BuildContext = { scene, profile, mats, parent: root, pickables, zoneMap };

  const chassis = MeshBuilder.CreateBox(
    `${profile.id}.chassis.0`,
    {
      width: profile.dims.w * MM,
      height: profile.dims.h * MM,
      depth: profile.dims.d * MM,
    },
    scene,
  );
  chassis.parent = root;
  chassis.material =
    profile.finish === "glass"
      ? mats.glass
      : profile.finish === "lightMetal"
        ? mats.lightMetal
        : mats.darkMetal;
  tagZone(chassis, profile.id, "chassis", 0);
  pickables.push(chassis);
  zoneMap.set(chassis.id, { kind: "chassis", index: 0 });

  if (opts.shadowGenerator) {
    opts.shadowGenerator.addShadowCaster(chassis);
    chassis.receiveShadows = true;
  }

  for (const item of profile.faceplate) {
    buildItem(ctx, item);
  }

  const ledMeshes = pickables.filter(
    (m) =>
      (m.metadata as { anthracite?: { kind?: ZoneKind } } | null | undefined)
        ?.anthracite?.kind === "led",
  );
  const portMeshes = pickables.filter(
    (m) =>
      (m.metadata as { anthracite?: { kind?: ZoneKind } } | null | undefined)
        ?.anthracite?.kind === "port",
  );

  const setTelemetry = (state: TelemetryState): void => {
    const t = demoTelemetry(profile.id, state);
    for (const led of ledMeshes) {
      const meta = led.metadata as { anthracite: { index: number } };
      const idx = meta.anthracite.index;
      const s = t.ledStates[idx] ?? "unknown";
      led.material =
        s === "up"
          ? mats.ledOk
          : s === "warning"
            ? mats.ledWarn
            : s === "down"
              ? mats.ledIdle
              : s === "critical"
                ? mats.ledCrit
                : mats.ledIdle;
    }
    for (const port of portMeshes) {
      const meta = port.metadata as { anthracite: { index: number } };
      const idx = meta.anthracite.index;
      port.material = t.portsUp.has(idx) ? mats.cyan : mats.portCavity;
    }
  };
  setTelemetry("up");

  return { profileId: profile.id, root, pickables, zoneMap, setTelemetry };
}
