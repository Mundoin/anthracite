/**
 * V1CC — Collection Targets panel (preview / read-only).
 *
 * Surfaces the v0 collection-target catalogue inside Topology mode.
 * Read-only at v0: the operator can see the model + the validator
 * verdict but no contact runs. Future stages will replace this with
 * an editable surface backed by persistence.
 */

import type { JSX } from "react";
import {
  listCollectionTargets,
  validateCollectionTargetCatalogue,
} from "../../engines/collectionTargetCatalogue";
import type {
  CollectionTarget,
  CollectionTargetValidationResult,
} from "../../types/collectionTarget";
import "./CollectionTargetsPanel.css";

export function CollectionTargetsPanel(): JSX.Element {
  const targets = listCollectionTargets();
  const audit = validateCollectionTargetCatalogue(targets);
  const issueIndex = new Map<string, CollectionTargetValidationResult>(
    audit.per_target.map((p) => [p.id, p.result]),
  );

  return (
    <section
      className="ct-panel"
      data-testid="ct-panel"
      aria-label="Collection targets (preview)"
    >
      <header className="ct-panel-head">
        <h3 className="ct-panel-title">Collection Targets</h3>
        <span className="ct-panel-stub-tag">preview · v0</span>
      </header>
      <p className="ct-panel-sub">
        Typed read-only target model (V1CC). No live contact yet. Receipts land
        in V1CD; single-device collector in V1CE/V1CF.
      </p>
      <p className="ct-panel-audit" data-testid="ct-panel-audit">
        Catalogue: <strong>{audit.ok ? "valid" : "issues"}</strong> ·{" "}
        {targets.length} target{targets.length === 1 ? "" : "s"}
      </p>

      <ul className="ct-list" data-testid="ct-list">
        {targets.map((t) => (
          <TargetCard
            key={t.id}
            target={t}
            verdict={issueIndex.get(t.id) ?? { ok: true, issues: [] }}
          />
        ))}
      </ul>

      <footer className="ct-panel-foot">
        Read-only enforced at the validator level. Credentials are reference
        ids; plaintext secrets are rejected by the model.
      </footer>
    </section>
  );
}

interface TargetCardProps {
  readonly target: CollectionTarget;
  readonly verdict: CollectionTargetValidationResult;
}

function TargetCard({ target, verdict }: TargetCardProps): JSX.Element {
  return (
    <li
      className="ct-card"
      data-testid={`ct-card-${target.id}`}
      data-enabled={target.enabled ? "true" : "false"}
    >
      <header className="ct-card-head">
        <div className="ct-card-head-left">
          <h4 className="ct-card-title">{target.name}</h4>
          <span
            className="ct-card-pill"
            data-state={verdict.ok ? "ok" : "issues"}
            data-testid={`ct-card-verdict-${target.id}`}
          >
            {verdict.ok ? "valid" : `${verdict.issues.length} issue${verdict.issues.length === 1 ? "" : "s"}`}
          </span>
          <span className="ct-card-pill" data-state="ro">read-only</span>
          {!target.enabled && (
            <span className="ct-card-pill" data-state="disabled">
              disabled
            </span>
          )}
        </div>
        <code className="ct-card-id">{target.id}</code>
      </header>

      {target.description && (
        <p className="ct-card-desc">{target.description}</p>
      )}

      <dl className="ct-rows">
        <Row label="Seed">
          <code>
            {target.seed.kind}:{target.seed.value}
          </code>
        </Row>
        <Row label="Access">
          {target.access_methods.map((m) => (
            <span key={m} className="ct-chip">
              {m}
            </span>
          ))}
        </Row>
        <Row label="Credential">
          {target.credential_ref ? (
            <code data-testid={`ct-card-cred-${target.id}`}>
              {target.credential_ref}
            </code>
          ) : (
            <span className="ct-muted">— none bound —</span>
          )}
        </Row>
        <Row label="Scope">
          {target.scope.map((s) => (
            <span key={s} className="ct-chip">
              {s}
            </span>
          ))}
        </Row>
        <Row label="Hints">
          {hintCells(target).length === 0 ? (
            <span className="ct-muted">—</span>
          ) : (
            hintCells(target).map(([k, v]) => (
              <span key={k} className="ct-chip">
                <span className="ct-chip-key">{k}</span>
                <span className="ct-chip-val">{v}</span>
              </span>
            ))
          )}
        </Row>
        <Row label="Policy">
          <span className="ct-chip">attempts {target.contact_policy.max_attempts}</span>
          <span className="ct-chip">timeout {target.contact_policy.timeout_ms}ms</span>
          <span className="ct-chip">
            neighbour {target.contact_policy.allow_neighbor_expansion ? "yes" : "no"}
          </span>
          {target.contact_policy.scope_limit !== null && (
            <span className="ct-chip">
              limit {target.contact_policy.scope_limit}
            </span>
          )}
        </Row>
      </dl>

      {!verdict.ok && (
        <ul className="ct-card-issues" data-testid={`ct-card-issues-${target.id}`}>
          {verdict.issues.map((i, idx) => (
            <li key={`${i.field}-${idx}`}>
              <strong>{i.field}</strong> — {i.message}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Row({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="ct-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function hintCells(t: CollectionTarget): ReadonlyArray<readonly [string, string]> {
  const h = t.hints;
  const out: Array<readonly [string, string]> = [];
  for (const k of ["vendor", "platform", "role", "site", "zone"] as const) {
    const v = h[k];
    if (v !== undefined && v !== null && v !== "") out.push([k, v]);
  }
  return out;
}
