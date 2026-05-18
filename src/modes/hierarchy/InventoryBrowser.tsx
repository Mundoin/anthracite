import { useEffect, useState, type JSX } from "react";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import type { DiscoverySourceView } from "../../data/discoverySource";
import type { DiscoveryDeviceRecord } from "../../types/discovery";
import "./InventoryBrowser.css";

export interface InventoryBrowserProps {
  readonly discovery: DiscoverySourceView;
}

export function InventoryBrowser({ discovery }: InventoryBrowserProps): JSX.Element {
  const records = discovery.view?.records ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(
    records.length > 0 ? records[0]!.id : null,
  );

  // Snap selection to first record when the underlying list shape changes
  // (env switch, refresh after import). Honest selection: never points to a
  // record that no longer exists in the current view.
  useEffect(() => {
    if (records.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null || !records.some((r) => r.id === selectedId)) {
      setSelectedId(records[0]!.id);
    }
    // Watch by identity so env switch / refresh triggers a check.
  }, [records, selectedId]);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="inv-browser">
      <header className="inv-browser__header">
        <h2 className="inv-browser__title">
          Discovery Inventory <DataSourceTag state={discovery.sourceState} />
        </h2>
        <p className="inv-browser__scope">
          Scope: {discovery.environmentId ?? "All environments"}
        </p>
      </header>

      <section className="inv-browser__summary" data-testid="inv-summary">
        <span className="inv-browser__summary-cell">
          <span className="inv-browser__summary-label">Devices</span>
          <span className="inv-browser__summary-value">{records.length}</span>
        </span>
        <span className="inv-browser__summary-cell">
          <span className="inv-browser__summary-label">Total records</span>
          <span className="inv-browser__summary-value">{discovery.totalRecords}</span>
        </span>
        <span className="inv-browser__summary-message">{discovery.message}</span>
      </section>

      {discovery.view === null ? (
        <section
          className="inv-browser__body inv-browser__body--unavailable"
          role="status"
          aria-label="Inventory unavailable"
        >
          <p>Discovery source is not available right now.</p>
          <p className="inv-browser__muted">{discovery.message}</p>
        </section>
      ) : records.length === 0 ? (
        <section
          className="inv-browser__body inv-browser__body--empty"
          role="status"
          aria-label="Inventory empty"
        >
          <p>No devices imported yet for this environment.</p>
          <p className="inv-browser__muted">
            Use INTAKE to parse configs and import them into Discovery.
          </p>
        </section>
      ) : (
        <section className="inv-browser__body inv-browser__body--records">
          <div className="inv-browser__list" data-testid="inv-list">
            <div className="inv-browser__list-head">
              <span>Hostname</span>
              <span>Vendor</span>
              <span>Platform</span>
              <span>Source</span>
            </div>
            <ul className="inv-browser__rows">
              {records.map((record) => (
                <InventoryRow
                  key={record.id}
                  record={record}
                  selected={record.id === selectedId}
                  onSelect={() => setSelectedId(record.id)}
                />
              ))}
            </ul>
          </div>
          <div className="inv-browser__detail" data-testid="inv-detail">
            {selected ? (
              <InventoryDetail record={selected} />
            ) : (
              <p className="inv-browser__muted">Select a device.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

interface InventoryRowProps {
  readonly record: DiscoveryDeviceRecord;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

function InventoryRow({ record, selected, onSelect }: InventoryRowProps): JSX.Element {
  const hostname = record.device_model.identity.hostname ?? "—";
  const vendor = record.device_model.platform.vendor ?? "—";
  const platformId = record.device_model.platform.platform_id ?? "—";
  const source = record.source_label ?? record.source_kind ?? "—";
  return (
    <li
      className={
        "inv-browser__row" + (selected ? " inv-browser__row--selected" : "")
      }
      data-testid={`inv-row-${record.id}`}
    >
      <button
        type="button"
        className="inv-browser__row-button"
        onClick={onSelect}
        aria-label={`Select device ${hostname}`}
        aria-pressed={selected}
      >
        <span className="inv-browser__cell inv-browser__cell--hostname">{hostname}</span>
        <span className="inv-browser__cell">{vendor}</span>
        <span className="inv-browser__cell">{platformId}</span>
        <span className="inv-browser__cell inv-browser__cell--muted">{source}</span>
      </button>
    </li>
  );
}

interface InventoryDetailProps {
  readonly record: DiscoveryDeviceRecord;
}

function InventoryDetail({ record }: InventoryDetailProps): JSX.Element {
  const identity = record.device_model.identity;
  const platform = record.device_model.platform;
  const rows: ReadonlyArray<readonly [string, string]> = [
    ["Record ID", record.id],
    ["Environment", record.environment_id],
    ["Hostname", identity.hostname ?? "—"],
    ["Chassis", identity.chassis ?? "—"],
    ["Vendor", platform.vendor ?? "—"],
    ["Platform", platform.platform_id ?? "—"],
    ["OS family", platform.os_family ?? "—"],
    ["OS version", platform.os_version_normalized ?? "—"],
    ["Source kind", record.source_kind],
    ["Source label", record.source_label ?? "—"],
    ["Slice ID", record.slice_id ?? "—"],
    [
      "Confidence",
      record.confidence != null ? record.confidence.toFixed(2) : "—",
    ],
    ["Last seen", record.last_seen ?? "—"],
  ];
  return (
    <dl className="inv-browser__detail-list">
      {rows.map(([k, v]) => (
        <div key={k} className="inv-browser__detail-row">
          <dt className="inv-browser__detail-key">{k}</dt>
          <dd className="inv-browser__detail-value">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
