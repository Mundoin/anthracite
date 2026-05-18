import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { OpsConsoleMode } from "../OpsConsoleMode";
import type { DiscoverySourceView } from "../../../data/discoverySource";
import { MODE_STATUS } from "../../../data/modeStatus";

const emptyDiscovery: DiscoverySourceView = {
  sourceState: "empty",
  environmentId: "env-core-eu1",
  totalRecords: 0,
  message: "discovery inventory empty — no records collected",
  isEmpty: true,
};

describe("OpsConsoleMode", () => {
  it("renders Engines heading", () => {
    render(<OpsConsoleMode discovery={emptyDiscovery} />);
    expect(screen.getByRole("heading", { name: /Engines/i })).toBeInTheDocument();
  });

  it("engine list has correct row count — all non-opsConsole ModeIds", () => {
    render(<OpsConsoleMode discovery={emptyDiscovery} />);
    const expectedCount = Object.keys(MODE_STATUS).filter((id) => id !== "opsConsole").length;
    const enginesList = screen.getByTestId("ocm-engines");
    expect(within(enginesList).getAllByRole("listitem")).toHaveLength(expectedCount);
  });

  it("built modes render connected pill", () => {
    const { container } = render(<OpsConsoleMode discovery={emptyDiscovery} />);
    const builtCount = (Object.entries(MODE_STATUS) as [string, typeof MODE_STATUS[keyof typeof MODE_STATUS]][])
      .filter(([id, s]) => id !== "opsConsole" && s.state === "built").length;
    expect(container.querySelectorAll(".ocm-pill--built").length).toBe(builtCount);
  });

  it("no interactive elements", () => {
    render(<OpsConsoleMode discovery={emptyDiscovery} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("renders Discovery Inventory section", () => {
    render(<OpsConsoleMode discovery={emptyDiscovery} />);
    expect(screen.getByRole("heading", { name: /Discovery Inventory/i })).toBeInTheDocument();
  });

  it("shows empty DataSourceTag when discovery source is empty", () => {
    const { container } = render(<OpsConsoleMode discovery={emptyDiscovery} />);
    const discoverySection = screen.getByTestId("ocm-discovery");
    const tag = within(discoverySection).getByRole("heading").querySelector("[data-state='empty']");
    expect(tag).toBeInTheDocument();
  });

  it("shows record count 0 when empty", () => {
    render(<OpsConsoleMode discovery={emptyDiscovery} />);
    const discoverySection = screen.getByTestId("ocm-discovery");
    expect(within(discoverySection).getByText("0")).toBeInTheDocument();
  });

  it("shows environment scope when env id is present", () => {
    const discovery: DiscoverySourceView = {
      ...emptyDiscovery,
      environmentId: "env-core-eu1",
    };
    render(<OpsConsoleMode discovery={discovery} />);
    const discoverySection = screen.getByTestId("ocm-discovery");
    expect(within(discoverySection).getByText("env-core-eu1")).toBeInTheDocument();
  });

  it("shows \"All environments\" when env id is null", () => {
    const discovery: DiscoverySourceView = {
      ...emptyDiscovery,
      environmentId: null,
    };
    render(<OpsConsoleMode discovery={discovery} />);
    const discoverySection = screen.getByTestId("ocm-discovery");
    expect(within(discoverySection).getByText("All environments")).toBeInTheDocument();
  });

  it("shows unavailable state when adapter provides unavailable", () => {
    const discovery: DiscoverySourceView = {
      sourceState: "unavailable",
      environmentId: null,
      totalRecords: 0,
      message: "Discovery source unavailable",
      isEmpty: false,
    };
    render(<OpsConsoleMode discovery={discovery} />);
    const discoverySection = screen.getByTestId("ocm-discovery");
    const tag = within(discoverySection).getByRole("heading").querySelector("[data-state='unavailable']");
    expect(tag).toBeInTheDocument();
    expect(within(discoverySection).getByText("—")).toBeInTheDocument();
  });

  it("shows \"Not connected\" state when adapter provides not_connected", () => {
    const discovery: DiscoverySourceView = {
      sourceState: "not_connected",
      environmentId: null,
      totalRecords: 0,
      message: "Discovery engine not connected",
      isEmpty: false,
    };
    render(<OpsConsoleMode discovery={discovery} />);
    const discoverySection = screen.getByTestId("ocm-discovery");
    expect(within(discoverySection).getByText("Not connected")).toBeInTheDocument();
    expect(within(discoverySection).getByText("—")).toBeInTheDocument();
  });

  it("still renders engines section", () => {
    render(<OpsConsoleMode discovery={emptyDiscovery} />);
    expect(screen.getByRole("heading", { name: /Engines/i })).toBeInTheDocument();
  });

  it("no interactive controls in Discovery section", () => {
    render(<OpsConsoleMode discovery={emptyDiscovery} />);
    const discoverySection = screen.getByTestId("ocm-discovery");
    expect(within(discoverySection).queryByRole("button")).toBeNull();
    expect(within(discoverySection).queryByRole("link")).toBeNull();
    expect(within(discoverySection).queryByRole("textbox")).toBeNull();
  });

  it("does not show DataSourceTag when discovery source is real", () => {
    const discovery: DiscoverySourceView = {
      sourceState: "real",
      environmentId: "env-core-eu1",
      totalRecords: 42,
      message: "ok",
      isEmpty: false,
    };
    render(<OpsConsoleMode discovery={discovery} />);
    const discoverySection = screen.getByTestId("ocm-discovery");
    const tag = within(discoverySection).getByRole("heading").querySelector("[data-state]");
    expect(tag).not.toBeInTheDocument();
  });
});
