/**
 * Archive Intake Engine — TypeScript surface (V1O-B).
 *
 * Mirrors `src-tauri/src/engines/archive_intake.rs`. Rust is the
 * authoritative wire shape; this file describes what the Tauri command
 * boundary returns. Renaming a shipped field is forbidden.
 *
 * Pair docs:
 *   - `docs/architecture/ARCHIVE_INTAKE_CONTRACT.md`
 *   - `docs/architecture/INTAKE_SURFACE_CONTRACT.md` (Archive mode)
 */

export type ArchiveKind =
  | { readonly kind: "zip" }
  | { readonly kind: "tar" }
  | { readonly kind: "tar_gz" }
  | { readonly kind: "unknown" };

export type ArchiveEntryStatus =
  | { readonly kind: "extracted" }
  | { readonly kind: "skipped_directory" }
  | { readonly kind: "skipped_non_text" }
  | { readonly kind: "skipped_oversize" }
  | { readonly kind: "skipped_decode_error" }
  | { readonly kind: "skipped_symlink" }
  | { readonly kind: "skipped_path_traversal" }
  | { readonly kind: "skipped_empty" };

export type ArchiveWarning =
  | { readonly kind: "empty_archive" }
  | { readonly kind: "corrupt_archive"; readonly detail: string }
  | {
      readonly kind: "oversize_archive";
      readonly limit_bytes: number;
      readonly actual_bytes: number;
    }
  | {
      readonly kind: "too_many_entries";
      readonly limit: number;
      readonly actual: number;
    }
  | {
      readonly kind: "compression_ratio_exceeded";
      readonly entry_id: string;
      readonly ratio: number;
    }
  | {
      readonly kind: "deep_path_truncated";
      readonly entry_id: string;
      readonly original_depth: number;
    }
  | { readonly kind: "entry_decode_failed"; readonly entry_id: string }
  | { readonly kind: "symlink_ignored"; readonly entry_path: string }
  | { readonly kind: "path_traversal_rejected"; readonly entry_path: string }
  | { readonly kind: "nested_archive_detected"; readonly entry_path: string }
  | { readonly kind: "zero_text_entries" }
  | {
      readonly kind: "kind_mismatch";
      readonly supplied: ArchiveKind;
      readonly detected: ArchiveKind;
    };

export interface ArchiveEntry {
  readonly entry_id: string;
  readonly entry_index: number;
  readonly path: string;
  readonly raw_path: string | null;
  readonly size_bytes_compressed: number;
  readonly size_bytes_uncompressed: number;
  readonly status: ArchiveEntryStatus;
  readonly raw_text: string | null;
  readonly decode_warning: string | null;
}

export interface ArchiveIntakeResult {
  readonly archive_kind_supplied: ArchiveKind;
  readonly archive_kind_detected: ArchiveKind;
  readonly entries: ReadonlyArray<ArchiveEntry>;
  readonly warnings: ReadonlyArray<ArchiveWarning>;
  readonly total_uncompressed_size: number;
  readonly total_compressed_size: number;
  readonly entry_count: number;
  readonly extracted_count: number;
  readonly skipped_count: number;
  readonly archive_intake_version: string;
}

/**
 * Provenance reference attached by the frontend to every
 * `ConfigSlice` produced by splitting an archive entry's text. Not
 * carried on the Rust wire — V1O-B does not modify the splitter, so
 * provenance is layered in TypeScript and threaded through the
 * existing batch UI as a per-slice decoration.
 */
export interface ArchiveEntryRef {
  readonly entry_id: string;
  readonly entry_path: string;
  readonly archive_name: string | null;
}
