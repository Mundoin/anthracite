/**
 * V1CF — Single-Device Collector preview panel UI tests.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SingleDeviceCollectorPanel } from "../SingleDeviceCollectorPanel";

describe("SingleDeviceCollectorPanel", () => {
  it("mounts the panel and demo run card", () => {
    render(<SingleDeviceCollectorPanel />);
    expect(screen.getByTestId("sd-panel")).toBeInTheDocument();
    expect(screen.getByTestId("sd-card-tgt-demo-edge-01")).toBeInTheDocument();
  });

  it("status pill reads 'ok'", () => {
    render(<SingleDeviceCollectorPanel />);
    expect(
      screen.getByTestId("sd-card-status-tgt-demo-edge-01"),
    ).toHaveTextContent("ok");
  });

  it("shows fixture id and 'no field contact' pill", () => {
    render(<SingleDeviceCollectorPanel />);
    expect(
      screen.getByTestId("sd-card-fixture-tgt-demo-edge-01"),
    ).toHaveTextContent("fixture-edge-rtr-01-iosxe");
    expect(
      screen.getByTestId("sd-card-tgt-demo-edge-01"),
    ).toHaveTextContent("no field contact");
  });

  it("emits a V1CD receipt with derived counts", () => {
    render(<SingleDeviceCollectorPanel />);
    const counts = screen.getByTestId("sd-card-counts-tgt-demo-edge-01");
    // Demo target scope: inventory + version_facts + topology_neighbors (×2)
    expect(counts).toHaveTextContent("4");
  });

  it("surfaces inventory + version + neighbour evidence entries", () => {
    render(<SingleDeviceCollectorPanel />);
    expect(
      screen.getByTestId("sd-evidence-tgt-demo-edge-01-inventory"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("sd-evidence-tgt-demo-edge-01-version_facts"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByTestId("sd-evidence-tgt-demo-edge-01-topology_neighbors")
        .length,
    ).toBe(2);
  });

  it("reason line names accepted count", () => {
    render(<SingleDeviceCollectorPanel />);
    expect(
      screen.getByTestId("sd-card-reason-tgt-demo-edge-01"),
    ).toHaveTextContent("4 accepted");
  });
});
