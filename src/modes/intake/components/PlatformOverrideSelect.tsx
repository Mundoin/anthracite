import { useMemo, type JSX } from "react";
import type { VendorPlatform } from "../../../types/vendor";
import type { PlatformRef } from "../../../types/networkModel";
import { platformRefFromVendor } from "../intakeTypes";

export interface PlatformOverrideSelectProps {
  readonly platforms: ReadonlyArray<VendorPlatform>;
  readonly vendorListError: string | null;
  readonly selectedPlatformId: string | null;
  readonly isManualOverride: boolean;
  readonly disabled: boolean;
  readonly onSelect: (ref: PlatformRef, isManualOverride: boolean) => void;
}

export function PlatformOverrideSelect(props: PlatformOverrideSelectProps): JSX.Element {
  const {
    platforms,
    vendorListError,
    selectedPlatformId,
    isManualOverride,
    disabled,
    onSelect,
  } = props;

  const sorted = useMemo(
    () =>
      [...platforms].sort((a, b) =>
        a.vendor === b.vendor
          ? a.id.localeCompare(b.id)
          : a.vendor.localeCompare(b.vendor),
      ),
    [platforms],
  );

  return (
    <section className="intake-override" aria-label="Manual platform override">
      <header className="intake-section__header">
        <div className="intake-section__title">MANUAL OVERRIDE</div>
        <div className="intake-section__meta">
          {platforms.length.toLocaleString("en-US")} registered platforms
        </div>
      </header>
      {vendorListError && (
        <div className="intake-error" role="alert">
          Vendor registry unavailable: {vendorListError}
        </div>
      )}
      {sorted.length === 0 ? (
        <div className="intake-empty">No platforms loaded yet.</div>
      ) : (
        <table className="intake-table" aria-label="Registered platforms">
          <thead>
            <tr>
              <th>Platform id</th>
              <th>Vendor</th>
              <th>OS family</th>
              <th>Tier</th>
              <th>Target level</th>
              <th>{""}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((vp) => {
              const isSelected = vp.id === selectedPlatformId;
              const markManual = isSelected && isManualOverride;
              return (
                <tr key={vp.id} className={isSelected ? "is-selected" : ""}>
                  <td>{vp.id}</td>
                  <td>{vp.vendor}</td>
                  <td>{vp.os_family}</td>
                  <td>{vp.priority_tier}</td>
                  <td>{vp.initial_parser_target_level}</td>
                  <td>
                    {markManual ? (
                      <span className="intake-tag intake-tag--manual">SELECTED</span>
                    ) : (
                      <button
                        type="button"
                        className="intake-btn intake-btn--tiny"
                        disabled={disabled}
                        onClick={() => onSelect(platformRefFromVendor(vp), true)}
                        aria-label={`Select ${vp.id}`}
                      >
                        Select
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
