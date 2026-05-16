import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import type { VendorPlatform } from "../../../types/vendor";
import { PlatformOverrideSelect } from "../components/PlatformOverrideSelect";

const PLATFORMS: ReadonlyArray<VendorPlatform> = [
  {
    id: "cisco-iosxe",
    vendor: "cisco",
    os_family: "iosxe",
    primary_role: "router",
    config_style: "ios-cli",
    priority_tier: "t1",
    initial_parser_target_level: "l2topology",
    capability_families: ["interfaces"],
    notes: "",
  },
  {
    id: "juniper-junos",
    vendor: "juniper",
    os_family: "junos",
    primary_role: "router",
    config_style: "junos",
    priority_tier: "t1",
    initial_parser_target_level: "l2topology",
    capability_families: ["interfaces"],
    notes: "",
  },
];

describe("PlatformOverrideSelect", () => {
  it("lists every registered platform", () => {
    render(
      <PlatformOverrideSelect
        platforms={PLATFORMS}
        vendorListError={null}
        selectedPlatformId={null}
        isManualOverride={false}
        disabled={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("cisco-iosxe")).toBeInTheDocument();
    expect(screen.getByText("juniper-junos")).toBeInTheDocument();
  });

  it("clicking Select dispatches a manual-override choice", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PlatformOverrideSelect
        platforms={PLATFORMS}
        vendorListError={null}
        selectedPlatformId={null}
        isManualOverride={false}
        disabled={false}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Select juniper-junos" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const [ref, isManual] = onSelect.mock.calls[0]!;
    expect(ref.platform_id).toBe("juniper-junos");
    expect(isManual).toBe(true);
  });

  it("shows a SELECTED tag and hides the Select button for the active row", () => {
    render(
      <PlatformOverrideSelect
        platforms={PLATFORMS}
        vendorListError={null}
        selectedPlatformId="cisco-iosxe"
        isManualOverride
        disabled={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("SELECTED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select cisco-iosxe" })).toBeNull();
  });

  it("surfaces vendor-registry errors verbatim", () => {
    render(
      <PlatformOverrideSelect
        platforms={[]}
        vendorListError="registry channel closed"
        selectedPlatformId={null}
        isManualOverride={false}
        disabled={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("registry channel closed");
  });
});
