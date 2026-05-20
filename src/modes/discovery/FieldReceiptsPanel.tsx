/**
 * V1BL — FieldReceiptsPanel.
 *
 * Local UI surface for the Field Receipts tool. Operator views, filters,
 * and copies session-only history of discovery artifacts.
 *
 * No device contact. No persistence.
 */

import type { JSX } from "react";
import { useState } from "react";
import {
  listHistory,
  filterHistoryByKind,
  toHistoryMarkdown,
  type DiscoveryRunHistory,
  type HistoryEntryKind,
} from "./discoveryRunHistory";
import "./FieldReceiptsPanel.css";

export interface FieldReceiptsPanelClipboard {
  writeText(text: string): Promise<void>;
}

const DEFAULT_CLIPBOARD: FieldReceiptsPanelClipboard = {
  writeText: (t) => navigator.clipboard.writeText(t),
};

export interface FieldReceiptsPanelProps {
  readonly history: DiscoveryRunHistory;
  readonly onClear: () => void;
  readonly clipboard?: FieldReceiptsPanelClipboard;
}

type FilterKind = "all" | HistoryEntryKind;

const FILTER_KINDS: ReadonlyArray<FilterKind> = [
  "all",
  "seed_plan",
  "crawl_preview",
  "ssh_validation_pack",
  "field_receipt",
];

export function FieldReceiptsPanel({
  history,
  onClear,
  clipboard = DEFAULT_CLIPBOARD,
}: FieldReceiptsPanelProps): JSX.Element {
  const [filter, setFilter] = useState<FilterKind>("all");
  const [copied, setCopied] = useState<string | null>(null);

  const entries = listHistory(history);
  const filteredEntries =
    filter === "all" ? entries : filterHistoryByKind(history, filter as HistoryEntryKind);

  const handleCopyEntry = async (entryId: string, markdown: string): Promise<void> => {
    try {
      await clipboard.writeText(markdown);
      setCopied(entryId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const handleClearAll = (): void => {
    if (entries.length > 0) {
      // eslint-disable-next-line no-alert
      if (confirm("Clear all history entries?")) {
        onClear();
      }
    }
  };

  const historyMarkdown = toHistoryMarkdown(history);

  return (
    <div className="field-receipts-panel" data-testid="field-receipts-panel">
      {entries.length === 0 ? (
        <section
          className="frp-body frp-body--empty"
          role="status"
          aria-label="Field receipts empty"
          data-testid="frp-empty"
        >
          <p>
            No receipts generated yet this session. Generate a Seed Plan or Crawl Preview to
            populate.
          </p>
        </section>
      ) : (
        <section className="frp-body" data-testid="frp-form">
          <div className="frp-controls">
            <fieldset className="frp-filter">
              <legend>Filter by kind</legend>
              <div className="frp-filter-buttons">
                {FILTER_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={
                      filter === kind
                        ? "frp-filter-btn frp-filter-btn--active"
                        : "frp-filter-btn"
                    }
                    onClick={() => setFilter(kind)}
                    data-testid={`frp-filter-${kind}`}
                  >
                    {kind === "all" ? "All" : kind}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="frp-actions">
              <button
                type="button"
                onClick={handleClearAll}
                className="frp-clear-btn"
                disabled={entries.length === 0}
                data-testid="frp-clear-all-btn"
              >
                Clear All
              </button>
            </div>
          </div>

          {filteredEntries.length === 0 && filter !== "all" ? (
            <section className="frp-no-entries" data-testid="frp-no-entries">
              <p>No entries of kind "{filter}" yet.</p>
              {filter === "ssh_validation_pack" && (
                <p className="frp-wiring-note">(wiring pending)</p>
              )}
              {filter === "field_receipt" && (
                <p className="frp-wiring-note">(wiring pending)</p>
              )}
            </section>
          ) : (
            <div className="frp-entries-list" data-testid="frp-entries-list">
              {filteredEntries.map((entry, i) => (
                <div
                  key={`${entry.id}:${i}`}
                  className="frp-entry"
                  data-testid={`frp-entry-${i}`}
                >
                  <div className="frp-entry-header">
                    <span className="frp-kind-chip" data-testid={`frp-kind-chip-${i}`}>
                      {entry.kind}
                    </span>
                    <span className="frp-label" data-testid={`frp-label-${i}`}>
                      {entry.label}
                    </span>
                    <span className="frp-timestamp" data-testid={`frp-timestamp-${i}`}>
                      {entry.created_at}
                    </span>
                  </div>

                  <div className="frp-entry-body">
                    <p className="frp-summary" data-testid={`frp-summary-${i}`}>
                      {entry.summary}
                    </p>
                    {entry.counts && (
                      <div className="frp-counts">
                        {typeof entry.counts.seeds === "number" && (
                          <span data-testid={`frp-count-seeds-${i}`}>
                            Seeds: {entry.counts.seeds}
                          </span>
                        )}
                        {typeof entry.counts.warnings === "number" && (
                          <span data-testid={`frp-count-warnings-${i}`}>
                            Warnings: {entry.counts.warnings}
                          </span>
                        )}
                        {typeof entry.counts.issues === "number" && (
                          <span data-testid={`frp-count-issues-${i}`}>
                            Issues: {entry.counts.issues}
                          </span>
                        )}
                        {typeof entry.counts.imports === "number" && (
                          <span data-testid={`frp-count-imports-${i}`}>
                            Imports: {entry.counts.imports}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="frp-entry-actions">
                    <button
                      type="button"
                      onClick={() => void handleCopyEntry(entry.id, entry.markdown)}
                      data-testid={`frp-copy-btn-${i}`}
                    >
                      {copied === entry.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <details className="frp-all-history" data-testid="frp-all-history">
            <summary>Session History (Markdown)</summary>
            <pre className="frp-history-md" data-testid="frp-history-md">
              {historyMarkdown}
            </pre>
          </details>
        </section>
      )}
    </div>
  );
}
