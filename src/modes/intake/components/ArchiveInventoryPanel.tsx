/**
 * V1O-B archive inventory panel.
 *
 * Collapsed by default (R12). Renders archive-level metadata plus a
 * per-entry table on expansion. Skipped entries stay visible (R13
 * honesty: render what the engine returned). The panel is the
 * operator's single window into how the archive intake engine
 * interpreted the bytes — detected kind, supplied kind, entry counts,
 * warning summary, per-entry status + size + decode warnings.
 *
 * Honest rendering rules:
 *   - archive_kind_detected shown (not the supplied hint)
 *   - KindMismatch warning surfaced in the header summary
 *   - skipped entries de-emphasised but never hidden
 *   - decode warnings rendered verbatim from the engine
 *   - inventory may be omitted entirely by the caller when
 *     `extracted_count === 1 && warnings.length === 0` and the
 *     operator is on the single-config V1O passthrough flow
 */

import type { JSX } from "react";

import type {
  ArchiveEntryStatus,
  ArchiveIntakeResult,
  ArchiveKind,
  ArchiveWarning,
} from "../../../types/archiveIntake";

export interface ArchiveInventoryPanelProps {
  readonly inventory: ArchiveIntakeResult;
  readonly archiveName: string;
  readonly initiallyOpen?: boolean;
}

export function ArchiveInventoryPanel({
  inventory,
  archiveName,
  initiallyOpen = false,
}: ArchiveInventoryPanelProps): JSX.Element {
  const detected = labelArchiveKind(inventory.archive_kind_detected);
  const supplied = labelArchiveKind(inventory.archive_kind_supplied);
  const kindMismatched =
    inventory.archive_kind_detected.kind !== inventory.archive_kind_supplied.kind;

  return (
    <details
      className="intake-archive-inventory"
      open={initiallyOpen}
      aria-label="Archive inventory"
    >
      <summary className="intake-archive-inventory__summary">
        <span className="intake-archive-inventory__filename">{archiveName}</span>
        <span className="intake-muted">
          {" · "}
          {detected}
          {" · "}
          {inventory.entry_count} entries
          {" · "}
          {inventory.extracted_count} extracted
          {" · "}
          {inventory.skipped_count} skipped
        </span>
        {kindMismatched && (
          <span className="intake-tag intake-tag--warn" title="kind_mismatch">
            KIND MISMATCH ({supplied} → {detected})
          </span>
        )}
      </summary>

      {inventory.warnings.length > 0 && (
        <ul
          className="intake-archive-inventory__warnings"
          aria-label="Archive warnings"
        >
          {inventory.warnings.map((w, i) => (
            <li key={`${w.kind}-${i}`} className="intake-archive-inventory__warning">
              <span className="intake-tag intake-tag--warn">{w.kind}</span>
              <span className="intake-archive-inventory__warning-detail">
                {describeWarning(w)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <table className="intake-archive-inventory__entries">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Path</th>
            <th scope="col">Size</th>
            <th scope="col">Status</th>
            <th scope="col">Decode</th>
          </tr>
        </thead>
        <tbody>
          {inventory.entries.map((entry) => {
            const skipped = entry.status.kind !== "extracted";
            return (
              <tr
                key={entry.entry_id}
                className={
                  skipped
                    ? "intake-archive-inventory__row intake-archive-inventory__row--skipped"
                    : "intake-archive-inventory__row"
                }
              >
                <td className="intake-archive-inventory__cell-id">
                  {entry.entry_id}
                </td>
                <td className="intake-archive-inventory__cell-path">
                  {entry.path}
                </td>
                <td className="intake-archive-inventory__cell-size">
                  {formatBytes(entry.size_bytes_uncompressed)}
                </td>
                <td className="intake-archive-inventory__cell-status">
                  {labelEntryStatus(entry.status)}
                </td>
                <td className="intake-archive-inventory__cell-decode">
                  {entry.decode_warning ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}

function labelArchiveKind(kind: ArchiveKind): string {
  switch (kind.kind) {
    case "zip":
      return "zip";
    case "tar":
      return "tar";
    case "tar_gz":
      return "tar.gz";
    case "unknown":
      return "unknown";
  }
}

function labelEntryStatus(status: ArchiveEntryStatus): string {
  switch (status.kind) {
    case "extracted":
      return "extracted";
    case "skipped_directory":
      return "skipped: directory";
    case "skipped_non_text":
      return "skipped: non-text";
    case "skipped_oversize":
      return "skipped: oversize";
    case "skipped_decode_error":
      return "skipped: decode error";
    case "skipped_symlink":
      return "skipped: symlink";
    case "skipped_path_traversal":
      return "skipped: path traversal";
    case "skipped_empty":
      return "skipped: empty";
  }
}

function describeWarning(w: ArchiveWarning): string {
  switch (w.kind) {
    case "empty_archive":
      return "no entries in archive";
    case "corrupt_archive":
      return w.detail;
    case "oversize_archive":
      return `${formatBytes(w.actual_bytes)} exceeds limit ${formatBytes(w.limit_bytes)}`;
    case "too_many_entries":
      return `${w.actual} entries declared, capped at ${w.limit}`;
    case "compression_ratio_exceeded":
      return `${w.entry_id} ratio ${w.ratio}× exceeds cap`;
    case "deep_path_truncated":
      return `${w.entry_id} truncated from depth ${w.original_depth}`;
    case "entry_decode_failed":
      return `${w.entry_id} failed UTF-8 decode`;
    case "symlink_ignored":
      return `symlink ${w.entry_path} ignored`;
    case "path_traversal_rejected":
      return `path ${w.entry_path} rejected`;
    case "nested_archive_detected":
      return `nested archive ${w.entry_path} not recursed`;
    case "zero_text_entries":
      return "no extractable text entries found";
    case "kind_mismatch":
      return `supplied ${labelArchiveKind(w.supplied)} but bytes are ${labelArchiveKind(w.detected)}`;
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MiB`;
}
