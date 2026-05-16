import type { JSX } from "react";
import type {
  ReceiptArea,
  ReceiptUnknown,
  ReceiptView,
} from "../../../types/receipt";

export interface ReceiptDisplayProps {
  readonly receipt: ReceiptView;
  readonly isManualOverride: boolean;
}

export function ReceiptDisplay(props: ReceiptDisplayProps): JSX.Element {
  const { receipt, isManualOverride } = props;
  return (
    <section className="intake-receipt" aria-label="Parse receipt">
      <header className="intake-section__header">
        <div className="intake-section__title">RECEIPT</div>
        <div className="intake-section__meta">
          parser {fallback(receipt.parser_version)} · registry {fallback(receipt.registry_version)}
        </div>
      </header>

      <div className="intake-receipt__grid">
        <Field k="Hostname" v={receipt.hostname} />
        <Field k="Platform id" v={receipt.platform_id} />
        <Field k="OS version" v={receipt.os_version} />
        <Field
          k="Source"
          v={
            receipt.source != null
              ? `${receipt.source}${receipt.source_kind ? ` (${receipt.source_kind})` : ""}`
              : null
          }
        />
        <Field k="Byte size" v={receipt.byte_size?.toLocaleString("en-US") ?? null} />
        <Field k="Line count" v={receipt.line_count?.toLocaleString("en-US") ?? null} />
        <Field
          k="Score"
          v={receipt.score != null ? receipt.score.toFixed(3) : null}
        />
        <Field
          k="Coverage"
          v={`${(receipt.coverage_ratio * 100).toFixed(1)} % (${receipt.parsed_line_count.toLocaleString("en-US")} parsed / ${receipt.unknown_line_count.toLocaleString("en-US")} unknown)`}
        />
        <Field k="Observed maturity" v={receipt.observed_maturity ?? null} />
        <Field
          k="Selection mode"
          v={isManualOverride ? "manual override" : "from detection"}
        />
      </div>

      <AreaList areas={receipt.areas} />

      <WarningList warnings={receipt.warnings} />

      <UnknownList unknowns={receipt.unknowns} truncated={receipt.unknowns_truncated} />
    </section>
  );
}

function Field({ k, v }: { readonly k: string; readonly v: string | null | undefined }): JSX.Element {
  return (
    <div className="intake-kv">
      <div className="intake-kv__k">{k}</div>
      <div className="intake-kv__v">
        {v == null || v === "" ? <span className="intake-muted">(not set)</span> : v}
      </div>
    </div>
  );
}

function AreaList({ areas }: { readonly areas: ReadonlyArray<ReceiptArea> }): JSX.Element {
  return (
    <div className="intake-subblock">
      <div className="intake-subblock__title">AREAS ({areas.length})</div>
      {areas.length === 0 ? (
        <div className="intake-empty">(none)</div>
      ) : (
        <table className="intake-table" aria-label="Coverage areas">
          <thead>
            <tr>
              <th>Area</th>
              <th>Status</th>
              <th>Populated</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>
                  <span className={`intake-tag intake-tag--area-${a.status}`}>
                    {a.status}
                  </span>
                </td>
                <td className="intake-num">{a.populated_count.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function WarningList({ warnings }: { readonly warnings: ReadonlyArray<string> }): JSX.Element {
  return (
    <div className="intake-subblock">
      <div className="intake-subblock__title">PARSER WARNINGS ({warnings.length})</div>
      {warnings.length === 0 ? (
        <div className="intake-empty">(none)</div>
      ) : (
        <ul className="intake-list">
          {warnings.map((w, i) => (
            <li key={i} className="intake-list__item intake-mono">
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UnknownList({
  unknowns,
  truncated,
}: {
  readonly unknowns: ReadonlyArray<ReceiptUnknown>;
  readonly truncated: boolean;
}): JSX.Element {
  return (
    <div className="intake-subblock">
      <div className="intake-subblock__title">
        UNKNOWN LINES ({unknowns.length}
        {truncated && <span className="intake-tag intake-tag--warn">TRUNCATED</span>})
      </div>
      {unknowns.length === 0 ? (
        <div className="intake-empty">(none)</div>
      ) : (
        <table className="intake-table" aria-label="Unknown lines">
          <thead>
            <tr>
              <th>Lines</th>
              <th>Context</th>
              <th>Reason</th>
              <th>Raw</th>
            </tr>
          </thead>
          <tbody>
            {unknowns.map((u, i) => (
              <tr key={i}>
                <td className="intake-num">{formatLineRange(u)}</td>
                <td>{u.context_path ?? <span className="intake-muted">(root)</span>}</td>
                <td>
                  {u.reason != null ? (
                    <span className="intake-tag intake-tag--cat">{u.reason}</span>
                  ) : (
                    <span className="intake-muted">(unset)</span>
                  )}
                </td>
                <td className="intake-mono">{u.raw}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatLineRange(u: ReceiptUnknown): string {
  if (u.line_start == null && u.line_end == null) return "(unknown)";
  if (u.line_start != null && u.line_end != null && u.line_start !== u.line_end) {
    return `${u.line_start}–${u.line_end}`;
  }
  return String(u.line_start ?? u.line_end);
}

function fallback(v: string | null): string {
  return v == null || v === "" ? "(not set)" : v;
}
