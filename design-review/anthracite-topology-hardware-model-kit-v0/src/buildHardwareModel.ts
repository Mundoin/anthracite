// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ NOTE FOR OCC IMPLEMENTERS                                                   │
// │ This file is the canonical TypeScript source. In the preview it is loaded   │
// │ via Babel-standalone with the `typescript` preset, which only strips type │
// │ annotations — it does not resolve ES module syntax. Cross-file linkage is  │
// │ therefore done through `window.Anthracite*` globals (see end of file).   │
// │ When integrating into a real bundler (Vite/esbuild/tsc), restore the       │
// │ `import` / `export` keywords as needed.                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

// Anthracite — Hardware Model Kit · generic model builder
//
// Takes a HardwareProfile (data) and produces actual Babylon meshes:
// chassis, faceplate fixtures, ports, LEDs, screens, bays, blades, PSUs,
// fans, vendor plates. Every clickable mesh is tagged via tagZone().
//
// Scene scale convention: 1 scene unit = 100 mm (i.e. meters). The whole
// rack-mounted device family thus sits ~0.5m wide.
declare const BABYLON: any;

const MM = 1 / 100;          // mm → scene units
const FACE_EPS = 0.0015;     // bump faceplate fixtures forward to avoid z-fighting

type Mats = ReturnType<typeof window.AnthraciteMaterials.buildMaterials>;

// ── tiny DynamicTexture text renderer ───────────────────────────────────────
function textPlane(
  scene: any, name: string, text: string[],
  widthMm: number, heightMm: number,
  opts: { bg?: string; fg?: string; align?: 'left' | 'center'; cyan?: boolean } = {}
): any {
  // texture resolution: keep it cheap — 12 px / mm
  const px = (mm: number) => Math.max(32, Math.round(mm * 12));
  const TW = px(widthMm), TH = px(heightMm);
  const dt = new BABYLON.DynamicTexture(`tex.${name}`, { width: TW, height: TH }, scene, true);
  const ctx = dt.getContext();
  ctx.fillStyle = opts.bg || (opts.cyan ? '#D3E6EE' : '#FAFCFD');
  ctx.fillRect(0, 0, TW, TH);
  ctx.font = `${Math.floor(TH / Math.max(2, text.length) * 0.55)}px "Cascadia Mono", Consolas, monospace`;
  ctx.fillStyle = opts.fg || (opts.cyan ? '#074C6E' : '#0E1E2C');
  ctx.textBaseline = 'middle';
  const lineH = TH / Math.max(1, text.length);
  for (let i = 0; i < text.length; i++) {
    const y = lineH * (i + 0.5);
    if (opts.align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(text[i], TW / 2, y);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(text[i], 8, y);
    }
  }
  dt.update();

  const mat = new BABYLON.StandardMaterial(`mat.${name}`, scene);
  mat.diffuseTexture = dt;
  mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  mat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  mat.backFaceCulling = false;

  const plane = BABYLON.MeshBuilder.CreatePlane(name, {
    width:  widthMm * MM,
    height: heightMm * MM,
  }, scene);
  plane.material = mat;
  plane.isPickable = false;
  return plane;
}

