import { type JSX, useEffect } from "react";
import type { LocalEnvironmentRecord } from "../../../types/localEnvironment";
import { AnthButton } from "../../../components/shared/AnthButton";
import "./Wizard.css";

export interface StepReviewContentsProps {
  readonly previewRecord: LocalEnvironmentRecord | null;
  readonly environmentName: string;
  readonly onNameChange: (name: string) => void;
  readonly onBuildPreview: () => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly onReset: () => void;
}

export function StepReviewContents({
  previewRecord,
  environmentName,
  onNameChange,
  onBuildPreview,
  onNext,
  onBack,
  onReset,
}: StepReviewContentsProps): JSX.Element {
  // Build preview on mount if not present
  useEffect(() => {
    if (!previewRecord) {
      onBuildPreview();
    }
  }, [previewRecord, onBuildPreview]);

  if (!previewRecord) {
    return (
      <div className="wizard-step">
        <div className="wizard-step__header">
          <h2 className="wizard-step__title">Review Contents</h2>
        </div>
        <div className="wizard-step__content">
          <p>Evaluating...</p>
        </div>
      </div>
    );
  }

  const vendors = new Set(previewRecord.lab_payload.devices.map((d) => d.vendor));
  const deviceClasses = new Set(
    previewRecord.lab_payload.devices.map((d) => d.device_class),
  );

  const configKindCounts = previewRecord.lab_payload.configs.reduce(
    (acc, config) => {
      const kind = config.config_kind;
      acc[kind] = (acc[kind] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const firstDevices = previewRecord.lab_payload.devices.slice(0, 5);
  const firstLinks = previewRecord.lab_payload.links.slice(0, 5);

  return (
    <div className="wizard-step" data-testid="wizard-review">
      <div className="wizard-step__header">
        <h2 className="wizard-step__title">Review Contents</h2>
        <p className="wizard-step__subtitle">
          Review the generated environment before creating
        </p>
      </div>

      <div className="wizard-step__content wizard-review-content">
        <div className="wizard-review">
          <section className="wizard-review__section">
            <h3 className="wizard-review__section-title">Environment Name</h3>
            <input
              type="text"
              className="wizard-review__name-input"
              value={environmentName || previewRecord.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter environment name"
            />
          </section>

          <section className="wizard-review__section">
            <h3 className="wizard-review__section-title">Summary</h3>
            <div className="wizard-summary-row">
              <div className="wizard-summary-card">
                <span className="wizard-summary-card__label">Devices</span>
                <span className="wizard-summary-card__value">
                  {previewRecord.device_count}
                </span>
              </div>
              <div className="wizard-summary-card">
                <span className="wizard-summary-card__label">Links</span>
                <span className="wizard-summary-card__value">
                  {previewRecord.link_count}
                </span>
              </div>
              <div className="wizard-summary-card">
                <span className="wizard-summary-card__label">Configs</span>
                <span className="wizard-summary-card__value">
                  {previewRecord.config_count}
                </span>
              </div>
              <div className="wizard-summary-card">
                <span className="wizard-summary-card__label">Interfaces</span>
                <span className="wizard-summary-card__value">
                  {previewRecord.lab_payload.devices.reduce(
                    (sum, d) => sum + d.interfaces.length,
                    0,
                  )}
                </span>
              </div>
            </div>
          </section>

          <section className="wizard-review__section">
            <h3 className="wizard-review__section-title">Addressing</h3>
            <div className="wizard-addressing">
              <div className="wizard-addressing__row">
                <span className="wizard-addressing__label">Management</span>
                <span className="wizard-addressing__value">
                  {previewRecord.lab_payload.address_plan.management_subnet}
                </span>
              </div>
              <div className="wizard-addressing__row">
                <span className="wizard-addressing__label">Loopback</span>
                <span className="wizard-addressing__value">
                  {previewRecord.lab_payload.address_plan.loopback_subnet}
                </span>
              </div>
              <div className="wizard-addressing__row">
                <span className="wizard-addressing__label">Transit</span>
                <span className="wizard-addressing__value">
                  {previewRecord.lab_payload.address_plan.transit_subnet}
                </span>
              </div>
            </div>
          </section>

          <section className="wizard-review__section">
            <h3 className="wizard-review__section-title">Vendor Mix</h3>
            <div className="wizard-card__capabilities">
              {Array.from(vendors).map((vendor) => (
                <span key={vendor} className="wizard-chip">
                  {vendor}
                </span>
              ))}
            </div>
          </section>

          <section className="wizard-review__section">
            <h3 className="wizard-review__section-title">Device Classes</h3>
            <div className="wizard-card__capabilities">
              {Array.from(deviceClasses).map((cls) => (
                <span key={cls} className="wizard-chip">
                  {cls}
                </span>
              ))}
            </div>
          </section>

          <section className="wizard-review__section">
            <h3 className="wizard-review__section-title">Config Kinds</h3>
            <div className="wizard-card__capabilities">
              {Object.entries(configKindCounts).map(([kind, count]) => (
                <span key={kind} className="wizard-chip">
                  {kind} · {count}
                </span>
              ))}
            </div>
          </section>

          <section className="wizard-review__section">
            <h3 className="wizard-review__section-title">First 5 Devices</h3>
            <div className="wizard-table">
              <table>
                <thead>
                  <tr>
                    <th>Hostname</th>
                    <th>Class</th>
                    <th>Vendor</th>
                    <th>Mgmt IP</th>
                    <th>Interfaces</th>
                  </tr>
                </thead>
                <tbody>
                  {firstDevices.map((device) => (
                    <tr key={device.id}>
                      <td>{device.hostname}</td>
                      <td>{device.device_class}</td>
                      <td>{device.vendor}</td>
                      <td className="wizard-table__mono">
                        {device.management_ip?.address ?? "—"}
                      </td>
                      <td>{device.interfaces.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="wizard-review__section">
            <h3 className="wizard-review__section-title">First 5 Links</h3>
            <div className="wizard-table">
              <table>
                <thead>
                  <tr>
                    <th>Endpoint A</th>
                    <th>Endpoint B</th>
                    <th>Link Type</th>
                    <th>Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {firstLinks.map((link) => {
                    const deviceA = previewRecord.lab_payload.devices.find(
                      (d) => d.id === link.endpoint_a_device_id,
                    );
                    const deviceB = previewRecord.lab_payload.devices.find(
                      (d) => d.id === link.endpoint_b_device_id,
                    );
                    return (
                      <tr key={link.id}>
                        <td>{deviceA?.hostname ?? link.endpoint_a_device_id}</td>
                        <td>{deviceB?.hostname ?? link.endpoint_b_device_id}</td>
                        <td>{link.link_type}</td>
                        <td>{link.speed_mbps} Mbps</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <div className="wizard-step__footer">
        <AnthButton variant="ghost" onClick={onReset}>
          Reset
        </AnthButton>
        <div className="wizard-step__footer-right">
          <AnthButton variant="secondary" onClick={onBack}>
            Back
          </AnthButton>
          <AnthButton variant="primary" onClick={onNext}>
            Continue to Create
          </AnthButton>
        </div>
      </div>
    </div>
  );
}
