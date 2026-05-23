import { type JSX, useMemo, useState } from "react";
import { useEnvironmentLifecycle } from "../../../state/EnvironmentLifecycleContext";
import { getConfigsByVendor, countConfigLines, type VendorGroup } from "../configHelpers";
import "./ConfigsPanel.css";

export function ConfigsPanel(): JSX.Element {
  const lifecycle = useEnvironmentLifecycle();
  const active = lifecycle.active;
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(
    new Set(active ? getConfigsByVendor(active).map((g) => g.vendor) : [])
  );

  const vendorGroups = useMemo(() => {
    if (!active) return [] as VendorGroup[];
    return getConfigsByVendor(active);
  }, [active]);

  return (
    <div className="configs-panel" data-testid="environments-configs">
      <div className="configs-panel__container">
        <div className="configs-panel__header">
          <h2 className="configs-panel__title">Configuration Preview</h2>
          {active && (
            <p className="configs-panel__subtitle">
              {active.scenario_name} from {active.name}
            </p>
          )}
        </div>

        {!active ? (
          <div className="configs-panel__empty">
            <p>No active environment selected</p>
          </div>
        ) : vendorGroups.length === 0 ? (
          <div className="configs-panel__empty">
            <p>No configurations available</p>
          </div>
        ) : (
          <div className="configs-panel__vendors">
            {vendorGroups.map((group) => {
              const isExpanded = expandedVendors.has(group.vendor);
              return (
                <details
                  key={group.vendor}
                  className="configs-panel__vendor-details"
                  open={isExpanded}
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open) {
                      expandedVendors.add(group.vendor);
                    } else {
                      expandedVendors.delete(group.vendor);
                    }
                    setExpandedVendors(new Set(expandedVendors));
                  }}
                >
                  <summary className="configs-panel__vendor-summary">
                    <span className="configs-panel__vendor-name">{group.vendor}</span>
                    <span className="configs-panel__vendor-count">({group.entries.length})</span>
                  </summary>
                  <div className="configs-panel__devices-grid">
                    {group.entries.map((entry) => {
                      const configKindLabel =
                        entry.config.config_kind === "cli_config"
                          ? "CLI"
                          : entry.config.config_kind === "structured_profile"
                            ? "Structured"
                            : "Manifest";
                      const lineCount = countConfigLines(entry.config.config_text);

                      return (
                        <div key={entry.device.id} className="configs-panel__device-card">
                          <div className="configs-panel__device-header">
                            <div className="configs-panel__device-info">
                              <h4 className="configs-panel__device-name">{entry.device.hostname}</h4>
                              <span className="configs-panel__device-role">{entry.device.device_class}</span>
                            </div>
                            <div className="configs-panel__device-badges">
                              <span className="configs-panel__badge configs-panel__badge--kind">
                                {configKindLabel}
                              </span>
                              {entry.config.config_text && (
                                <span className="configs-panel__badge configs-panel__badge--lines">
                                  {lineCount} lines
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="configs-panel__device-meta">
                            <span className="configs-panel__meta-item">
                              <strong>Platform:</strong> {entry.config.platform_id}
                            </span>
                            {entry.config.parser_hint && (
                              <span className="configs-panel__meta-item" title={entry.config.parser_hint}>
                                <strong>Parser:</strong> {entry.config.parser_hint}
                              </span>
                            )}
                          </div>

                          <div className="configs-panel__config-preview">
                            {entry.config.config_kind === "cli_config" && entry.config.config_text ? (
                              <pre className="configs-panel__config-text">
                                {entry.config.config_text.substring(0, 500)}
                                {entry.config.config_text.length > 500 ? "\n..." : ""}
                              </pre>
                            ) : entry.config.structured_profile ? (
                              <pre className="configs-panel__config-text">
                                {JSON.stringify(entry.config.structured_profile, null, 2).substring(0, 500)}
                                {JSON.stringify(entry.config.structured_profile).length > 500 ? "\n..." : ""}
                              </pre>
                            ) : (
                              <p className="configs-panel__config-text configs-panel__config-text--empty">
                                (no configuration data)
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
