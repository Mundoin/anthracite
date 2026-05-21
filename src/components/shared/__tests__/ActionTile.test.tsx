/**
 * D1B — ActionTile sanity tests.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionTile } from "../ActionTile";

describe("ActionTile — D1B", () => {
  it("renders dashboard variant with title + default testid", () => {
    render(
      <div className="anth">
        <ActionTile title="Environment" />
      </div>,
    );
    const el = screen.getByTestId("action-tile-dashboard");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("Environment");
    expect(el.getAttribute("data-variant")).toBe("dashboard");
  });

  it("supports all 5 variants and assigns variant-specific default chips", () => {
    const variants = [
      "dashboard",
      "mode-tool",
      "next-action",
      "deferred",
      "critical",
    ] as const;
    for (const v of variants) {
      const { unmount } = render(
        <div className="anth">
          <ActionTile variant={v} title={v} testid={`t-${v}`} />
        </div>,
      );
      const el = screen.getByTestId(`t-${v}`);
      expect(el.getAttribute("data-variant")).toBe(v);
      expect(el.className).toContain(`anth-action-tile--${v}`);
      unmount();
    }
  });

  it("deferred variant ships default deferred chip", () => {
    render(
      <div className="anth">
        <ActionTile variant="deferred" title="X" testid="t-def" />
      </div>,
    );
    expect(
      screen.getByTestId("chip-capability-deferred"),
    ).toBeInTheDocument();
  });

  it("critical variant ships default critical chip", () => {
    render(
      <div className="anth">
        <ActionTile variant="critical" title="X" testid="t-crit" />
      </div>,
    );
    expect(screen.getByTestId("chip-risk-critical")).toBeInTheDocument();
  });

  it("custom chip overrides default", () => {
    render(
      <div className="anth">
        <ActionTile
          variant="dashboard"
          title="X"
          chip={{ variant: "readiness", tone: "ready", label: "Ready" }}
          testid="t-chip"
        />
      </div>,
    );
    expect(screen.getByTestId("chip-readiness-ready")).toBeInTheDocument();
  });

  it("metric + secondary metric render with derived testids", () => {
    render(
      <div className="anth">
        <ActionTile
          title="Nodes"
          metric="42"
          secondaryMetric="3 critical"
          testid="t-m"
        />
      </div>,
    );
    expect(screen.getByTestId("t-m-metric")).toHaveTextContent("42");
    expect(screen.getByTestId("t-m-metric-sec")).toHaveTextContent("3 critical");
  });

  it("onActivate fires on click when interactive", async () => {
    const onActivate = vi.fn();
    render(
      <div className="anth">
        <ActionTile title="Go" onActivate={onActivate} testid="t-go" />
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("t-go"));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("disabled tile does not fire onActivate", async () => {
    const onActivate = vi.fn();
    render(
      <div className="anth">
        <ActionTile
          title="No"
          onActivate={onActivate}
          disabled
          testid="t-no"
        />
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("t-no"));
    expect(onActivate).not.toHaveBeenCalled();
    expect(screen.getByTestId("t-no").getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("keyboard Enter triggers onActivate", async () => {
    const onActivate = vi.fn();
    render(
      <div className="anth">
        <ActionTile title="K" onActivate={onActivate} testid="t-k" />
      </div>,
    );
    const user = userEvent.setup();
    const el = screen.getByTestId("t-k");
    el.focus();
    await user.keyboard("{Enter}");
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("non-interactive tile (no onActivate) has no role/button", () => {
    render(
      <div className="anth">
        <ActionTile title="Static" testid="t-static" />
      </div>,
    );
    const el = screen.getByTestId("t-static");
    expect(el.getAttribute("role")).toBeNull();
    expect(el.tabIndex).toBe(-1);
  });
});