// ── build a single faceplate item ───────────────────────────────────────────
function buildItem(
  scene: any, item: FaceplateItem, profile: HardwareProfile, mats: Mats,
  parent: any, pickables: any[], zoneMap: Map<string, any>,
) {
  const w = profile.dims.w, h = profile.dims.h;

  // map mm-on-faceplate → scene coords (chassis centred at origin)
  const mapX = (x: number, itemW: number) => ((x + itemW / 2) - w / 2) * MM;
  const mapY = (y: number, itemH: number) => (h / 2 - (y + itemH / 2)) * MM;
  const faceZ = (profile.dims.d / 2) * MM + FACE_EPS;

  const tag = (mesh: any, kind: any, idx: number) => {
    window.AnthraciteZones.tagZone(mesh, profile.id, kind, idx);
    pickables.push(mesh);
    zoneMap.set(mesh.id, { kind, index: idx });
  };

  switch (item.kind) {
    case 'portGrid': {
      for (let r = 0; r < item.rows; r++) {
        for (let c = 0; c < item.cols; c++) {
          const idx = r * item.cols + c;
          const px = item.x + c * item.pitchX;
          const py = item.y + r * item.pitchY;
          const box = BABYLON.MeshBuilder.CreateBox(`port.${idx}`, {
            width: item.portW * MM, height: item.portH * MM, depth: 0.006,
          }, scene);
          box.parent = parent;
          box.position.x = mapX(px, item.portW);
          box.position.y = mapY(py, item.portH);
          box.position.z = faceZ - 0.003;
          box.material = mats.portCavity;
          tag(box, 'port', idx);
        }
      }
      break;
    }
    case 'sfpRow': {
      for (let i = 0; i < item.n; i++) {
        const cageW = 13.4, cageH = 8.5;
        const px = item.x + i * item.pitchX;
        const box = BABYLON.MeshBuilder.CreateBox(`sfp.${i}`, {
          width: cageW * MM, height: cageH * MM, depth: 0.012,
        }, scene);
        box.parent = parent;
        box.position.x = mapX(px, cageW);
        box.position.y = mapY(item.y, cageH);
        box.position.z = faceZ - 0.006;
        box.material = mats.bayOpening;
        tag(box, 'port', i + 1000);  // sfp ports indexed from 1000
      }
      break;
    }
    case 'qsfpRow': {
      for (let i = 0; i < item.n; i++) {
        const cageW = 18.4, cageH = 8.5;
        const px = item.x + i * item.pitchX;
        const box = BABYLON.MeshBuilder.CreateBox(`qsfp.${i}`, {
          width: cageW * MM, height: cageH * MM, depth: 0.014,
        }, scene);
        box.parent = parent;
        box.position.x = mapX(px, cageW);
        box.position.y = mapY(item.y, cageH);
        box.position.z = faceZ - 0.007;
        box.material = mats.bayOpening;
        tag(box, 'port', i + 2000);  // qsfp ports indexed from 2000
      }
      break;
    }
    case 'ledBank': {
      for (let i = 0; i < item.labels.length; i++) {
        const led = BABYLON.MeshBuilder.CreateCylinder(`led.${i}`, {
          diameter: 0.003, height: 0.002, tessellation: 16,
        }, scene);
        led.parent = parent;
        led.position.x = mapX(item.x + i * 4, 2);
        led.position.y = mapY(item.y, 2);
        led.position.z = faceZ;
        led.rotation.x = Math.PI / 2;
        led.material = mats.ledIdle;
        tag(led, 'led', i);
      }
      break;
    }
    case 'screen': {
      const screen = textPlane(scene, `screen.${item.idPrefix}`,
        item.text || ['screen'], item.w, item.h, { cyan: true, align: 'left' });
      screen.parent = parent;
      screen.position.x = mapX(item.x, item.w);
      screen.position.y = mapY(item.y, item.h);
      screen.position.z = faceZ + 0.001;
      tag(screen, 'screen', 0);
      // recessed dark frame behind the screen
      const frame = BABYLON.MeshBuilder.CreateBox(`screen.${item.idPrefix}.frame`, {
        width: (item.w + 2) * MM, height: (item.h + 2) * MM, depth: 0.004,
      }, scene);
      frame.parent = parent;
      frame.position.x = screen.position.x;
      frame.position.y = screen.position.y;
      frame.position.z = faceZ - 0.001;
      frame.material = mats.bayOpening;
      frame.isPickable = false;
      break;
    }
    case 'bay': {
      // dark opening
      const bay = BABYLON.MeshBuilder.CreateBox(`bay.${item.index}`, {
        width: item.w * MM, height: item.h * MM, depth: 0.020,
      }, scene);
      bay.parent = parent;
      bay.position.x = mapX(item.x, item.w);
      bay.position.y = mapY(item.y, item.h);
      bay.position.z = faceZ - 0.010;
      bay.material = item.populated ? mats.moduleBody : mats.bayOpening;
      tag(bay, 'bay', item.index);
      if (item.populated) {
        // faint front-strip indicator that bay is populated
        const strip = BABYLON.MeshBuilder.CreateBox(`bay.${item.index}.card`, {
          width: (item.w - 4) * MM, height: 0.005, depth: 0.001,
        }, scene);
        strip.parent = parent;
        strip.position.x = bay.position.x;
        strip.position.y = bay.position.y - (item.h / 2 - 6) * MM;
        strip.position.z = faceZ + 0.0005;
        strip.material = mats.cyan;
        strip.isPickable = false;
      }
      break;
    }
    case 'blade': {
      const blade = BABYLON.MeshBuilder.CreateBox(`blade.${item.index}`, {
        width: item.w * MM, height: item.h * MM, depth: 0.025,
      }, scene);
      blade.parent = parent;
      blade.position.x = mapX(item.x, item.w);
      blade.position.y = mapY(item.y, item.h);
      blade.position.z = faceZ - 0.012;
      blade.material = item.populated ? mats.moduleBody : mats.bayOpening;
      tag(blade, 'blade', item.index);
      if (item.populated) {
        // little LED stack on each blade
        for (let k = 0; k < 2; k++) {
          const led = BABYLON.MeshBuilder.CreateCylinder(`blade.${item.index}.led.${k}`, {
            diameter: 0.0025, height: 0.001, tessellation: 12,
          }, scene);
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
    case 'psu': {
      const psu = BABYLON.MeshBuilder.CreateBox(`psu.${item.index}`, {
        width: item.w * MM, height: item.h * MM, depth: 0.030,
      }, scene);
      psu.parent = parent;
      psu.position.x = mapX(item.x, item.w);
      psu.position.y = mapY(item.y, item.h);
      psu.position.z = faceZ - 0.015;
      psu.material = mats.moduleBody;
      tag(psu, 'psu', item.index);
      break;
    }
    case 'fan': {
      const fan = BABYLON.MeshBuilder.CreateBox(`fan.${item.index}`, {
        width: item.w * MM, height: item.h * MM, depth: 0.020,
      }, scene);
      fan.parent = parent;
      fan.position.x = mapX(item.x, item.w);
      fan.position.y = mapY(item.y, item.h);
      fan.position.z = faceZ - 0.010;
      fan.material = mats.bayOpening;
      tag(fan, 'fan', item.index);
      // visible fan blade hint
      const hub = BABYLON.MeshBuilder.CreateCylinder(`fan.${item.index}.hub`, {
        diameter: Math.min(item.w, item.h) * 0.6 * MM, height: 0.001, tessellation: 16,
      }, scene);
      hub.parent = parent;
      hub.position.x = fan.position.x;
      hub.position.y = fan.position.y;
      hub.position.z = faceZ + 0.0005;
      hub.rotation.x = Math.PI / 2;
      hub.material = mats.moduleBody;
      hub.isPickable = false;
      break;
    }
    case 'label': {
      // vendor plate — type rendered as a small flat plane
      const labelW = Math.min(item.text.length * 2.8, profile.dims.w - 12);
      const labelH = Math.max(item.size || 4, 4);
      const plane = textPlane(scene, `label.${item.x}.${item.y}`,
        [item.text], labelW, labelH,
        { bg: item.vendorPlate ? '#FAFCFD' : 'transparent',
          fg: '#0E1E2C', align: 'left' });
      plane.parent = parent;
      plane.position.x = mapX(item.x, labelW);
      plane.position.y = mapY(item.y, labelH);
      plane.position.z = faceZ + 0.0005;
      plane.isPickable = false;
      break;
    }
    case 'ventStrip': {
      // cosmetic vertical louvre — decoration, never pickable
      const v = BABYLON.MeshBuilder.CreateBox(`vent.${item.x}`, {
        width: item.w * MM, height: item.h * MM, depth: 0.004,
      }, scene);
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

// ── main entrypoint ─────────────────────────────────────────────────────────
function buildHardwareModel(
  scene: any,
  profile: HardwareProfile,
  mats: Mats,
  opts: { shadowGenerator?: any } = {}
): BuiltModel {
  const root = new BABYLON.TransformNode(`model.${profile.id}`, scene);
  const pickables: any[] = [];
  const zoneMap = new Map<string, any>();

  // ── chassis ───────────────────────────────────────────────────────────────
  const chassis = BABYLON.MeshBuilder.CreateBox(`${profile.id}.chassis.0`, {
    width:  profile.dims.w * MM,
    height: profile.dims.h * MM,
    depth:  profile.dims.d * MM,
  }, scene);
  chassis.parent = root;
  chassis.material =
    profile.finish === 'glass'      ? mats.glass
    : profile.finish === 'lightMetal' ? mats.lightMetal
    : mats.darkMetal;
  window.AnthraciteZones.tagZone(chassis, profile.id, 'chassis', 0);
  pickables.push(chassis);
  zoneMap.set(chassis.id, { kind: 'chassis', index: 0 });

  if (opts.shadowGenerator) {
    opts.shadowGenerator.addShadowCaster(chassis);
    chassis.receiveShadows = true;
  }

  // ── faceplate fixtures ───────────────────────────────────────────────────
  for (const item of profile.faceplate) {
    buildItem(scene, item, profile, mats, root, pickables, zoneMap);
  }

  // ── telemetry binding ────────────────────────────────────────────────────
  const ledMeshes = pickables.filter(m => m.metadata?.anthracite?.kind === 'led');
  const portMeshes = pickables.filter(m => m.metadata?.anthracite?.kind === 'port');

  const setTelemetry = (state: TelemetryState) => {
    const t = window.AnthraciteTelemetry.generateTelemetry(profile.id, state);
    for (const led of ledMeshes) {
      const idx = led.metadata.anthracite.index;
      const s = t.ledStates[idx] || 'unknown';
      led.material =
        s === 'up'       ? mats.ledOk
        : s === 'warning'  ? mats.ledWarn
        : s === 'down'     ? mats.ledIdle
        : s === 'critical' ? mats.ledCrit
        :                    mats.ledIdle;
    }
    for (const port of portMeshes) {
      const idx = port.metadata.anthracite.index;
      port.material = t.portsUp.has(idx) ? mats.cyan : mats.portCavity;
    }
  };
  setTelemetry('up');

  return { profileId: profile.id, root, pickables, zoneMap, setTelemetry };
}

(window as any).AnthraciteBuildModel = { buildHardwareModel };
