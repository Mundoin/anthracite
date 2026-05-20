/**
 * V1BL — Discovery Run History (pure model).
 *
 * In-memory session-only history of discovery artifacts generated during
 * a Discovery Mode session. Tracks seed plans, crawl previews, validation
 * packs, and field receipts.
 *
 * Discipline:
 *   - In-memory only; DiscoveryRunHistory is a value object.
 *   - addHistoryEntry returns a new history (immutable).
 *   - Markdown never includes raw secret material.
 *   - All timestamps caller-provided (deterministic for tests).
 */

export type HistoryEntryKind =
  | "seed_plan"
  | "crawl_preview"
  | "ssh_validation_pack"
  | "field_receipt";

export type RedactionStatus = "safe" | "unknown";

export interface HistoryEntry {
  readonly id: string;
  readonly kind: HistoryEntryKind;
  readonly created_at: string;
  readonly label: string;
  readonly summary: string;
  readonly markdown: string;
  readonly source_tool: string;
  readonly redaction_status: RedactionStatus;
  readonly counts?: {
    readonly seeds?: number;
    readonly warnings?: number;
    readonly issues?: number;
    readonly imports?: number;
  };
}

export interface DiscoveryRunHistory {
  readonly entries: ReadonlyArray<HistoryEntry>;
}

export function emptyHistory(): DiscoveryRunHistory {
  return { entries: [] };
}

export function addHistoryEntry(
  history: DiscoveryRunHistory,
  entry: HistoryEntry,
): DiscoveryRunHistory {
  return {
    entries: [...history.entries, entry],
  };
}

export function listHistory(history: DiscoveryRunHistory): ReadonlyArray<HistoryEntry> {
  return history.entries;
}

export function clearHistory(_history: DiscoveryRunHistory): DiscoveryRunHistory {
  return { entries: [] };
}

export function filterHistoryByKind(
  history: DiscoveryRunHistory,
  kind: HistoryEntryKind,
): ReadonlyArray<HistoryEntry> {
  return history.entries.filter((e) => e.kind === kind);
}

export function latestByKind(
  history: DiscoveryRunHistory,
  kind: HistoryEntryKind,
): HistoryEntry | undefined {
  const filtered = filterHistoryByKind(history, kind);
  return filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
}

const SECRET_GUARD = /(password|private[_-]?key|passphrase|secret)/i;

export function toHistoryMarkdown(history: DiscoveryRunHistory): string {
  if (history.entries.length === 0) {
    return "# Discovery Session History\n\n_No entries yet._";
  }

  const lines: string[] = [];
  lines.push("# Discovery Session History");
  lines.push("");

  for (const entry of history.entries) {
    lines.push(`## ${entry.label}`);
    lines.push(`- **Kind:** ${entry.kind}`);
    lines.push(`- **Created:** ${entry.created_at}`);
    lines.push(`- **Source:** ${entry.source_tool}`);
    lines.push(`- **Summary:** ${entry.summary}`);

    if (entry.counts) {
      if (typeof entry.counts.seeds === "number") {
        lines.push(`- **Seeds:** ${entry.counts.seeds}`);
      }
      if (typeof entry.counts.warnings === "number") {
        lines.push(`- **Warnings:** ${entry.counts.warnings}`);
      }
      if (typeof entry.counts.issues === "number") {
        lines.push(`- **Issues:** ${entry.counts.issues}`);
      }
      if (typeof entry.counts.imports === "number") {
        lines.push(`- **Imports:** ${entry.counts.imports}`);
      }
    }

    lines.push("");
  }

  const result = lines.join("\n");
  if (SECRET_GUARD.test(result)) {
    return result.replace(SECRET_GUARD, "[redacted]");
  }
  return result;
}
