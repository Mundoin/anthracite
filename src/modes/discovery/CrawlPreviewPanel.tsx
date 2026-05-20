/**
 * V1BL — CrawlPreviewPanel.
 *
 * Local UI surface for the Crawl Preview tool. Operator configures crawl
 * options (max depth, max nodes, expansion sources), sees a preview of
 * what would be attempted, and can copy the Markdown receipt.
 *
 * No device contact. No persistence. No credentials.
 */

import type { JSX } from "react";
import { useMemo, useState } from "react";
import type { SeedEntry } from "./seedPlanner";
import {
  buildCrawlPreview,
  toCrawlPreviewMarkdown,
  type CrawlPreviewOptions,
  type ExpansionSource,
  type PreferredTransport,
} from "./crawlPreview";
import "./CrawlPreviewPanel.css";

export interface CrawlPreviewClock {
  now(): string;
}

export interface CrawlPreviewClipboard {
  writeText(text: string): Promise<void>;
}

const DEFAULT_CLOCK: CrawlPreviewClock = {
  now: () => new Date().toISOString(),
};

const DEFAULT_CLIPBOARD: CrawlPreviewClipboard = {
  writeText: (t) => navigator.clipboard.writeText(t),
};

export interface CrawlPreviewPanelProps {
  readonly seeds: ReadonlyArray<SeedEntry>;
  readonly onAddHistory?: (entry: {
    kind: "crawl_preview";
    id: string;
    label: string;
    summary: string;
    markdown: string;
    created_at: string;
    source_tool: string;
    redaction_status: "safe" | "unknown";
  }) => void;
  readonly clock?: CrawlPreviewClock;
  readonly clipboard?: CrawlPreviewClipboard;
}

