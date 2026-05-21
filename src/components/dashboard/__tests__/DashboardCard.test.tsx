/**
 * D2 — DashboardCard render + interaction tests.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardCard } from "../DashboardCard";
import type { DashboardCardContract } from "../../../state/designHandoffContract";
import type { DashboardCardProjection } from "../cardMetricResolver";

const CONTRACT: DashboardCardContract = {
  id: "readiness",
  title: "Readiness",
  source_spine: "assessmentReadiness",
  primary_metric: "overall_state",
  secondary_metrics: ["available_inputs", "missing_inputs"],
  status_token: "overall_state",
  target_mode: "operate",
  target_tool_id: "readiness_context",
};

const PROJECTION: DashboardCardProjection = {
  metric: "ready",
  secondaryMetric: "4 inputs",
  chip: { variant: "readiness", tone: "ready", label: "Ready" },
  summary: "Readiness derived from local context.",
  disabled: false,
  iconId: "assess-checklist",
};

describe("DashboardCard — D2", () => {
  it("renders contract + projection with derived testids", () => {
    render(
      <div className="anth">
        <DashboardCard contract={CONTRACT} projection={PROJECTION} />
      </div>,
    );
    expect(screen.getByTestId("dashboard-card-readiness")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-card-readiness-metric")).toHaveTextContent("ready");
    expect(screen.getByTestId("dashboard-card-readiness-metric-sec")).toHaveTextContent("4 inputs");
    expect(screen.getByTestId("dashboard-card-readiness-summary")).toHaveTextContent(
      "Readiness derived from local context.",
    );
    expect(screen.getByTestId("dashboard-card-readiness-target")).toHaveTextContent(
      "operate",
    );
    expect(screen.getByTestId("dashboard-card-readiness-chip")).toHaveTextContent("Ready");
  });

  it("target_mode + target_tool_id reflect contract", () => {
    render(
      <div className="anth">
        <DashboardCard contract={CONTRACT} projection={PROJECTION} />
      </div>,
    );
    const el = screen.getByTestId("dashboard-card-readiness");
    expect(el.getAttribute("data-target-mode")).toBe("operate");
    expect(el.getAttribute("data-target-tool-id")).toBe("readiness_context");
  });

  it("disabled card has aria-disabled, no role=button", () => {
    render(
      <div className="anth">
        <DashboardCard
          contract={CONTRACT}
          projection={{ ...PROJECTION, disabled: true }}
          onActivate={() => undefined}
        />
      </div>,
    );
    const el = screen.getByTestId("dashboard-card-readiness");
    expect(el.getAttribute("aria-disabled")).toBe("true");
    expect(el.getAttribute("role")).toBeNull();
  });

  it("onActivate fires when interactive + click", async () => {
    const onActivate = vi.fn();
    render(
      <div className="anth">
        <DashboardCard
          contract={CONTRACT}
          projection={PROJECTION}
          onActivate={onActivate}
        />
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("dashboard-card-readiness"));
    expect(onActivate).toHaveBeenCalledWith(CONTRACT);
  });

  it("inert card (no onActivate) has no role, no tabIndex", () => {
    render(
      <div className="anth">
        <DashboardCard contract={CONTRACT} projection={PROJECTION} />
      </div>,
    );
    const el = screen.getByTestId("dashboard-card-readiness");
    expect(el.getAttribute("role")).toBeNull();
    expect(el.tabIndex).toBe(-1);
  });

  it("hides secondary metric when null", () => {
    render(
      <div className="anth">
        <DashboardCard
          contract={CONTRACT}
          projection={{ ...PROJECTION, secondaryMetric: null }}
        />
      </div>,
    );
    expect(
      screen.queryByTestId("dashboard-card-readiness-metric-sec"),
    ).toBeNull();
  });
});
