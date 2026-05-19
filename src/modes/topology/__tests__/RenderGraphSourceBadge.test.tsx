/**
 * V1AY Render Graph Source Badge Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RenderGraphSourceBadge } from "../RenderGraphSourceBadge";

describe("RenderGraphSourceBadge", () => {
  it("renders demo source with tg-source-badge", () => {
    render(<RenderGraphSourceBadge data_source="demo" />);

    expect(screen.getByTestId("tg-source-badge")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });

  it("renders fixture source", () => {
    render(<RenderGraphSourceBadge data_source="fixture" />);

    expect(screen.getByTestId("tg-source-badge")).toBeInTheDocument();
    expect(screen.getByText("Fixture")).toBeInTheDocument();
  });

  it("renders imported source", () => {
    render(<RenderGraphSourceBadge data_source="imported" />);

    expect(screen.getByTestId("tg-source-badge")).toBeInTheDocument();
    expect(screen.getByText("Imported")).toBeInTheDocument();
  });

  it("renders simulated source", () => {
    render(<RenderGraphSourceBadge data_source="simulated" />);

    expect(screen.getByTestId("tg-source-badge")).toBeInTheDocument();
    expect(screen.getByText("Simulated")).toBeInTheDocument();
  });

  it("renders unknown source", () => {
    render(<RenderGraphSourceBadge data_source="unknown" />);

    expect(screen.getByTestId("tg-source-badge")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
