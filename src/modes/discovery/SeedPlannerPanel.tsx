/**
 * V1BK — SeedPlannerPanel.
 *
 * Local staging surface for the Discovery workbench. Operator declares
 * seeds, validates them, sees a plan summary, copies a Markdown receipt.
 * No device contact. No persistence. No credentials.
 */

import type { JSX } from "react";
import { useMemo, useState } from "react";
import {
  NEXT_ACTION_DETAILS,
  _resetSeedIdCounter,
  buildSeedPlanSummary,
  nextSeedId,
  toSeedPlanMarkdown,
  type SeedEntry,
  type SeedPlatformHint,
  type SeedSourceKind,
  type SeedTransportIntent,
} from "./seedPlanner";
import "./SeedPlannerPanel.css";

export interface SeedPlannerClock {
  /** Returns an ISO 8601 timestamp. Injectable for tests. */
  now(): string;
}

export interface SeedPlannerClipboard {
  /** Promise-based clipboard write. Injectable for tests. */
  writeText(text: string): Promise<void>;
}

const DEFAULT_CLOCK: SeedPlannerClock = {
  now: () => new Date().toISOString(),
};

const DEFAULT_CLIPBOARD: SeedPlannerClipboard = {
  writeText: (t) => navigator.clipboard.writeText(t),
};

const PLATFORMS: ReadonlyArray<SeedPlatformHint> = [
  "iosxe",
  "iosxr",
  "nxos",
  "eos",
  "junos",
  "fortios",
  "panos",
  "mikrotik",
  "vrp",
  "sros",
  "aoscx",
  "vyos",
  "checkpoint",
  "unknown",
];

const TRANSPORTS: ReadonlyArray<SeedTransportIntent> = [
  "ssh",
  "snmp",
  "manual",
  "unknown",
];

const SOURCE_KINDS: ReadonlyArray<SeedSourceKind> = [
  "seed_device",
  "ip_range",
  "manual",
  "evidence",
];

export interface SeedPlannerPanelProps {
  readonly clock?: SeedPlannerClock;
  readonly clipboard?: SeedPlannerClipboard;
}

