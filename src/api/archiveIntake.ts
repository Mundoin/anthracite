/**
 * Typed Tauri command wrapper for the V1O-B Archive Intake Engine.
 *
 * Mirrors `src-tauri/src/commands/archive_intake.rs`. The frontend
 * passes raw archive bytes as a `Uint8Array`; Tauri 2.x marshals
 * this as a binary IPC body and the Rust command receives `Vec<u8>`
 * unmangled. The kind hint is supplied by the frontend (derived from
 * the picked filename extension); the engine independently verifies
 * the kind by inspecting the leading bytes and surfaces a
 * `KindMismatch` warning when the hint disagrees.
 */

import { invoke } from "@tauri-apps/api/core";

import type { ArchiveIntakeResult, ArchiveKind } from "../types/archiveIntake";

/**
 * Decode an archive into a structured `ArchiveIntakeResult`.
 *
 * Errors out only for cases where extraction is impossible at all
 * (empty bytes, unrecognised header, decoder boundary panic). Every
 * other failure mode — corrupt entry, oversize, decode failure,
 * symlink, path traversal — lands in `warnings` / per-entry
 * statuses, not in a thrown exception.
 */
export async function archiveIntake(
  bytes: Uint8Array,
  kindHint: ArchiveKind,
): Promise<ArchiveIntakeResult> {
  return invoke<ArchiveIntakeResult>("archive_intake", {
    bytes,
    kindHint,
  });
}

/**
 * Map a file basename to an archive kind hint by extension. Returns
 * `null` for unknown extensions so the caller can refuse the pick
 * without round-tripping to Rust.
 */
export function archiveKindFromFilename(filename: string): ArchiveKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
    return { kind: "tar_gz" };
  }
  if (lower.endsWith(".tar")) {
    return { kind: "tar" };
  }
  if (lower.endsWith(".zip")) {
    return { kind: "zip" };
  }
  return null;
}
