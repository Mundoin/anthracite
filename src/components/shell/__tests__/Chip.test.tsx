/**
 * D1 — Chip primitive sanity tests.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "../Chip";

describe("Chip — D1 primitive", () => {
  it("renders capability available with default testid", () => {
    render(
      <div className="anth">
        <Chip variant="capability" tone="available">Ready</Chip>
      </div>,
    );
    const el = screen.getByTestId("chip-capability-available");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("Ready");
    expect(el.getAttribute("data-variant")).toBe("capability");
    expect(el.getAttribute("data-tone")).toBe("available");
    expect(el.className).toContain("anth-chip--capability-available");
  });

  it("renders readiness blocked", () => {
    render(
      <div className="anth">
        <Chip variant="readiness" tone="blocked">Blocked</Chip>
      </div>,
    );
    expect(screen.getByTestId("chip-readiness-blocked")).toBeInTheDocument();
  });

  it("renders risk critical", () => {
    render(
      <div className="anth">
        <Chip variant="risk" tone="critical">Critical</Chip>
      </div>,
    );
    expect(screen.getByTestId("chip-risk-critical")).toBeInTheDocument();
  });

  it("renders status idle", () => {
    render(
      <div className="anth">
        <Chip variant="status" tone="idle">Idle</Chip>
      </div>,
    );
    expect(screen.getByTestId("chip-status-idle")).toBeInTheDocument();
  });

  it("renders dot when dot=true", () => {
    render(
      <div className="anth">
        <Chip variant="capability" tone="partial" dot>Partial</Chip>
      </div>,
    );
    const el = screen.getByTestId("chip-capability-partial");
    expect(el.querySelector(".anth-chip__dot")).not.toBeNull();
  });

  it("honors testid override", () => {
    render(
      <div className="anth">
        <Chip variant="capability" tone="deferred" testid="custom-chip">
          Deferred
        </Chip>
      </div>,
    );
    expect(screen.getByTestId("custom-chip")).toBeInTheDocument();
    expect(screen.queryByTestId("chip-capability-deferred")).toBeNull();
  });
});
