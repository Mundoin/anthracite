import { type JSX, useMemo } from "react";
import { useEnvironmentLifecycle } from "../../../state/EnvironmentLifecycleContext";
import type { EnvironmentsToolId } from "../EnvironmentsMode";
import { evaluateEnvironmentReadiness } from "../../../engines/environmentReadiness";
import { AnthButton } from "../../../components/shared/AnthButton";
import "./DossierPanel.css";

interface DossierPanelProps {
  readonly onNavigate?: (toolId: EnvironmentsToolId) => void;
}

export function DossierPanel({ onNavigate }: DossierPanelProps): JSX.Element {
  const lifecycle = useEnvironmentLifecycle();
  const active = lifecycle.active;

  const readinessVerdict = useMemo(() => {
    return evaluateEnvironmentReadiness(active);
  }, [active]);

  // Compute vendor mix
  const vendorSet = useMemo(() => {
    if (!active) return new Set<string>();
    return new Set(active.lab_payload.devices.map((d) => d.vendor));
  }, [active]);

  // Compute device class mix
  const deviceClassSet = useMemo(() => {
    if (!active) return new Set<string>();
    return new Set(active.lab_payload.devices.map((d) => d.device_class));
  }, [active]);

  // Compute interface count
  const interfaceCount = useMemo(() => {
    if (!active) return 0;
    return active.lab_payload.devices.reduce((sum, d) => sum + d.interfaces.length, 0);
  }, [active]);

  // Compute allocated subnet count
  const allocatedSubnetCount = useMemo(() => {
    if (!active) return 0;
    return active.lab_payload.address_plan.allocated.length;
  }, [active]);

  if (!active) {
    return (
      <div className="dossier-panel" data-testid="environments-dossier">
        <div className="dossier-panel__empty">
          <h3>No Active Environment</h3>
          <p>Open Environment Creator to create one.</p>
          {onNavigate && (
            <AnthButton onClick={() => onNavigate("creator")} variant="secondary">
              Open Environment Creator
            </AnthButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dossier-panel" data-testid="environments-dossier">
      <div className="dossier-panel__container">
        <h2 className="dossier-panel__title">{active.name} — Dossier</h2>

        {/* Identity Section */}
        <section className="dossier-panel__section">
          <h3 className="dossier-panel__section-title">Identity</h3>
          <dl className="dossier-panel__grid">
            <dt className="dossier-panel__label">Name</dt>
            <dd className="dossier-panel__value">{active.name}</dd>

            <dt className="dossier-panel__label">Environment ID</dt>
            <dd className="dossier-panel__value dossier-panel__value--mono">{active.environment_id}</dd>

            <dt className="dossier-panel__label">Environment UID</dt>
            <dd className="dossier-panel__value dossier-panel__value--mono">{active.environment_uid}</dd>

            <dt className="dossier-panel__label">Scenario</dt>
            <dd className="dossier-panel__value">{active.scenario_name}</dd>

            <dt className="dossier-panel__label">Scenario ID</dt>
            <dd className="dossier-panel__value dossier-panel__value--mono">{active.scenario_id}</dd>

            <dt className="dossier-panel__label">Source Kind</dt>
            <dd className="dossier-panel__value">{active.lab_payload.source_kind}</dd>

            <dt className="dossier-panel__label">Provenance</dt>
            <dd className="dossier-panel__value">{active.provenance}</dd>

            <dt className="dossier-panel__label">Generator Version</dt>
            <dd className="dossier-panel__value dossier-panel__value--mono">{active.generator_version}</dd>

            <dt className="dossier-panel__label">Created</dt>
            <dd className="dossier-panel__value">{new Date(active.created_at).toLocaleString()}</dd>

            <dt className="dossier-panel__label">Updated</dt>
            <dd className="dossier-panel__value">{new Date(active.updated_at).toLocaleString()}</dd>
          </dl>
        </section>

        {/* Lifecycle Section */}
        <section className="dossier-panel__section">
          <h3 className="dossier-panel__section-title">Lifecycle</h3>
          <div className="dossier-panel__chips-group">
            <span className={`dossier-panel__chip dossier-panel__chip--${active.lifecycle_state}`}>
              {active.lifecycle_state}
            </span>
            <span className={`dossier-panel__chip dossier-panel__chip--sync-${active.sync_state}`}>
              {active.sync_state}
            </span>
          </div>
          <dl className="dossier-panel__grid dossier-panel__grid--secondary">
            <dt className="dossier-panel__label">Revision</dt>
            <dd className="dossier-panel__value">{active.revision}</dd>

            <dt className="dossier-panel__label">Base Revision</dt>
            <dd className="dossier-panel__value">{active.base_revision}</dd>

            <dt className="dossier-panel__label">Last Saved</dt>
            <dd className="dossier-panel__value">
              {active.last_saved_at ? new Date(active.last_saved_at).toLocaleString() : "Never"}
            </dd>
          </dl>
        </section>

        {/* Inventory Section */}
        <section className="dossier-panel__section">
          <h3 className="dossier-panel__section-title">Inventory</h3>
          <div className="dossier-panel__inventory-grid">
            <div className="dossier-panel__inventory-item">
              <span className="dossier-panel__inventory-label">Devices</span>
              <span className="dossier-panel__inventory-value">{active.device_count}</span>
            </div>
            <div className="dossier-panel__inventory-item">
              <span className="dossier-panel__inventory-label">Links</span>
              <span className="dossier-panel__inventory-value">{active.link_count}</span>
            </div>
            <div className="dossier-panel__inventory-item">
              <span className="dossier-panel__inventory-label">Interfaces</span>
              <span className="dossier-panel__inventory-value">{interfaceCount}</span>
            </div>
            <div className="dossier-panel__inventory-item">
              <span className="dossier-panel__inventory-label">Configs</span>
              <span className="dossier-panel__inventory-value">{active.config_count}</span>
            </div>
          </div>
        </section>

        {/* Vendor Mix */}
        <section className="dossier-panel__section">
          <h3 className="dossier-panel__section-title">Vendor Mix</h3>
          <div className="dossier-panel__chips-list">
            {Array.from(vendorSet).map((vendor) => (
              <span key={vendor} className="dossier-panel__chip dossier-panel__chip--vendor">
                {vendor}
              </span>
            ))}
          </div>
        </section>

        {/* Device Class Mix */}
        <section className="dossier-panel__section">
          <h3 className="dossier-panel__section-title">Device Class Mix</h3>
          <div className="dossier-panel__chips-list">
            {Array.from(deviceClassSet).map((deviceClass) => (
              <span key={deviceClass} className="dossier-panel__chip dossier-panel__chip--device-class">
                {deviceClass}
              </span>
            ))}
          </div>
        </section>

        {/* Addressing Summary */}
        <section className="dossier-panel__section">
          <h3 className="dossier-panel__section-title">Addressing</h3>
          <dl className="dossier-panel__grid">
            <dt className="dossier-panel__label">Management Subnet</dt>
            <dd className="dossier-panel__value dossier-panel__value--mono">
              {active.lab_payload.address_plan.management_subnet}
            </dd>

            <dt className="dossier-panel__label">Loopback Subnet</dt>
            <dd className="dossier-panel__value dossier-panel__value--mono">
              {active.lab_payload.address_plan.loopback_subnet}
            </dd>

            <dt className="dossier-panel__label">Transit Subnet</dt>
            <dd className="dossier-panel__value dossier-panel__value--mono">
              {active.lab_payload.address_plan.transit_subnet}
            </dd>

            <dt className="dossier-panel__label">Allocated Subnets</dt>
            <dd className="dossier-panel__value">{allocatedSubnetCount}</dd>
          </dl>
        </section>

        {/* Capability Flags */}
        <section className="dossier-panel__section">
          <h3 className="dossier-panel__section-title">Capability Flags</h3>
          <div className="dossier-panel__capabilities-grid">
            {(
              [
                "topology",
                "inventory",
                "interfaces",
                "addressing",
                "configs",
                "routing",
                "services",
                "security",
              ] as const
            ).map((flag) => {
              const enabled = active.capability_flags[flag];
              return (
                <div key={flag} className={`dossier-panel__capability-item dossier-panel__capability-item--${enabled ? "enabled" : "disabled"}`}>
                  <span className="dossier-panel__capability-badge">{enabled ? "✓" : "✗"}</span>
                  <span className="dossier-panel__capability-label">{flag}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Readiness Badges */}
        <section className="dossier-panel__section">
          <h3 className="dossier-panel__section-title">Readiness</h3>
          <div className="dossier-panel__readiness-header">
            <span
              className={`dossier-panel__readiness-badge dossier-panel__readiness-badge--${readinessVerdict.ready ? "ready" : "blocked"}`}
            >
              {readinessVerdict.ready ? "Ready" : "Blocked"}
            </span>
            <p className="dossier-panel__readiness-summary">{readinessVerdict.summary}</p>
          </div>

          <div className="dossier-panel__rules-grid">
            {(
              [
                "inventory_ready",
                "links_ready",
                "interfaces_ready",
                "addressing_ready",
                "configs_ready",
                "sync_ready",
                "topology_data_ready",
              ] as const
            ).map((rule) => {
              const passed = readinessVerdict.rules[rule];
              return (
                <span
                  key={rule}
                  className={`dossier-panel__chip dossier-panel__chip--rule-${passed ? "pass" : "fail"}`}
                >
                  {rule}
                </span>
              );
            })}
          </div>

          {readinessVerdict.warnings.length > 0 && (
            <div className="dossier-panel__warnings">
              <h4 className="dossier-panel__warnings-title">Warnings</h4>
              <ul className="dossier-panel__warnings-list">
                {readinessVerdict.warnings.map((warning, idx) => (
                  <li key={idx} className="dossier-panel__warning-item">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {readinessVerdict.blockers.length > 0 && (
            <div className="dossier-panel__blockers">
              <h4 className="dossier-panel__blockers-title">Blockers</h4>
              <ul className="dossier-panel__blockers-list">
                {readinessVerdict.blockers.map((blocker, idx) => (
                  <li key={idx} className="dossier-panel__blocker-item">
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
