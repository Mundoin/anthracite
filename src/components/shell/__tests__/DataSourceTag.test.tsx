import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SOURCE_LABEL } from "../../../types/dataSource";
import { DataSourceTag } from "../DataSourceTag";

describe("DataSourceTag", () => {
  it("renders nothing for real state", () => {
    const { container } = render(<DataSourceTag state="real" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders SOURCE_LABEL text for demo state", () => {
    render(<DataSourceTag state="demo" />);
    expect(screen.getByText(SOURCE_LABEL["demo"])).toBeDefined();
  });

  it("respects override prop over default label", () => {
    render(<DataSourceTag state="demo" override="Custom label" />);
    expect(screen.getByText("Custom label")).toBeDefined();
    expect(screen.queryByText(SOURCE_LABEL["demo"])).toBeNull();
  });

  it("sets data-state attribute on rendered span", () => {
    const { container } = render(<DataSourceTag state="unavailable" />);
    expect(container.querySelector("[data-state='unavailable']")).not.toBeNull();
  });

  it("renders correct label for not_connected state", () => {
    render(<DataSourceTag state="not_connected" />);
    expect(screen.getByText(SOURCE_LABEL["not_connected"])).toBeDefined();
  });

  it("renders correct label for empty state", () => {
    render(<DataSourceTag state="empty" />);
    expect(screen.getByText(SOURCE_LABEL["empty"])).toBeDefined();
  });
});
