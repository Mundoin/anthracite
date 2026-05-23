// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ NOTE FOR OCC IMPLEMENTERS                                                   │
// │ This file is the canonical TypeScript source. In the preview it is loaded   │
// │ via Babel-standalone with the `typescript` preset, which only strips type │
// │ annotations — it does not resolve ES module syntax. Cross-file linkage is  │
// │ therefore done through `window.Anthracite*` globals (see end of file).   │
// │ When integrating into a real bundler (Vite/esbuild/tsc), restore the       │
// │ `import` / `export` keywords as needed.                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

// Anthracite — Hardware Model Kit · pickable zone helper
//
// Stable mesh ID rule:
//
//   <model>.<zone>.<n>
//
// Examples:
//   access48.port.17
//   firewall2u.led.3
//   core4u.blade.2
//   router2u.psu.1
//   sfp_module.qsfp.0
//
// Every clickable mesh in the kit must be tagged via tagZone() so OCC's
// event bridge can resolve a pointer hit back to a (modelId, zoneKind, n)
// triple without string parsing surprises.
declare const BABYLON: any;

type ZoneTag = { modelId: string; kind: ZoneKind; index: number };

function meshId(modelId: string, kind: ZoneKind, n: number): string {
  return `${modelId}.${kind}.${n}`;
}

/**
 * Tag a Babylon mesh as pickable in a stable, parseable way.
 *
 *   - sets mesh.id     = "<model>.<zone>.<n>"
 *   - sets mesh.name   = same (Babylon's debug inspector reads .name)
 *   - sets isPickable  = true
 *   - sets metadata    = { anthracite: ZoneTag }
 *
 * Decoration meshes (vendor plates, vent strips, dimensional ticks) must
 * never be tagged — leave them with isPickable = false and no metadata.
 */
function tagZone(
  mesh: any,
  modelId: string,
  kind: ZoneKind,
  index: number
): void {
  const id = meshId(modelId, kind, index);
  mesh.id = id;
  mesh.name = id;
  mesh.isPickable = true;
  mesh.metadata = { ...(mesh.metadata || {}), anthracite: { modelId, kind, index } };
}

/**
 * Read the zone tag back off a pick result. Returns null for unpickable
 * or untagged meshes.
 */
function readZone(mesh: any): ZoneTag | null {
  if (!mesh) return null;
  const t = mesh?.metadata?.anthracite;
  return t ? t as ZoneTag : null;
}

/**
 * Parse a mesh ID string back into a ZoneTag. Returns null if the ID
 * doesn't match the rule.
 */
function parseMeshId(id: string): ZoneTag | null {
  const parts = id.split('.');
  if (parts.length !== 3) return null;
  const [modelId, kind, nStr] = parts;
  const n = Number(nStr);
  if (!Number.isFinite(n)) return null;
  return { modelId, kind: kind as ZoneKind, index: n };
}

(window as any).AnthraciteZones = { meshId, tagZone, readZone, parseMeshId };
