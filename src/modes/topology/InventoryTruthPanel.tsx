/**
 * V1CG — Inventory Truth Surface panel (preview v0).
 *
 * Read-only operator surface. Renders projected inventory truth rows
 * from V1CD receipts (currently sourced from V1CF demo collector +
 * V1CC demo target hints). No persistence; no merge; no drilldown.
 */

import type { JSX } from "react";
import { listDemoInventoryTruth } from "../../engines/inventoryTruthProjection";
import type {
  InventoryDeviceTruth,
} from "../../types/inventoryTruth";
import "./InventoryTruthPanel.css";

export function InventoryTruthPanel(): JSX.Element {
  const rows = listDemoInventoryTruth();

  return (
    <section
      className="iv-panel"
      data-testid="iv-panel"
      aria-label="Inventory truth (preview)"
    >
      <header className="iv-panel-head">
        <h3 className="iv-panel-title">Inventory Truth (V1CG)</h3>
        <span className="iv-panel-stub-tag">preview · v0 · no merge</span>
      </header>
      <p className="iv-panel-sub">
        First operator-visible answer to <strong>"What do I actually have?"</strong>
        — projected from V1CD receipts. V1CG carries proof (receipt id + evidence
        refs). Multi-source merge + confidence lands in V1CH; evidence drilldown
        in V1CI.
      </p>

      {rows.length === 0 ? (
        <p
          className="iv-empty"
          data-testid="iv-empty"
          role="status"
        >
          No inventory rows projected yet. Run a V1CF single-device collector
          first.
        </p>
      ) : (
        <ul className="iv-list" data-testid="iv-list">
          {rows.map((r) => (
            <DeviceRow key={r.id} row={r} />
          ))}
        </ul>
      )}

      <footer className="iv-panel-foot">
        State at v0 is <code>unknown</code> for projected rows. V1BU device
        state ramp will plug in once topology + inventory truth merge.
      </footer>
    </section>
  );
}

function DeviceRow({ row }: { readonly row: InventoryDeviceTruth }): JSX.Element {
  return (
    <li
      className="iv-row"
      data-testid={`iv-row-${row.device_id}`}
      data-source-kind={row.source_kind}
    >
      <header className="iv-row-head">
        <h4 className="iv-row-title">
          {row.hostname ?? row.device_id}
        </h4>
        <span
          className="iv-row-pill"
          data-source-kind={row.source_kind}
          data-testid={`iv-row-source-${row.device_id}`}
        >
          {row.source_kind}
        </span>
        {row.method && (
          <span className="iv-row-pill" data-state="method">
            {row.method}
          </span>
        )}
        <span
          className="iv-row-pill"
          data-state="state"
          data-testid={`iv-row-state-${row.device_id}`}
        >
          {row.state}
        </span>
        {row.confidence !== null && (
          <span
            className="iv-row-pill"
            data-state="conf"
            data-testid={`iv-row-conf-${row.device_id}`}
          >
            conf {(row.confidence * 100).toFixed(0)}%
          </span>
        )}
      </header>
      <dl className="iv-row-grid">
        <Pair label="Device" value={row.device_id} mono />
        <Pair label="Vendor" value={row.vendor} />
        <Pair label="Platform" value={row.platform} mono />
        <Pair label="OS" value={joinOs(row.os_family, row.os_version)} mono />
        <Pair label="Role" value={row.role} />
        <Pair label="Site" value={row.site} />
        <Pair label="Zone" value={row.zone} />
        <Pair label="Last observed" value={row.last_observed} mono />
      </dl>
      <section className="iv-row-proof">
        <h5 className="iv-row-proof-title">Proof</h5>
        <p
          className="iv-row-proof-line"
          data-testid={`iv-row-proof-${row.device_id}`}
        >
          {row.receipt_ids.length} receipt{row.receipt_ids.length === 1 ? "" : "s"} ·{" "}
          {row.evidence_refs.length} evidence ref
          {row.evidence_refs.length === 1 ? "" : "s"}
        </p>
        <ul className="iv-row-proof-list">
          {row.evidence_refs.map((ref) => (
            <li
              key={ref.evidence_id}
              data-testid={`iv-row-proof-ref-${row.device_id}-${ref.fact}`}
            >
              <span className="iv-proof-fact">{ref.fact}</span>
              <code className="iv-proof-id">{ref.evidence_id}</code>
              <code className="iv-proof-receipt">{ref.receipt_id}</code>
            </li>
          ))}
        </ul>
      </section>
    </li>
  );
}

function Pair({
  label,
  value,
  mono = false,
}: {
  readonly label: string;
  readonly value: string | null;
  readonly mono?: boolean;
}): JSX.Element {
  return (
    <div className="iv-pair">
      <dt>{label}</dt>
      <dd className={mono ? "iv-pair-val iv-pair-val--mono" : "iv-pair-val"}>
        {value === null || value === "" ? (
          <span className="iv-muted">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function joinOs(family: string | null, version: string | null): string | null {
  if (!family && !version) return null;
  if (!family) return version;
  if (!version) return family;
  return `${family} ${version}`;
}
