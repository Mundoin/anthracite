/**
 * V1Z — ASSESS metadata header.
 *
 * Renders artifact-backed metadata for the loaded `BatchRunExport`.
 * Display only; never mutates the artifact, never invents values.
 * Missing optional metadata renders as `MISSING_METADATA_LABEL`
 * ("not recorded") so the operator sees the absence rather than
 * a silent omission.
 *
 * Slots between the assessment page header and the summary strip
 * in `AssessLoadedView`. See `ASSESS_SURFACE_CONTRACT.md` §V1Z.
 */

import type { JSX } from "react";

import type { BatchRunExport } from "../../../types/batchRunExport";
import {
  MISSING_METADATA_LABEL,
  metadataRows,
  parserPlatformGroups,
  type ParserPlatformGroup,
} from "../metadata";

export interface AssessMetadataHeaderProps {
  readonly artifact: BatchRunExport;
  readonly filename: string;
}

export function AssessMetadataHeader(
  props: AssessMetadataHeaderProps,
): JSX.Element {
  const { artifact, filename } = props;
  const rows = metadataRows(artifact, filename);
  const groups = parserPlatformGroups(artifact);

  return (
    <section
      className="assess-loaded__metadata"
      aria-label="Assessment metadata"
    >
      <header className="assess-loaded__metadata-header">
        <span className="assess-loaded__metadata-heading">Metadata</span>
      </header>
      <dl className="assess-loaded__metadata-rows">
        {rows.map((r) => (
          <div key={r.label} className="assess-loaded__metadata-row">
            <dt className="assess-loaded__metadata-label">{r.label}</dt>
            <dd className="assess-loaded__metadata-value intake-mono">
              {r.value ?? (
                <span className="assess-loaded__metadata-missing">
                  {MISSING_METADATA_LABEL}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {groups.length > 0 && (
        <div className="assess-loaded__metadata-platforms">
          <div className="assess-loaded__metadata-label">Platforms</div>
          <ul
            className="assess-loaded__metadata-platform-list"
            aria-label="Platforms and parser versions"
          >
            {groups.map((g, i) => (
              <PlatformRow key={i} group={g} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

interface PlatformRowProps {
  readonly group: ParserPlatformGroup;
}

function PlatformRow({ group }: PlatformRowProps): JSX.Element {
  const platformLabel =
    group.platform_id ??
    (group.vendor ? `unknown platform (${group.vendor})` : "unknown platform");
  const parserLabel =
    group.parser_versions.length === 0
      ? "parser version not recorded"
      : `parser ${group.parser_versions.map((v) => `v${v}`).join(", ")}`;
  const deviceLabel = `${group.device_count} device${
    group.device_count === 1 ? "" : "s"
  }`;
  return (
    <li className="assess-loaded__metadata-platform-row intake-mono">
      <span className="assess-loaded__metadata-platform-id">
        {platformLabel}
      </span>
      <span className="intake-muted"> · </span>
      <span>{parserLabel}</span>
      <span className="intake-muted"> · </span>
      <span>{deviceLabel}</span>
    </li>
  );
}
