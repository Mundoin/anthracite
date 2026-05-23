import { type JSX, useMemo } from "react";
import { useEnvironmentLifecycle } from "../../../state/EnvironmentLifecycleContext";
import type { EnvironmentsToolId, CreationNotice } from "../EnvironmentsMode";
import { AnthButton } from "../../../components/shared/AnthButton";
import "./OverviewPanel.css";

interface OverviewPanelProps {
  readonly onNavigate: (id: EnvironmentsToolId) => void;
  readonly creationNotice?: CreationNotice | null;
  readonly onDismissNotice?: () => void;
}

export function OverviewPanel({ onNavigate, creationNotice, onDismissNotice }: OverviewPanelProps): JSX.Element {
  const lifecycle = useEnvironmentLifecycle();
  const active = lifecycle.active;
  const allEnvironments = lifecycle.visible_environments;

  const statusChip = useMemo(() => {
    if (!active) return "no active environment";
    if (active.provenance === "generated-lab") return "generated-lab";
    if (active.sync_state === "dirty") return "dirty";
    return "clean";
  }, [active]);

  const statusVariant = useMemo(() => {
    if (!active) return "ghost";
    if (active.provenance === "generated-lab") return "info";
    if (active.sync_state === "dirty") return "warn";
    return "ok";
  }, [active]);

  // Compute onboarding nudge
  const onboardingNudge = useMemo(() => {
    if (allEnvironments.length === 0) {
      return {
        show: true,
        message: "Create your first Environment to start working.",
        action: "creator" as EnvironmentsToolId,
      };
    }
    if (allEnvironments.length === 1 && allEnvironments[0]?.scenario_id === "micro-lab") {
      return {
        show: true,
        message: "Starter lab active. Use Environment Creator to make a Branch, Campus, Datacenter, or Metro lab.",
        action: "creator" as EnvironmentsToolId,
      };
    }
    if (active?.sync_state === "dirty") {
      return {
        show: true,
        message: "Unsaved changes — auto-save on next idle",
        action: null,
      };
    }
    if (active?.lifecycle_state === "archived" || !active) {
      return {
        show: true,
        message: "Select or create an environment to continue.",
        action: "creator" as EnvironmentsToolId,
      };
    }
    return { show: false };
  }, [allEnvironments, active]);

  // Compute device inventory for preview
  const deviceInventory = useMemo(() => {
    if (!active) return [];
    const devices = active.lab_payload.devices.slice(0, 10);
    const configsByDeviceId = new Map<string, number>();
    active.lab_payload.configs.forEach((config) => {
      configsByDeviceId.set(config.device_id, (configsByDeviceId.get(config.device_id) ?? 0) + 1);
    });
    return devices.map((device) => ({
      hostname: device.hostname,
      device_class: device.device_class,
      vendor: device.vendor,
      platform_id: device.platform_id,
      management_ip: device.management_ip?.address ?? "—",
      interfaces: device.interfaces.length,
      configs: configsByDeviceId.get(device.id) ?? 0,
    }));
  }, [active]);

  return (
    <div className="overview-panel" data-testid="environments-overview">
      <div className="overview-panel__container">
        {creationNotice && (
          <div className="overview-panel__created-banner" data-testid="environment-created-banner" role="status">
            <span className="overview-panel__created-icon" aria-hidden="true">✓</span>
            <div className="overview-panel__created-text">
              <strong>Environment created:</strong> {creationNotice.environmentName}
              {creationNotice.didSetActive ? " — set as active." : " — saved to Store."}
            </div>
            {onDismissNotice && (
              <AnthButton variant="ghost" onClick={onDismissNotice}>Dismiss</AnthButton>
            )}
          </div>
        )}
        {onboardingNudge.show && (
          <div className="overview-panel__nudge">
            <p className="overview-panel__nudge-message">{onboardingNudge.message}</p>
            {onboardingNudge.action && (
              <AnthButton onClick={() => onNavigate(onboardingNudge.action as EnvironmentsToolId)} variant="secondary">
                {onboardingNudge.action === "creator" ? "Open Environment Creator" : "Continue"}
              </AnthButton>
            )}
          </div>
        )}

        {!active ? (
          <div className="overview-panel__empty">
            <h3>No Active Environment</h3>
            <p>Create a new lab environment or select an existing one from the Store.</p>
            <div className="overview-panel__empty-actions">
              <AnthButton onClick={() => onNavigate("creator")} variant="secondary">
                Open Environment Creator
              </AnthButton>
              <AnthButton onClick={() => onNavigate("store")} variant="ghost">
                Open Environment Store
              </AnthButton>
            </div>
          </div>
        ) : (
          <>
            <div className="overview-panel__header">
              <h2 className="overview-panel__title">{active.name}</h2>
              <div className="overview-panel__chips">
                <span className={`overview-panel__chip overview-panel__chip--${statusVariant}`}>
                  {statusChip}
                </span>
              </div>
            </div>

            <div className="overview-panel__section">
              <h3 className="overview-panel__section-title">Details</h3>
              <div className="overview-panel__details-grid">
                <div className="overview-panel__detail-item">
                  <span className="overview-panel__detail-label">Devices</span>
                  <span className="overview-panel__detail-value">{active.device_count}</span>
                </div>
                <div className="overview-panel__detail-item">
                  <span className="overview-panel__detail-label">Links</span>
                  <span className="overview-panel__detail-value">{active.link_count}</span>
                </div>
                <div className="overview-panel__detail-item">
                  <span className="overview-panel__detail-label">Configs</span>
                  <span className="overview-panel__detail-value">{active.config_count}</span>
                </div>
                <div className="overview-panel__detail-item">
                  <span className="overview-panel__detail-label">Source</span>
                  <span className="overview-panel__detail-value">{active.provenance}</span>
                </div>
              </div>
            </div>

            {/* Device Inventory Preview */}
            <details className="overview-panel__section overview-panel__inventory-details">
              <summary className="overview-panel__inventory-summary">
                <h3 className="overview-panel__section-title">Device Inventory ({active.device_count})</h3>
              </summary>
              {deviceInventory.length === 0 ? (
                <p className="overview-panel__inventory-empty">No devices in this environment.</p>
              ) : (
                <div className="overview-panel__inventory-table-wrapper">
                  <table className="overview-panel__inventory-table">
                    <thead>
                      <tr>
                        <th className="overview-panel__table-header">Hostname</th>
                        <th className="overview-panel__table-header">Class</th>
                        <th className="overview-panel__table-header">Vendor</th>
                        <th className="overview-panel__table-header">Platform</th>
                        <th className="overview-panel__table-header">Management IP</th>
                        <th className="overview-panel__table-header">Interfaces</th>
                        <th className="overview-panel__table-header">Configs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceInventory.map((device, idx) => (
                        <tr key={idx}>
                          <td className="overview-panel__table-cell">{device.hostname}</td>
                          <td className="overview-panel__table-cell">{device.device_class}</td>
                          <td className="overview-panel__table-cell">{device.vendor}</td>
                          <td className="overview-panel__table-cell overview-panel__table-cell--mono">
                            {device.platform_id}
                          </td>
                          <td className="overview-panel__table-cell overview-panel__table-cell--mono">
                            {device.management_ip}
                          </td>
                          <td className="overview-panel__table-cell">{device.interfaces}</td>
                          <td className="overview-panel__table-cell">{device.configs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {active.device_count > 10 && (
                    <p className="overview-panel__inventory-footer">
                      +{active.device_count - 10} more device{active.device_count - 10 === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              )}
            </details>

            <div className="overview-panel__section">
              <h3 className="overview-panel__section-title">Actions</h3>
              <div className="overview-panel__actions">
                <AnthButton onClick={() => onNavigate("creator")} variant="secondary">
                  Open Environment Creator
                </AnthButton>
                <AnthButton onClick={() => onNavigate("configs")} variant="ghost">
                  Open Configs
                </AnthButton>
                <AnthButton onClick={() => onNavigate("sync")} variant="ghost">
                  Open Sync Status
                </AnthButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
