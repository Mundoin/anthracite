/**
 * V1BH — Hardware Inspect Receiver tests.
 *
 * Covers:
 *  - receiver source file has zero `@babylonjs/core` imports
 *    (the Babylon chunk must stay deferred)
 *  - intent dispatched from Blueprint flips the receiver to "entering"
 *  - "Back to map" returns to the map layer
 *  - underlying view change resets receiver state (no stale intent)
 *
 * The lazy 3D scene is not actually mounted under jsdom (Babylon
 * cannot boot without WebGL). The receiver-side fallback +
 * state-machine behaviour is what we assert.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { HardwareInspectReceiver } from "../HardwareInspectReceiver";
import type {
  GraphReadyTopologyEdge,
  GraphReadyTopologyNode,
  GraphReadyTopologyView,
} from "../../topologyReview";
import {
  EnvironmentLifecycleContext,
  type EnvironmentLifecycleContextValue,
} from "../../../../state/EnvironmentLifecycleContext";
import type { LocalEnvironmentRecord } from "../../../../types/localEnvironment";

function makeNode(id: string, role_hint: string): GraphReadyTopologyNode {
  return {
    id,
    label: id,
    vendor: null,
    platform_id: null,
    role_hint,
    layer: "physical",
  };
}

function makeView(
  nodes: GraphReadyTopologyNode[],
  edges: GraphReadyTopologyEdge[] = [],
): GraphReadyTopologyView {
  return {
    environment_id: "env-test",
    nodes,
    edges,
    renderer_attached: false,
    note: "test",
  };
}

function fakeActive(): LocalEnvironmentRecord {
  return {
    environment_id: "env-test",
    name: "Test Lab",
    provenance: "generated-lab" as LocalEnvironmentRecord["provenance"],
    lifecycle_state: "active",
    created_at: "2026-05-23T00:00:00Z",
    updated_at: "2026-05-23T00:00:00Z",
    lab_payload: {
      scenario_id: "branch-office",
    } as unknown as LocalEnvironmentRecord["lab_payload"],
  } as LocalEnvironmentRecord;
}

function withActive(ui: React.ReactNode): JSX.Element {
  const value = { active: fakeActive() } as unknown as EnvironmentLifecycleContextValue;
  return (
    <EnvironmentLifecycleContext.Provider value={value}>
      {ui}
    </EnvironmentLifecycleContext.Provider>
  );
}

describe("HardwareInspectReceiver — Babylon stays deferred", () => {
  it("receiver source contains no @babylonjs/core imports", () => {
    const src = readFileSync(
      resolve(__dirname, "../HardwareInspectReceiver.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/from\s+["']@babylonjs\/core["']/);
    // The scene module is dynamic-imported.
    expect(src).toMatch(/import\(["']\.\/HardwareInspectScene["']\)/);
    expect(src).toMatch(/lazy\(\s*\(\)\s*=>/);
  });

  it("scene source is where Babylon is consumed", () => {
    const src = readFileSync(
      resolve(__dirname, "../HardwareInspectScene.tsx"),
      "utf8",
    );
    expect(src).toMatch(/from\s+["']@babylonjs\/core["']/);
  });
});

describe("HardwareInspectReceiver — intent state machine", () => {
  it("clicking Inspect Hardware ▸ dispatches intent and enters scene phase", () => {
    vi.useFakeTimers();
    try {
      const view = makeView([makeNode("sw-01", "access switch")]);
      render(
        withActive(
          <HardwareInspectReceiver
            canvasProps={{ view, dataSource: "simulated" }}
          />,
        ),
      );

      const receiver = screen.getByTestId("hardware-inspect-receiver");
      expect(receiver).toHaveAttribute("data-phase", "map");

      fireEvent.click(screen.getByTestId("bt-node-sw-01"));
      fireEvent.click(screen.getByTestId("bt-inspect-cta"));

      expect(receiver).toHaveAttribute("data-phase", "entering");
      // scene layer mounted (Suspense fallback or chunk depending on resolver)
      expect(screen.getByTestId("hir-scene-layer")).toBeInTheDocument();

      // advance the 240 ms tween
      act(() => {
        vi.advanceTimersByTime(240);
      });
      expect(receiver).toHaveAttribute("data-phase", "scene");
    } finally {
      vi.useRealTimers();
    }
  });

  it("clearing the view resets intent + phase", () => {
    const view1 = makeView([makeNode("a", "access switch")]);
    const { rerender } = render(
      withActive(
        <HardwareInspectReceiver
          canvasProps={{ view: view1, dataSource: "simulated" }}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId("bt-node-a"));
    fireEvent.click(screen.getByTestId("bt-inspect-cta"));
    expect(screen.getByTestId("hardware-inspect-receiver")).toHaveAttribute(
      "data-phase",
      "entering",
    );

    const view2 = makeView([makeNode("b", "firewall")]);
    rerender(
      withActive(
        <HardwareInspectReceiver
          canvasProps={{ view: view2, dataSource: "simulated" }}
        />,
      ),
    );
    expect(screen.getByTestId("hardware-inspect-receiver")).toHaveAttribute(
      "data-phase",
      "map",
    );
    expect(screen.queryByTestId("hir-scene-layer")).toBeNull();
  });

  it("renders lock marks during entering and exiting; not during map", () => {
    vi.useFakeTimers();
    try {
      const view = makeView([makeNode("sw-01", "access switch")]);
      render(
        withActive(
          <HardwareInspectReceiver
            canvasProps={{ view, dataSource: "simulated" }}
          />,
        ),
      );
      // map phase — overlay absent
      expect(screen.queryByTestId("inspection-lock-marks")).toBeNull();

      fireEvent.click(screen.getByTestId("bt-node-sw-01"));
      fireEvent.click(screen.getByTestId("bt-inspect-cta"));

      // entering phase — lock stage
      const lockOverlay = screen.getByTestId("inspection-lock-marks");
      expect(lockOverlay).toHaveAttribute("data-stage", "lock");

      act(() => {
        vi.advanceTimersByTime(240);
      });
      // scene phase — settled stage (brackets only)
      expect(screen.getByTestId("inspection-lock-marks")).toHaveAttribute(
        "data-stage",
        "settled",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("double-click on a node also dispatches intent", () => {
    const view = makeView([makeNode("fw-1", "firewall")]);
    render(
      withActive(
        <HardwareInspectReceiver
          canvasProps={{ view, dataSource: "simulated" }}
        />,
      ),
    );
    fireEvent.doubleClick(screen.getByTestId("bt-node-fw-1"));
    expect(screen.getByTestId("hardware-inspect-receiver")).toHaveAttribute(
      "data-phase",
      "entering",
    );
  });
});

describe("HardwareInspectReceiver — V1BK split layout", () => {
  it("renders map column alongside inspection bay during scene phase", () => {
    vi.useFakeTimers();
    try {
      const view = makeView([makeNode("sw-01", "access switch")]);
      render(
        withActive(
          <HardwareInspectReceiver
            canvasProps={{ view, dataSource: "simulated" }}
          />,
        ),
      );

      // pre-inspect: map column present, bay absent
      expect(screen.getByTestId("hir-map-layer")).toBeInTheDocument();
      expect(screen.queryByTestId("hir-bay")).toBeNull();

      fireEvent.click(screen.getByTestId("bt-node-sw-01"));
      fireEvent.click(screen.getByTestId("bt-inspect-cta"));

      // bay mounts in `opening` state alongside the still-mounted map
      const bay = screen.getByTestId("hir-bay");
      expect(bay).toHaveAttribute("data-bay-open", "opening");
      expect(screen.getByTestId("hir-map-layer")).toBeInTheDocument();

      // settle into scene → bay open, map still mounted
      act(() => {
        vi.advanceTimersByTime(240);
      });
      expect(screen.getByTestId("hir-bay")).toHaveAttribute(
        "data-bay-open",
        "open",
      );
      expect(screen.getByTestId("hir-map-layer")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("view change collapses bay and keeps map mounted", () => {
    // Under jsdom the lazy scene resolves to the Suspense fallback,
    // so the scene's `◂ Back to map` button is not mountable here.
    // The close path is exercised by re-rendering with a fresh view,
    // which forces the receiver's reset-on-view effect — and proves
    // the map column stays mounted across the unmount.
    vi.useFakeTimers();
    try {
      const view1 = makeView([makeNode("sw-01", "access switch")]);
      const { rerender } = render(
        withActive(
          <HardwareInspectReceiver
            canvasProps={{ view: view1, dataSource: "simulated" }}
          />,
        ),
      );
      fireEvent.click(screen.getByTestId("bt-node-sw-01"));
      fireEvent.click(screen.getByTestId("bt-inspect-cta"));
      act(() => {
        vi.advanceTimersByTime(240);
      });
      expect(screen.getByTestId("hir-bay")).toHaveAttribute(
        "data-bay-open",
        "open",
      );

      const view2 = makeView([makeNode("fw-1", "firewall")]);
      rerender(
        withActive(
          <HardwareInspectReceiver
            canvasProps={{ view: view2, dataSource: "simulated" }}
          />,
        ),
      );
      // bay unmounted; map still present
      expect(screen.queryByTestId("hir-bay")).toBeNull();
      expect(screen.getByTestId("hir-map-layer")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
