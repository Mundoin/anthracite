/**
 * V1O-B per-slice archive provenance badge.
 *
 * Rendered on every device card that originated from an archive
 * entry. Surfaces `from <entry_path>` so the operator can trace the
 * device back to the archive entry it came from. R4 of the V1O-B
 * prompt — provenance flows: archive entry → splitter slice → device
 * card → receipt header annotation.
 */

import type { JSX } from "react";

import type { ArchiveEntryRef } from "../../../types/archiveIntake";

export interface ArchiveSourceBadgeProps {
  readonly provenance: ArchiveEntryRef;
}

export function ArchiveSourceBadge({
  provenance,
}: ArchiveSourceBadgeProps): JSX.Element {
  return (
    <span
      className="intake-archive-source-badge"
      aria-label={`from ${provenance.entry_path}`}
      title={
        provenance.archive_name
          ? `${provenance.archive_name} / ${provenance.entry_path}`
          : provenance.entry_path
      }
    >
      <span className="intake-archive-source-badge__label">from</span>{" "}
      <span className="intake-archive-source-badge__path">
        {provenance.entry_path}
      </span>
    </span>
  );
}