export function CrawlPreviewPanel({
  seeds,
  onAddHistory,
  clock = DEFAULT_CLOCK,
  clipboard = DEFAULT_CLIPBOARD,
}: CrawlPreviewPanelProps): JSX.Element {
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxNodes, setMaxNodes] = useState(10);
  const [stopOnDuplicate, setStopOnDuplicate] = useState(true);
  const [stopOnUnknownPlatform, setStopOnUnknownPlatform] = useState(false);
  const [allowCidrExpansion, setAllowCidrExpansion] = useState(false);
  const [includeDisabledSeeds, setIncludeDisabledSeeds] = useState(false);
  const [preferredTransport, setPreferredTransport] = useState<PreferredTransport>("ssh");

  // Expansion sources
  const [lldp, setLldp] = useState(true);
  const [cdp, setCdp] = useState(true);
  const [staticNeighbor, setStaticNeighbor] = useState(false);
  const [manual, setManual] = useState(false);

  const [copied, setCopied] = useState(false);
  const [mdPreviewOpen, setMdPreviewOpen] = useState(false);

  const expansionSources = useMemo(() => {
    const sources: ExpansionSource[] = [];
    if (lldp) sources.push("lldp");
    if (cdp) sources.push("cdp");
    if (staticNeighbor) sources.push("static_neighbor");
    if (manual) sources.push("manual");
    return sources;
  }, [lldp, cdp, staticNeighbor, manual]);

  const options = useMemo(() => {
    const opts: CrawlPreviewOptions = {
      max_depth: maxDepth,
      max_nodes: maxNodes,
      expansion_sources: expansionSources,
      stop_on_duplicate: stopOnDuplicate,
      stop_on_platform_unknown: stopOnUnknownPlatform,
      allow_cidr_expansion: allowCidrExpansion,
      include_disabled_seeds: includeDisabledSeeds,
      preferred_transport: preferredTransport,
    };
    return opts;
  }, [
    maxDepth,
    maxNodes,
    expansionSources,
    stopOnDuplicate,
    stopOnUnknownPlatform,
    allowCidrExpansion,
    includeDisabledSeeds,
    preferredTransport,
  ]);

  const preview = useMemo(() => {
    return buildCrawlPreview(seeds, options, clock.now());
  }, [seeds, options, clock]);

  const previewMarkdown = useMemo(() => {
    return toCrawlPreviewMarkdown(preview);
  }, [preview]);

  const handleCopyPreview = async (): Promise<void> => {
    try {
      await clipboard.writeText(previewMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Notify parent if onAddHistory is provided
      if (onAddHistory) {
        onAddHistory({
          kind: "crawl_preview",
          id: preview.crawl_preview_id,
          label: `Crawl Preview (${preview.active_seed_count} seeds, depth ${preview.options.max_depth})`,
          summary: `${preview.active_seed_count} active, ${preview.blocked_seeds.length} blocked, frontier ${preview.frontier.length}`,
          markdown: previewMarkdown,
          created_at: clock.now(),
          source_tool: "recursive_crawl",
          redaction_status: "safe",
        });
      }
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="crawl-preview-panel" data-testid="crawl-preview-panel">
      {seeds.length === 0 && (
        <section
          className="cp-body cp-body--empty"
          role="status"
          aria-label="Crawl preview empty"
          data-testid="cp-empty"
        >
          <p>No seeds defined. Use Seed Planner to create seeds first.</p>
        </section>
      )}

      {seeds.length > 0 && (
        <section className="cp-body" data-testid="cp-form">
          <div className="cp-form">
            <fieldset className="cp-fieldset">
              <legend>Crawl Options</legend>

              <div className="form-group">
                <label htmlFor="cp-max-depth">Max depth</label>
                <input
                  id="cp-max-depth"
                  type="number"
                  min="0"
                  max="10"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(parseInt(e.currentTarget.value, 10) || 0)}
                  data-testid="cp-max-depth"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cp-max-nodes">Max nodes</label>
                <input
                  id="cp-max-nodes"
                  type="number"
                  min="1"
                  max="1000"
                  value={maxNodes}
                  onChange={(e) => setMaxNodes(parseInt(e.currentTarget.value, 10) || 1)}
                  data-testid="cp-max-nodes"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cp-preferred-transport">Preferred transport</label>
                <select
                  id="cp-preferred-transport"
                  value={preferredTransport}
                  onChange={(e) =>
                    setPreferredTransport(e.currentTarget.value as PreferredTransport)
                  }
                  data-testid="cp-preferred-transport"
                >
                  <option value="ssh">SSH</option>
                  <option value="snmp">SNMP</option>
                  <option value="manual">Manual</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </fieldset>

            <fieldset className="cp-fieldset">
              <legend>Expansion Sources</legend>

              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={lldp}
                    onChange={(e) => setLldp(e.currentTarget.checked)}
                    data-testid="cp-lldp-checkbox"
                  />
                  LLDP
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={cdp}
                    onChange={(e) => setCdp(e.currentTarget.checked)}
                    data-testid="cp-cdp-checkbox"
                  />
                  CDP
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={staticNeighbor}
                    onChange={(e) => setStaticNeighbor(e.currentTarget.checked)}
                    data-testid="cp-static-neighbor-checkbox"
                  />
                  Static neighbor
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={manual}
                    onChange={(e) => setManual(e.currentTarget.checked)}
                    data-testid="cp-manual-checkbox"
                  />
                  Manual
                </label>
              </div>
            </fieldset>

            <fieldset className="cp-fieldset">
              <legend>Flags</legend>

              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={stopOnDuplicate}
                    onChange={(e) => setStopOnDuplicate(e.currentTarget.checked)}
                    data-testid="cp-stop-on-duplicate-checkbox"
                  />
                  Stop on duplicate
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={stopOnUnknownPlatform}
                    onChange={(e) => setStopOnUnknownPlatform(e.currentTarget.checked)}
                    data-testid="cp-stop-on-unknown-platform-checkbox"
                  />
                  Stop on unknown platform
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={allowCidrExpansion}
                    onChange={(e) => setAllowCidrExpansion(e.currentTarget.checked)}
                    data-testid="cp-allow-cidr-expansion-checkbox"
                  />
                  Allow CIDR expansion (staged intent only)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={includeDisabledSeeds}
                    onChange={(e) => setIncludeDisabledSeeds(e.currentTarget.checked)}
                    data-testid="cp-include-disabled-seeds-checkbox"
                  />
                  Include disabled seeds
                </label>
              </div>
            </fieldset>
          </div>

          <section className="cp-summary" data-testid="cp-summary">
            <h3>Preview Summary</h3>
            <dl className="cp-summary-grid">
              <dt>Active seeds</dt>
              <dd data-testid="cp-active-count">{preview.active_seed_count}</dd>
              <dt>Excluded seeds</dt>
              <dd data-testid="cp-excluded-count">{preview.excluded_seed_count}</dd>
              <dt>Blocked seeds</dt>
              <dd data-testid="cp-blocked-count">{preview.blocked_seeds.length}</dd>
              <dt>Frontier entries (depth 0)</dt>
              <dd data-testid="cp-frontier-count">{preview.frontier.length}</dd>
              <dt>Next action</dt>
              <dd data-testid="cp-next-action">
                <code>{preview.next_action}</code>
              </dd>
            </dl>
          </section>

          {preview.frontier.length > 0 && (
            <section className="cp-frontier" data-testid="cp-frontier">
              <h3>Frontier</h3>
              <table className="cp-frontier-table">
                <thead>
                  <tr>
                    <th>Depth</th>
                    <th>Host or CIDR</th>
                    <th>Seed ID</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.frontier.map((entry, i) => (
                    <tr key={`${i}:${entry.seed_id}`} data-testid={`cp-frontier-row-${i}`}>
                      <td>{entry.depth}</td>
                      <td>
                        <code>{entry.host_or_cidr}</code>
                      </td>
                      <td>
                        <code>{entry.seed_id}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {preview.blocked_seeds.length > 0 && (
            <section className="cp-blocked" data-testid="cp-blocked">
              <h3>Blocked Seeds</h3>
              <div className="cp-blocked-list">
                {preview.blocked_seeds.map((blocked, i) => (
                  <div
                    key={`${i}:${blocked.seed_id}`}
                    className="cp-blocked-item"
                    data-testid={`cp-blocked-item-${i}`}
                  >
                    <p className="cp-blocked-host">
                      <code>{blocked.host_or_cidr}</code>
                    </p>
                    <p className="cp-blocked-reason">
                      <strong>[{blocked.reason}]</strong> {blocked.message}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {preview.warnings.length > 0 && (
            <section className="cp-warnings" data-testid="cp-warnings">
              <h3>Warnings</h3>
              <ul className="cp-warnings-list">
                {preview.warnings.map((w, i) => (
                  <li key={i} data-testid={`cp-warning-${i}`}>
                    {w}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="cp-actions">
            <button
              type="button"
              onClick={() => void handleCopyPreview()}
              data-testid="cp-copy-btn"
            >
              {copied ? "Copied (Markdown)" : "Copy Crawl Preview"}
            </button>
          </div>

          <details className="cp-md-preview" data-testid="cp-md-preview">
            <summary
              onClick={(e) => {
                e.preventDefault();
                setMdPreviewOpen(!mdPreviewOpen);
              }}
            >
              Preview (Markdown)
            </summary>
            {mdPreviewOpen && (
              <pre className="cp-md-content" data-testid="cp-md-content">
                {previewMarkdown}
              </pre>
            )}
          </details>

          <section className="cp-honesty-footer" data-testid="cp-honesty-footer">
            <p className="cp-honesty-text">
              Preview only — no device contact, no recursive crawl execution.
            </p>
          </section>
        </section>
      )}
    </div>
  );
}
