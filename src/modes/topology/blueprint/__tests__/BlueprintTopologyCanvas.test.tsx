/**
 * V1BF — Blueprint Topology Canvas unit tests.
 *
 * Covers:
 *   - density band selection (3 / 8 / 24 / 32 / 96 scenarios)
 *   - role_hint → family code mapping
 *   - active env name + scenario + provenance render in header
 *   - click node selects, second click deselects
 *   - connected edges receive is-active class on selection
 *   - high-density (>48) collapses glyphs to dots
 *
 * The lifecycle provider is stubbed via a thin context wrapper rather
 * than mocked, so the test exercises the same code path the real shell
 * uses.
 */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { JSX, ReactNode } from "react";

import { BlueprintTopologyCanvas } from "../BlueprintTopologyCanvas";
import { pickDensityBand, familyOf } from "../blueprintGlyph";
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

function makeNode(
  id: string,
  role_hint: string,
  label?: string,
): GraphReadyTopologyNode {
  return {
    id,
    label: label ?? id,
    vendor: null,
    platform_id: null,
    role_hint,
    layer: "physical",
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
): GraphReadyTopologyEdge {
  return {
    id,
    source_node_id: source,
    target_node_id: target,
    kind: "lldp",
    local_interface: null,
    remote_interface: null,
    evidence_count: 1,
  };
}

function makeView(
  nodes: GraphReadyTopologyNode[],
  edges: GraphReadyTopologyEdge[],
): GraphReadyTopologyView {
  return {
    environment_id: "env-test",
    nodes,
    edges,
    renderer_attached: false,
    note: "test",
  };
}

function chainNodes(count: number, role = "switch"): GraphReadyTopologyNode[] {
  return Array.from({ length: count }, (_, i) =>
    makeNode(`n${String(i).padStart(2, "0")}`, role, `host-${i}`),
  );
}

function chainEdges(count: number): GraphReadyTopologyEdge[] {
  const out: GraphReadyTopologyEdge[] = [];
  for (let i = 0; i + 1 < count; i++) {
    out.push(
      makeEdge(`e${i}`, `n${String(i).padStart(2, "0")}`, `n${String(i + 1).padStart(2, "0")}`),
    );
  }
  return out;
}

interface FakeActiveOpts {
  name?: string;
  scenarioId?: string | null;
  provenance?: string;
}

function fakeActive(opts: FakeActiveOpts = {}): LocalEnvironmentRecord {
  return {
    environment_id: "env-test",
    name: opts.name ?? "Test Lab",
    provenance: (opts.provenance ?? "generated-lab") as LocalEnvironmentRecord["provenance"],
    lifecycle_state: "active",
    created_at: "2026-05-23T00:00:00Z",
    updated_at: "2026-05-23T00:00:00Z",
    lab_payload: {
      scenario_id: opts.scenarioId ?? "branch-office",
    } as unknown as LocalEnvironmentRecord["lab_payload"],
  } as LocalEnvironmentRecord;
}

function withActive(active: LocalEnvironmentRecord, ui: ReactNode): JSX.Element {
  // Cast to the full context shape — the canvas only reads `.active`.
  const value = { active } as unknown as EnvironmentLifecycleContextValue;
  return (
    <EnvironmentLifecycleContext.Provider value={value}>
      {ui}
    </EnvironmentLifecycleContext.Provider>
  );
}

describe("blueprintGlyph", () => {
  it("picks density band per the 5 lab scenarios", () => {
    expect(pickDensityBand(3)).toBe("full");
    expect(pickDensityBand(8)).toBe("full");
    expect(pickDensityBand(24)).toBe("faceplate");
    expect(pickDensityBand(32)).toBe("silhouette");
    expect(pickDensityBand(96)).toBe("dot");
  });

  it("maps role_hint into 8 families", () => {
    expect(familyOf(makeNode("a", "access switch"))).toBe("ACC-SW");
    expect(familyOf(makeNode("a", "distribution switch"))).toBe("DIST-SW");
    expect(familyOf(makeNode("a", "core router"))).toBe("CORE-RT");
    expect(familyOf(makeNode("a", "edge router"))).toBe("EDGE-RT");
    expect(familyOf(makeNode("a", "firewall"))).toBe("FW");
    expect(familyOf(makeNode("a", "server"))).toBe("SRV");
    expect(familyOf(makeNode("a", "wireless ap"))).toBe("WAP");
    expect(familyOf(makeNode("a", "anything-else"))).toBe("UNK");
  });
});

describe("BlueprintTopologyCanvas — source pedigree header", () => {
  it("shows active env name, scenario id, node + link counts, provenance", () => {
    const view = makeView(chainNodes(8), chainEdges(8));
    const active = fakeActive({ name: "branch-office-04", scenarioId: "branch-office" });
    render(
      withActive(
        active,
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const header = screen.getByTestId("bt-header");
    expect(header).toHaveTextContent("branch-office-04");
    expect(header).toHaveTextContent("branch-office");
    expect(header).toHaveTextContent(/nodes\s*8/i);
    expect(header).toHaveTextContent(/links\s*7/i);
    expect(screen.getByTestId("bt-header-prov")).toHaveTextContent(
      "generated-lab",
    );
  });

  it("falls back to view.environment_id when no provider is mounted", () => {
    const view = makeView(chainNodes(3), chainEdges(3));
    render(<BlueprintTopologyCanvas view={view} dataSource="simulated" />);
    expect(screen.getByTestId("bt-header")).toHaveTextContent("env-test");
    expect(screen.getByTestId("bt-header-prov")).toHaveTextContent("simulated");
  });
});

describe("BlueprintTopologyCanvas — selection", () => {
  it("clicking a node opens the summary; second click clears it", () => {
    const view = makeView(chainNodes(3, "switch"), chainEdges(3));
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const target = screen.getByTestId("bt-node-n01");
    fireEvent.click(target);
    const summary = screen.getByTestId("bt-summary");
    expect(within(summary).getByText("n01")).toBeInTheDocument();
    fireEvent.click(target);
    expect(within(summary).getByText(/click any node/i)).toBeInTheDocument();
  });

  it("highlights connected edges when a node is selected", () => {
    const view = makeView(chainNodes(3, "switch"), chainEdges(3));
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-n01"));
    const e0 = container.querySelector('[data-testid="bt-edge-e0"]');
    const e1 = container.querySelector('[data-testid="bt-edge-e1"]');
    expect(e0?.getAttribute("class")).toContain("is-active");
    expect(e1?.getAttribute("class")).toContain("is-active");
  });
});

describe("BlueprintTopologyCanvas — hardware passport (V1BG)", () => {
  it("renders passport facts for the selected node (access switch)", () => {
    const view = makeView([makeNode("sw-01", "access switch", "sw-01")], []);
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-sw-01"));
    const passport = screen.getByTestId("bt-summary-passport");
    expect(within(passport).getByTestId("bt-passport-profile")).toHaveTextContent(
      "access24",
    );
    expect(passport).toHaveTextContent("ANTHRACITE · AXS-124-G");
    expect(passport).toHaveTextContent(/ports.*24\s*\/\s*4\s*\/\s*0/i);
  });

  it("resolves UNK glyphs to the unk1u profile (no silent fallback)", () => {
    const view = makeView([makeNode("mystery", "anything-else", "mystery")], []);
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-mystery"));
    expect(screen.getByTestId("bt-passport-profile")).toHaveTextContent("unk1u");
  });

  it("picks vrouter when role_hint says virtual router", () => {
    const view = makeView(
      [makeNode("vr", "virtual edge router", "vr")],
      [],
    );
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-vr"));
    expect(screen.getByTestId("bt-passport-profile")).toHaveTextContent("vrouter");
  });
});

describe("BlueprintTopologyCanvas — inspect bridge (V1BG)", () => {
  it("Inspect Hardware ▸ CTA fires intent with trigger='cta'", () => {
    const view = makeView([makeNode("sw-01", "access switch", "sw-01")], []);
    const intents: unknown[] = [];
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas
          view={view}
          dataSource="simulated"
          onInspect={(intent) => intents.push(intent)}
        />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-sw-01"));
    fireEvent.click(screen.getByTestId("bt-inspect-cta"));
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({
      source: "blueprint",
      nodeId: "sw-01",
      profileId: "access24",
      family: "ACC-SW",
      trigger: "cta",
      label: "sw-01",
    });
  });

  it("double-click on a node fires intent with trigger='doubleclick'", () => {
    const view = makeView([makeNode("fw-1", "firewall", "fw-1")], []);
    const intents: { trigger?: string; profileId?: string }[] = [];
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas
          view={view}
          dataSource="simulated"
          onInspect={(intent) => intents.push(intent)}
        />,
      ),
    );
    fireEvent.doubleClick(screen.getByTestId("bt-node-fw-1"));
    expect(intents).toHaveLength(1);
    expect(intents[0].trigger).toBe("doubleclick");
    expect(intents[0].profileId).toBe("fw1u");
  });

  it("CTA is hidden when nothing is selected", () => {
    const view = makeView([makeNode("a", "access switch")], []);
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    expect(screen.queryByTestId("bt-inspect-cta")).toBeNull();
  });
});

describe("BlueprintTopologyCanvas — 96-node visibility (V1BJ hotfix 3)", () => {
  it("renders an SVG <g> node element for every node in a 96-node graph", () => {
    const view = makeView(chainNodes(96, "router"), chainEdges(96));
    const { container } = render(
      withActive(
        fakeActive({ scenarioId: "metro-backbone" }),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const nodeGroups = container.querySelectorAll('[data-testid^="bt-node-"]');
    expect(nodeGroups.length).toBe(96);
  });

  it("renders SVG <line> edge elements for every link in a 96-node graph", () => {
    const view = makeView(chainNodes(96, "router"), chainEdges(96));
    const { container } = render(
      withActive(
        fakeActive({ scenarioId: "metro-backbone" }),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const edgeLines = container.querySelectorAll('[data-testid^="bt-edge-"]');
    // chainEdges(96) produces 95 edges
    expect(edgeLines.length).toBe(95);
  });

  it("uses the .blueprint-topology surface class (light drafting paper), not a black panel", () => {
    const view = makeView(chainNodes(8), chainEdges(8));
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const root = container.querySelector(".blueprint-topology");
    expect(root).not.toBeNull();
    // Canvas wrap must be present with its own light surface class
    expect(container.querySelector(".bt-canvas-wrap")).not.toBeNull();
    // Make sure no dark `tg-panel` class is leaking into the blueprint root
    expect(root!.classList.contains("tg-panel")).toBe(false);
  });
});

describe("BlueprintTopologyCanvas — empty payload guard (V1BJ hotfix 2)", () => {
  it("renders explicit empty overlay when no nodes reach the canvas", () => {
    const view = makeView([], []);
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    expect(screen.getByTestId("bt-empty-overlay")).toHaveTextContent(
      /simulated graph payload is empty/i,
    );
  });

  it("does not render the empty overlay when nodes are present", () => {
    const view = makeView(chainNodes(3), chainEdges(3));
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    expect(screen.queryByTestId("bt-empty-overlay")).toBeNull();
  });
});

describe("BlueprintTopologyCanvas — density at scenario boundaries", () => {
  it("renders the 3-node scenario at full density with labels", () => {
    const view = makeView(chainNodes(3, "switch"), chainEdges(3));
    const { container } = render(
      withActive(
        fakeActive({ scenarioId: "micro-lab" }),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    expect(container.querySelector('[data-density="full"]')).toBeTruthy();
    expect(container.querySelectorAll(".bt-node-label").length).toBe(3);
  });

  it("renders the 96-node scenario as dots", () => {
    const view = makeView(chainNodes(96, "router"), chainEdges(96));
    const { container } = render(
      withActive(
        fakeActive({ scenarioId: "metro-backbone" }),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    expect(container.querySelector('[data-density="dot"]')).toBeTruthy();
    expect(container.querySelectorAll(".bt-node-faceplate").length).toBe(0);
    expect(container.querySelectorAll(".bt-node-label").length).toBe(0);
  });
});