export function SeedPlannerPanel({
  clock = DEFAULT_CLOCK,
  clipboard = DEFAULT_CLIPBOARD,
}: SeedPlannerPanelProps): JSX.Element {
  // Reset id counter once per component instance so tests / dev reloads
  // produce stable ids from the start of a session.
  useMemo(() => {
    _resetSeedIdCounter();
  }, []);

  const [seeds, setSeeds] = useState<ReadonlyArray<SeedEntry>>([]);

  const [formHost, setFormHost] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formPlatform, setFormPlatform] = useState<SeedPlatformHint>("iosxe");
  const [formTransport, setFormTransport] = useState<SeedTransportIntent>("ssh");
  const [formPort, setFormPort] = useState<string>("22");
  const [formCredLabel, setFormCredLabel] = useState("");
  const [formSourceKind, setFormSourceKind] =
    useState<SeedSourceKind>("seed_device");
  const [formNotes, setFormNotes] = useState("");

  const [copied, setCopied] = useState(false);

  const summary = useMemo(
    () => buildSeedPlanSummary(seeds, clock.now()),
    [seeds, clock],
  );

  const markdown = useMemo(() => toSeedPlanMarkdown(summary), [summary]);

  const handleAddSeed = (): void => {
    const portNum = formPort.trim().length === 0 ? null : Number(formPort);
    const entry: SeedEntry = {
      id: nextSeedId(),
      host_or_cidr: formHost.trim(),
      label: formLabel.trim(),
      platform_hint: formPlatform,
      transport_intent: formTransport,
      port: portNum,
      credential_profile_label: formCredLabel.trim(),
      source_kind: formSourceKind,
      notes: formNotes.trim(),
      enabled: true,
    };
    setSeeds((current) => [...current, entry]);
    setFormHost("");
    setFormLabel("");
    setFormCredLabel("");
    setFormNotes("");
  };

  const handleToggleEnabled = (id: string): void => {
    setSeeds((current) =>
      current.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const handleRemove = (id: string): void => {
    setSeeds((current) => current.filter((s) => s.id !== id));
  };

  const handleCopy = async (): Promise<void> => {
    try {
      await clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write failed — surface visibly without throwing.
      setCopied(false);
    }
  };

  return (
    <div className="seed-planner" data-testid="seed-planner">
      <section className="sp-form" data-testid="seed-planner-form">
        <h3 className="sp-section-title">Add Seed</h3>
        <div className="sp-form-grid">
          <label className="sp-field">
            <span>Host / CIDR</span>
            <input
              type="text"
              value={formHost}
              onChange={(e) => setFormHost(e.currentTarget.value)}
              placeholder="10.0.0.1 or 10.0.0.0/24"
              data-testid="seed-planner-host"
            />
          </label>
          <label className="sp-field">
            <span>Label</span>
            <input
              type="text"
              value={formLabel}
              onChange={(e) => setFormLabel(e.currentTarget.value)}
              placeholder="edge-1"
            />
          </label>
          <label className="sp-field">
            <span>Platform</span>
            <select
              value={formPlatform}
              onChange={(e) =>
                setFormPlatform(e.currentTarget.value as SeedPlatformHint)
              }
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="sp-field">
            <span>Transport</span>
            <select
              value={formTransport}
              onChange={(e) =>
                setFormTransport(e.currentTarget.value as SeedTransportIntent)
              }
            >
              {TRANSPORTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="sp-field">
            <span>Port</span>
            <input
              type="number"
              value={formPort}
              onChange={(e) => setFormPort(e.currentTarget.value)}
              min={1}
              max={65535}
            />
          </label>
          <label className="sp-field">
            <span>Credential profile (label)</span>
            <input
              type="text"
              value={formCredLabel}
              onChange={(e) => setFormCredLabel(e.currentTarget.value)}
              placeholder="lab-default"
            />
          </label>
          <label className="sp-field">
            <span>Source kind</span>
            <select
              value={formSourceKind}
              onChange={(e) =>
                setFormSourceKind(e.currentTarget.value as SeedSourceKind)
              }
            >
              {SOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="sp-field sp-field--wide">
            <span>Notes</span>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.currentTarget.value)}
            />
          </label>
        </div>
        <div className="sp-form-actions">
          <button
            type="button"
            className="sp-btn sp-btn-primary"
            onClick={handleAddSeed}
            data-testid="seed-planner-add"
          >
            Add Seed
          </button>
        </div>
      </section>

      <section className="sp-summary" data-testid="seed-planner-summary">
        <h3 className="sp-section-title">Plan Summary</h3>
        <dl className="sp-summary-grid">
          <dt>Active</dt>
          <dd data-testid="seed-planner-active-count">{summary.active_count}</dd>
          <dt>Valid</dt>
          <dd>{summary.valid_count}</dd>
          <dt>Invalid</dt>
          <dd>{summary.invalid_count}</dd>
          <dt>Disabled</dt>
          <dd>{summary.disabled_count}</dd>
          <dt>Next action</dt>
          <dd data-testid="seed-planner-next-action">{summary.next_action}</dd>
        </dl>
        <p className="sp-next-action-detail">
          {NEXT_ACTION_DETAILS[summary.next_action]}
        </p>
      </section>

      {summary.seeds.length > 0 && (
        <section className="sp-table-section" data-testid="seed-planner-table-section">
          <h3 className="sp-section-title">Seeds ({summary.seeds.length})</h3>
          <table className="sp-table" data-testid="seed-planner-table">
            <thead>
              <tr>
                <th>Host / CIDR</th>
                <th>Label</th>
                <th>Platform</th>
                <th>Transport</th>
                <th>Port</th>
                <th>Source</th>
                <th>Cred profile</th>
                <th>State</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {summary.seeds.map((s) => {
                const hasIssue = summary.issues.some((i) => i.seed_id === s.id);
                return (
                  <tr
                    key={s.id}
                    data-testid={`seed-row-${s.id}`}
                    className={hasIssue ? "sp-row sp-row--invalid" : "sp-row"}
                  >
                    <td>{s.host_or_cidr || "—"}</td>
                    <td>{s.label || "—"}</td>
                    <td>{s.platform_hint}</td>
                    <td>{s.transport_intent}</td>
                    <td>{s.port ?? "—"}</td>
                    <td>{s.source_kind}</td>
                    <td>{s.credential_profile_label || "—"}</td>
                    <td>
                      {hasIssue ? (
                        <span
                          className="sp-badge sp-badge--invalid"
                          data-testid={`seed-badge-${s.id}`}
                        >
                          invalid
                        </span>
                      ) : s.enabled ? (
                        <span className="sp-badge sp-badge--ok">active</span>
                      ) : (
                        <span className="sp-badge sp-badge--idle">disabled</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sp-btn sp-btn-sm"
                        onClick={() => handleToggleEnabled(s.id)}
                        data-testid={`seed-toggle-${s.id}`}
                      >
                        {s.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="sp-btn sp-btn-sm sp-btn-danger"
                        onClick={() => handleRemove(s.id)}
                        data-testid={`seed-remove-${s.id}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {summary.issues.length > 0 && (
        <section className="sp-issues" data-testid="seed-planner-issues">
          <h3 className="sp-section-title">Issues</h3>
          <ul>
            {summary.issues.map((i, idx) => (
              <li key={`${i.seed_id}-${i.kind}-${idx}`}>
                <strong>[{i.kind}]</strong> {i.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.warnings.length > 0 && (
        <section className="sp-warnings" data-testid="seed-planner-warnings">
          <h3 className="sp-section-title">Warnings</h3>
          <ul>
            {summary.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="sp-receipt" data-testid="seed-planner-receipt">
        <div className="sp-receipt-actions">
          <button
            type="button"
            className="sp-btn"
            onClick={() => {
              void handleCopy();
            }}
            data-testid="seed-planner-copy"
          >
            {copied ? "Copied" : "Copy Seed Plan"}
          </button>
        </div>
        <details className="sp-receipt-preview">
          <summary>Preview (Markdown)</summary>
          <pre
            className="sp-receipt-md"
            data-testid="seed-planner-md-preview"
          >
            {markdown}
          </pre>
        </details>
      </section>
    </div>
  );
}
