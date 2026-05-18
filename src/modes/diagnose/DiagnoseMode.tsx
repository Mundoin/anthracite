/**
 * Diagnose Mode — operator answers v1 (V1AW).
 *
 * Surfaces deterministic answers from existing parsed/imported data.
 * Pure-frontend; uses the V1AW projection module. No engine wire
 * types, no Tauri command, no live collection.
 *
 * Doctrine: `docs/architecture/DIAGNOSE_SEED_CONTRACT.md`.
 */

import type { JSX } from "react";
import { useMemo, useState } from "react";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import type { DiscoverySourceView } from "../../data/discoverySource";
import type { TopologySourceView } from "../../data/topologySource";
import { projectDiagnose } from "./diagnoseProjection";
import {
  DIAGNOSE_CATEGORY_LABELS,
  DIAGNOSE_SEVERITY_LABELS,
  type DiagnoseAnswer,
  type DiagnoseCategory,
  type DiagnoseSeverity,
} from "./diagnoseTypes";
import "./DiagnoseMode.css";

export interface DiagnoseModeProps {
  readonly discovery: DiscoverySourceView;
  readonly topology: TopologySourceView;
}

export function DiagnoseMode({
  discovery,
  topology,
}: DiagnoseModeProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const model = useMemo(
    () =>
      projectDiagnose({
        devices: discovery.view?.records ?? [],
        topology: topology.view,
      }),
    [discovery.view, topology.view],
  );

  const selectedAnswer: DiagnoseAnswer | null = useMemo(
    () =>
      selectedId === null
        ? null
        : model.answers.find((a) => a.id === selectedId) ?? null,
    [model.answers, selectedId],
  );

  const sourceState =
    discovery.sourceState === "real" || topology.sourceState === "real"
      ? discovery.sourceState === "real"
        ? discovery.sourceState
        : topology.sourceState
      : discovery.sourceState;

  return (
    <div className="diagnose-mode">
      <header className="dx-header">
        <h2 className="dx-title">
          Diagnose <DataSourceTag state={sourceState} />
        </h2>
        <p className="dx-scope">
          Scope: {discovery.environmentId ?? topology.environmentId ?? "All environments"}
        </p>
        <p className="dx-tagline">
          What should I inspect first, and why?
        </p>
      </header>

      <section className="dx-summary" data-testid="dx-summary">
        <span className="dx-summary-cell" data-testid="dx-summary-total">
          <span className="dx-summary-label">Total answers</span>
          <span className="dx-summary-value">{model.summary.total_answers}</span>
        </span>
        <span className="dx-summary-cell" data-testid="dx-summary-critical">
          <span className="dx-summary-label">Critical</span>
          <span className="dx-summary-value dx-summary-value--critical">
            {model.summary.critical_count}
          </span>
        </span>
        <span className="dx-summary-cell" data-testid="dx-summary-warning">
          <span className="dx-summary-label">Warning</span>
          <span className="dx-summary-value dx-summary-value--warning">
            {model.summary.warning_count}
          </span>
        </span>
        <span className="dx-summary-cell" data-testid="dx-summary-info">
          <span className="dx-summary-label">Info</span>
          <span className="dx-summary-value dx-summary-value--info">
            {model.summary.info_count}
          </span>
        </span>
        {model.summary.per_category.length > 0 && (
          <span className="dx-summary-cell dx-summary-cats" data-testid="dx-summary-categories">
            <span className="dx-summary-label">By category</span>
            <span className="dx-summary-value">
              {model.summary.per_category
                .map((c) => `${DIAGNOSE_CATEGORY_LABELS[c.category]}:${c.count}`)
                .join(" · ")}
            </span>
          </span>
        )}
      </section>

      {model.is_empty_input ? (
        <section
          className="dx-body dx-body--empty"
          role="status"
          aria-label="Diagnose empty"
          data-testid="dx-empty"
        >
          <p>
            Import or select a parsed run to generate deterministic
            diagnostic answers.
          </p>
          <p className="dx-muted">
            Diagnose Seed consumes Discovery inventory and Topology view
            data already loaded by the app. Use INTAKE to import device
            configs, then return here.
          </p>
        </section>
      ) : model.answers.length === 0 ? (
        <section
          className="dx-body dx-body--clean"
          role="status"
          aria-label="No diagnostic answers"
          data-testid="dx-clean"
        >
          <p>No diagnostic answers from current data.</p>
          <p className="dx-muted">
            Telnet, identity, interface, parser-scope, platform-support,
            and topology-evidence rules all came back empty for the
            loaded inventory and topology view.
          </p>
        </section>
      ) : (
        <div className="dx-grid">
          <section className="dx-list" data-testid="dx-list" aria-label="Diagnose answers">
            {model.answers.map((a) => (
              <AnswerCard
                key={a.id}
                answer={a}
                isSelected={selectedId === a.id}
                onSelect={() => setSelectedId(a.id)}
              />
            ))}
          </section>
          <section
            className="dx-inspector"
            data-testid="dx-inspector"
            aria-label="Selected answer inspector"
          >
            {selectedAnswer === null ? (
              <p
                className="dx-muted"
                data-testid="dx-inspector-empty"
              >
                Select an answer to inspect its evidence and suggested next step.
              </p>
            ) : (
              <SelectedAnswer answer={selectedAnswer} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

interface AnswerCardProps {
  readonly answer: DiagnoseAnswer;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

function AnswerCard({ answer, isSelected, onSelect }: AnswerCardProps): JSX.Element {
  return (
    <button
      type="button"
      className={
        isSelected ? "dx-card dx-card--selected" : "dx-card"
      }
      data-testid={`dx-answer-${answer.id}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <header className="dx-card-header">
        <SeverityChip severity={answer.severity} />
        <CategoryChip category={answer.category} />
      </header>
      <h3 className="dx-card-title">{answer.title}</h3>
      {answer.affected_devices.length > 0 && (
        <p className="dx-card-sub">
          {answer.affected_devices.length === 1
            ? `Device: ${answer.affected_devices[0]}`
            : `Devices: ${answer.affected_devices.slice(0, 3).join(", ")}${
                answer.affected_devices.length > 3
                  ? ` (+${answer.affected_devices.length - 3})`
                  : ""
              }`}
        </p>
      )}
      <p className="dx-card-why">{answer.why_it_matters}</p>
    </button>
  );
}

function SelectedAnswer({ answer }: { readonly answer: DiagnoseAnswer }): JSX.Element {
  return (
    <article className="dx-inspector-inner">
      <header className="dx-inspector-header">
        <SeverityChip severity={answer.severity} />
        <CategoryChip category={answer.category} />
      </header>
      <h3 className="dx-inspector-title" data-testid="dx-inspector-title">
        {answer.title}
      </h3>
      {answer.affected_devices.length > 0 && (
        <p className="dx-inspector-affected" data-testid="dx-inspector-affected">
          <strong>Affected:</strong> {answer.affected_devices.join(", ")}
        </p>
      )}
      <section className="dx-inspector-section">
        <h4 className="dx-inspector-subheading">Why it matters</h4>
        <p data-testid="dx-inspector-why">{answer.why_it_matters}</p>
      </section>
      <section className="dx-inspector-section">
        <h4 className="dx-inspector-subheading">Evidence</h4>
        {answer.evidence.length === 0 ? (
          <p className="dx-muted">No evidence retained.</p>
        ) : (
          <dl className="dx-evidence">
            {answer.evidence.map((e, idx) => (
              <div key={`${e.label}-${idx}`} className="dx-evidence-row" data-testid={`dx-evidence-${idx}`}>
                <dt>{e.label}</dt>
                <dd>
                  <code>{e.value}</code>
                  {e.source !== null && (
                    <span className="dx-evidence-source"> · {e.source}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <section className="dx-inspector-section">
        <h4 className="dx-inspector-subheading">Suggested inspection target</h4>
        <p data-testid="dx-inspector-target">{answer.suggested_inspection_target}</p>
      </section>
      {answer.source_label !== null && (
        <p className="dx-inspector-source" data-testid="dx-inspector-source">
          Source: <code>{answer.source_label}</code>
        </p>
      )}
    </article>
  );
}

function SeverityChip({ severity }: { readonly severity: DiagnoseSeverity }): JSX.Element {
  return (
    <span
      className={`dx-chip dx-chip--${severity}`}
      data-testid={`dx-severity-${severity}`}
    >
      {DIAGNOSE_SEVERITY_LABELS[severity]}
    </span>
  );
}

function CategoryChip({ category }: { readonly category: DiagnoseCategory }): JSX.Element {
  return (
    <span
      className="dx-chip dx-chip--category"
      data-testid={`dx-category-${category}`}
    >
      {DIAGNOSE_CATEGORY_LABELS[category]}
    </span>
  );
}
