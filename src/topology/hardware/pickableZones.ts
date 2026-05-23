/**
 * Pickable zone helpers.
 *
 * Ported from design-review/anthracite-topology-hardware-model-kit-v0/src/pickableZones.ts
 * in stage V1BE.
 *
 * Stable mesh ID rule:    <modelId>.<zoneKind>.<index>
 * Port index ranges:      RJ45 0+, SFP 1000+, QSFP 2000+
 */

import type { AbstractMesh } from "@babylonjs/core";
import type { ZoneKind, ZoneTag, AnthraciteMeshMetadata } from "./types";

export function meshId(modelId: string, kind: ZoneKind, n: number): string {
  return `${modelId}.${kind}.${n}`;
}

export function tagZone(
  mesh: AbstractMesh,
  modelId: string,
  kind: ZoneKind,
  index: number,
): void {
  const id = meshId(modelId, kind, index);
  mesh.id = id;
  mesh.name = id;
  mesh.isPickable = true;
  const existing =
    (mesh.metadata as Partial<AnthraciteMeshMetadata> | null | undefined) ??
    {};
  mesh.metadata = { ...existing, anthracite: { modelId, kind, index } };
}

export function readZone(mesh: AbstractMesh | null | undefined): ZoneTag | null {
  if (!mesh) return null;
  const meta = mesh.metadata as Partial<AnthraciteMeshMetadata> | null | undefined;
  return meta?.anthracite ?? null;
}

export function parseMeshId(id: string): ZoneTag | null {
  const parts = id.split(".");
  if (parts.length !== 3) return null;
  const [modelId, kindStr, nStr] = parts;
  const n = Number(nStr);
  if (!Number.isFinite(n)) return null;
  return { modelId, kind: kindStr as ZoneKind, index: n };
}
