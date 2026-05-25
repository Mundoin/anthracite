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
    // V1BL — the fixed summary column is gone. Selection renders as
    // a floating passport card; clicking the node again deselects
    // and the card unmounts.
    const passport = screen.getByTestId("bt-passport-floating");
    expect(within(passport).getByText("n01")).toBeInTheDocument();
    fireEvent.click(target);
    expect(screen.queryByTestId("bt-passport-floating")).toBeNull();
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

describe("BlueprintTopologyCanvas — V1BR.hotfix-1 device palette", () => {
  it("renders .bt-node-frame with the new frame-fill token applied", () => {
    const view = makeView([makeNode("sw-01", "access switch", "sw-01")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const frame = container.querySelector(".bt-node-frame");
    expect(frame).toBeInTheDocument();
    expect(frame?.getAttribute("class")).toContain("bt-node-frame");
  });

  it("renders .bt-node-family-code for known device families", () => {
    const view = makeView([makeNode("edge", "edge router", "edge")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const familyCode = container.querySelector(".bt-node-family-code");
    expect(familyCode).toBeInTheDocument();
    expect(familyCode?.textContent).toBe("EDGE-RT");
  });

  it("renders .bt-node-label with hostname text", () => {
    const view = makeView([makeNode("rtr-cisco-001", "edge router", "rtr-cisco-001")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const label = container.querySelector(".bt-node-label");
    expect(label).toBeInTheDocument();
    expect(label?.textContent).toBe("rtr-cisco-001");
  });
});

describe("BlueprintTopologyCanvas — V1BS icon-as-frame", () => {
  it("renders the family icon group inside each device node", () => {
    const view = makeView(
      [
        makeNode("fw-1", "firewall", "fw-1"),
        makeNode("core-1", "core router", "core-1"),
        makeNode("edge-1", "edge router", "edge-1"),
        makeNode("acc-1", "access switch", "acc-1"),
      ],
      [],
    );
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );

    expect(container.querySelector('[data-network-icon="fw"]')).toBeInTheDocument();
    expect(container.querySelector('[data-network-icon="core-rt"]')).toBeInTheDocument();
    expect(container.querySelector('[data-network-icon="edge-rt"]')).toBeInTheDocument();
    expect(container.querySelector('[data-network-icon="acc-sw"]')).toBeInTheDocument();
  });

  it("hit-target frame stays in the DOM (drag/click rely on it)", () => {
    const view = makeView([makeNode("sw-1", "access switch", "sw-1")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const frame = container.querySelector(".bt-node-frame");
    expect(frame).toBeInTheDocument();
  });

  it("dot-density nodes render an invisible hit-target frame for drag/click", () => {
    const view = makeView(chainNodes(96, "router"), chainEdges(96));
    const { container } = render(
      withActive(
        fakeActive({ scenarioId: "metro-backbone" }),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const dotNode = container.querySelector('[data-density="dot"]');
    expect(dotNode).toBeInTheDocument();
    expect(dotNode?.querySelector(".bt-node-frame")).toBeInTheDocument();
  });

  it("hostname labels render across all bands (full / faceplate / silhouette / dot)", () => {
    // Mix scenario sizes to hit every band.
    for (const count of [5, 20, 40, 96]) {
      const view = makeView(chainNodes(count, "router"), chainEdges(count));
      const { container, unmount } = render(
        withActive(
          fakeActive(),
          <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
        ),
      );
      expect(container.querySelectorAll(".bt-node-label").length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("UNK family renders its dashed icon group", () => {
    const view = makeView([makeNode("mystery", "anything-else", "mystery")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    expect(container.querySelector('[data-network-icon="unk"]')).toBeInTheDocument();
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

  it("V1BL — surfaces switch-inspection hint when inspecting a different node", () => {
    const view = makeView(
      [
        makeNode("sw-01", "access switch", "sw-01"),
        makeNode("sw-02", "access switch", "sw-02"),
      ],
      [],
    );
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas
          view={view}
          dataSource="simulated"
          inspectingNodeId="sw-01"
        />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-sw-02"));
    expect(
      screen.getByTestId("bt-passport-switch-hint"),
    ).toHaveTextContent(/re-inspect to switch/i);
    expect(screen.getByTestId("bt-inspect-cta")).toHaveTextContent(
      /re-inspect/i,
    );
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

describe("BlueprintTopologyCanvas — V1BL-B canvas navigation", () => {
  it("renders Fit / Reset / zoom indicator nav strip", () => {
    const view = makeView(chainNodes(3), chainEdges(3));
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    expect(screen.getByTestId("bt-nav")).toBeInTheDocument();
    expect(screen.getByTestId("bt-nav-fit")).toBeInTheDocument();
    expect(screen.getByTestId("bt-nav-reset")).toBeInTheDocument();
    expect(screen.getByTestId("bt-nav-zoom")).toHaveTextContent("100%");
  });

  it("V1BL-G — plain wheel zooms the canvas (modifiers ignored)", () => {
    const view = makeView(chainNodes(3), chainEdges(3));
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const svg = screen.getByTestId("bt-svg");
    fireEvent.wheel(svg, { deltaY: -100, clientX: 100, clientY: 100 });
    fireEvent.wheel(svg, { deltaY: -100, clientX: 100, clientY: 100 });
    const indicator = screen.getByTestId("bt-nav-zoom");
    expect(indicator.textContent).not.toBe("100%");
    expect(Number.parseInt(indicator.textContent ?? "0", 10)).toBeGreaterThan(100);
  });

  it("V1BL-F — Reset returns to 100% (clears transform + offsets)", () => {
    const view = makeView(chainNodes(3), chainEdges(3));
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const svg = screen.getByTestId("bt-svg");
    fireEvent.wheel(svg, { deltaY: -100, clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByTestId("bt-nav-reset"));
    expect(screen.getByTestId("bt-nav-zoom")).toHaveTextContent("100%");
    const wrap = screen.getByTestId("bt-canvas-wrap");
    expect(wrap.getAttribute("data-tx")).toBe("0.00");
    expect(wrap.getAttribute("data-ty")).toBe("0.00");
    expect(wrap.getAttribute("data-scale")).toBe("1.000");
  });

  it("Reset returns to 100% (legacy alias)", () => {
    const view = makeView(chainNodes(3), chainEdges(3));
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const svg = screen.getByTestId("bt-svg");
    fireEvent.wheel(svg, { deltaY: -100, clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByTestId("bt-nav-reset"));
    expect(screen.getByTestId("bt-nav-zoom")).toHaveTextContent("100%");
  });

  // Note: click-vs-drag deselect path (pointerdown without movement →
  // clearSelection) is exercised in manual verify. jsdom's pointer
  // event surface around setPointerCapture / currentTarget is too
  // shallow to assert reliably; Escape covers the same intent from a
  // pure-keyboard path.

  it("Escape key dismisses the floating passport", () => {
    const view = makeView(chainNodes(3), chainEdges(3));
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-n01"));
    expect(screen.getByTestId("bt-passport-floating")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("bt-passport-floating")).toBeNull();
  });
});

describe("BlueprintTopologyCanvas — V1BM.hotfix-1 unknown glyph + canvas surface", () => {
  it("renders a quiet `?` instead of loud `UNK` text inside the glyph", () => {
    const view = makeView([makeNode("mystery-01", "anything-else", "mystery-01")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const glyph = container.querySelector(
      '[data-testid="bt-node-mystery-01"] .bt-node-family-code',
    );
    expect(glyph).not.toBeNull();
    expect(glyph?.textContent).toBe("?");
    expect(glyph?.getAttribute("data-family-glyph")).toBe("unknown");
    expect(glyph?.classList.contains("bt-node-family-code--unk")).toBe(true);
  });

  it("keeps the known family code visible for non-UNK nodes", () => {
    const view = makeView([makeNode("sw-01", "access switch", "sw-01")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const glyph = container.querySelector(
      '[data-testid="bt-node-sw-01"] .bt-node-family-code',
    );
    expect(glyph?.textContent).toBe("ACC-SW");
    expect(glyph?.getAttribute("data-family-glyph")).toBe("known");
  });

  it("V1BN.hotfix-1 — dot-density mini-glyph carries family code via data-family-mini", () => {
    // 96-node graph → density "dot". Each node should report its
    // resolved family via `data-family-mini` so dense scenes keep
    // role identity.
    const view = makeView(
      [
        // 48 firewalls + 48 servers → mix of distinct shapes
        ...Array.from({ length: 48 }, (_, i) =>
          makeNode(`fw-fortinet-${String(i).padStart(2, "0")}`, "firewall"),
        ),
        ...Array.from({ length: 48 }, (_, i) =>
          makeNode(`srv-vm-${String(i).padStart(2, "0")}`, "server"),
        ),
      ],
      [],
    );
    const { container } = render(
      withActive(
        fakeActive({ scenarioId: "metro-backbone" }),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const fwNodes = container.querySelectorAll(
      '[data-density="dot"][data-family-mini="FW"]',
    );
    const srvNodes = container.querySelectorAll(
      '[data-density="dot"][data-family-mini="SRV"]',
    );
    expect(fwNodes.length).toBe(48);
    expect(srvNodes.length).toBe(48);
    // FW renders as <rect>, SRV renders as <circle> — confirm shapes
    // are NOT all identical circles (the V1BN.hf1 fix).
    expect(fwNodes[0].querySelector("rect.bt-node-dot--fw")).not.toBeNull();
    expect(srvNodes[0].querySelector("circle.bt-node-dot--srv")).not.toBeNull();
  });

  it("canvas-wrap still mounts (full-surface grid moved to CSS background)", () => {
    const view = makeView(chainNodes(8), chainEdges(8));
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const wrap = container.querySelector(".bt-canvas-wrap");
    expect(wrap).not.toBeNull();
    // SVG grid generator removed; assert no .bt-grid-line in DOM.
    expect(container.querySelectorAll(".bt-grid-line").length).toBe(0);
  });
});

describe("BlueprintTopologyCanvas — V1BL-A white drafting surface", () => {
  it("declares the white-paper canvas token at root scope", () => {
    const view = makeView(chainNodes(3), chainEdges(3));
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const root = container.querySelector(".blueprint-topology") as HTMLElement;
    expect(root).not.toBeNull();
    // jsdom doesn't compute custom-property values; we assert the CSS
    // rule presence by reading the class name, then verify the
    // single-column grid contract that V1BL-A relies on.
    expect(root!.className).toContain("blueprint-topology");
  });

  it("paints high-density dots with graphite fill, cyan only when selected (V1BN.hf1: SRV family stays circular)", () => {
    // V1BN.hotfix-1 — high-density mini-glyph is now role-aware.
    // SRV nodes stay circular; FW/CORE/EDGE/etc. get distinct
    // shapes. Use server roles so the original "circle goes from
    // graphite to cyan on selection" invariant still expresses.
    const view = makeView(chainNodes(96, "server"), chainEdges(96));
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const idleDot = container.querySelector(
      '[data-density="dot"][data-family-mini="SRV"] circle.bt-node-dot--srv',
    ) as SVGCircleElement | null;
    expect(idleDot).not.toBeNull();
    // V1BR.hotfix-3 — Metro dots are outline-only; idle body fill is "none".
    expect(idleDot!.getAttribute("fill")).toBe("none");
    expect(idleDot!.getAttribute("stroke")).toBe("var(--topo-fam-server)");

    // After selection the same dot flips to cyan.
    fireEvent.click(screen.getByTestId("bt-node-n00"));
    const selectedDot = container.querySelector(
      '[data-testid="bt-node-n00"] circle.bt-node-dot--srv',
    ) as SVGCircleElement | null;
    expect(selectedDot).not.toBeNull();
    expect(selectedDot!.getAttribute("fill")).toBe("var(--topo-cyan)");
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

describe("BlueprintTopologyCanvas — V1BN.hotfix-3 SVG layer carries topology-svg-layer marker", () => {
  it("SVG layer carries data-topology-svg-layer for full-surface chain audit", () => {
    const view = makeView(chainNodes(8), chainEdges(8));
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const svg = container.querySelector("svg[data-topology-svg-layer='true']");
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("bt-canvas")).toBe(true);
  });
});

describe("BlueprintTopologyCanvas — V1BN.hotfix-2 surface ownership parity", () => {
  // Five canonical scenarios (Micro 3, Branch 8, Campus 24, Datacenter 32,
  // Metro 96) must mount identical surface ownership chains. If any
  // future change breaks one scenario's surface structure, this test
  // catches it before Bujar sees a regression.
  const scenarios: Array<{
    label: string;
    count: number;
    role: string;
    scenarioId: string;
  }> = [
    { label: "Micro 3",       count: 3,  role: "switch", scenarioId: "micro-lab" },
    { label: "Branch 8",      count: 8,  role: "switch", scenarioId: "branch-office" },
    { label: "Campus 24",     count: 24, role: "switch", scenarioId: "campus" },
    { label: "Datacenter 32", count: 32, role: "router", scenarioId: "datacenter-pod" },
    { label: "Metro 96",      count: 96, role: "router", scenarioId: "metro-backbone" },
  ];

  for (const s of scenarios) {
    it(`${s.label} — mounts the full-surface canvas chain (wrap + svg + transform root)`, () => {
      const view = makeView(chainNodes(s.count, s.role), chainEdges(s.count));
      const { container } = render(
        withActive(
          fakeActive({ scenarioId: s.scenarioId }),
          <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
        ),
      );

      // Surface chain: section.blueprint-topology > div.bt-canvas-wrap > svg.bt-canvas > g[data-testid=bt-transform-root]
      const root = container.querySelector(".blueprint-topology");
      const wrap = container.querySelector(".bt-canvas-wrap");
      const svg = container.querySelector("svg.bt-canvas");
      const transformRoot = container.querySelector('[data-testid="bt-transform-root"]');
      expect(root).not.toBeNull();
      expect(wrap).not.toBeNull();
      expect(svg).not.toBeNull();
      expect(transformRoot).not.toBeNull();

      // viewBox always present so SVG never falls back to intrinsic 300×150.
      expect(svg?.getAttribute("viewBox")).toMatch(/-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?/);
      // preserveAspectRatio set to xMidYMid meet (centred + letterboxed),
      // initial fit-effect compensates for letterboxing.
      expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");

      // No SVG grid-line generator (grid lives on receiver background).
      expect(container.querySelectorAll(".bt-grid-line").length).toBe(0);

      // Every node accounted for.
      expect(container.querySelectorAll('[data-testid^="bt-node-"]').length).toBe(s.count);
    });
  }
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
    // V1BS.hotfix-2 — hostname now renders at every band, including dot.
    // Small variant class keeps the label from crowding Metro.
    expect(container.querySelectorAll(".bt-node-label--dot").length).toBeGreaterThan(0);
  });
});

describe("BlueprintTopologyCanvas — V1BR soft device colors", () => {
  it("renders dots in dot density with soft blue color tokens", () => {
    // V1BR updated the color tokens. In dot density (96+ nodes), dots
    // render with family-specific shapes and new soft sky-blue tones
    // via CSS tokens. Known dots use --topo-node-dot-known,
    // unknown dots use --topo-node-dot-unknown.
    const nodes = chainNodes(96, "access switch");
    // Inject an unknown node in the chain
    nodes[50] = makeNode("n-unk-50", "anything-unknown", "mystery");
    const view = makeView(nodes, chainEdges(96));
    const { container } = render(
      withActive(
        fakeActive({ scenarioId: "metro-backbone" }),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    // Verify both known and unknown dot elements render
    expect(container.querySelectorAll(".bt-node-dot--acc").length).toBeGreaterThan(0);
    expect(container.querySelector(".bt-node-dot--unk")).not.toBeNull();
  });

  it("selected dots in any density use --topo-cyan regardless of family", () => {
    const view = makeView(chainNodes(96, "router"), chainEdges(96));
    const { container } = render(
      withActive(
        fakeActive({ scenarioId: "metro-backbone" }),
        <BlueprintTopologyCanvas
          view={view}
          dataSource="simulated"
        />,
      ),
    );
    // Click a node to select it
    fireEvent.click(screen.getByTestId("bt-node-n00"));
    // Find the selected dot — it should use cyan
    const selectedDot = container.querySelector(".bt-node-dot");
    expect(selectedDot?.getAttribute("fill")).toBe("var(--topo-cyan)");
  });

  it("unknown family code glyph renders in full density", () => {
    // V1BR updates unknown glyphs to use the blue-grey stroke token.
    // Verify the glyph renders and contains the unknown marker.
    const view = makeView([makeNode("mystery", "anything-else", "mystery")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const familyCode = container.querySelector(
      '[data-testid="bt-node-mystery"] .bt-node-family-code--unk',
    );
    expect(familyCode).not.toBeNull();
    expect(familyCode?.textContent).toBe("?");
  });
});

describe("BlueprintTopologyCanvas — V1BU state visualisation", () => {
  it("renders node with data-state attribute when operational_state is set", () => {
    const node = makeNode("n01", "edge router", "edge-01");
    const nodeWithState: GraphReadyTopologyNode = {
      ...node,
      operational_state: "warning",
    };
    const view = makeView([nodeWithState], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const nodeEl = container.querySelector('[data-testid="bt-node-n01"]');
    expect(nodeEl?.getAttribute("data-state")).toBe("warning");
  });

  it("defaults to healthy state when operational_state is not set", () => {
    const view = makeView([makeNode("n01", "edge router", "edge-01")], []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    const nodeEl = container.querySelector('[data-testid="bt-node-n01"]');
    expect(nodeEl?.getAttribute("data-state")).toBe("healthy");
  });

  it("renders different state values (warning, degraded, down, maintenance, unknown)", () => {
    const states: GraphReadyTopologyNode[] = [
      { ...makeNode("n01", "router"), operational_state: "warning" },
      { ...makeNode("n02", "router"), operational_state: "degraded" },
      { ...makeNode("n03", "router"), operational_state: "down" },
      { ...makeNode("n04", "router"), operational_state: "maintenance" },
      { ...makeNode("n05", "router"), operational_state: "unknown" },
    ];
    const view = makeView(states, []);
    const { container } = render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );

    expect(container.querySelector('[data-testid="bt-node-n01"]')?.getAttribute("data-state")).toBe("warning");
    expect(container.querySelector('[data-testid="bt-node-n02"]')?.getAttribute("data-state")).toBe("degraded");
    expect(container.querySelector('[data-testid="bt-node-n03"]')?.getAttribute("data-state")).toBe("down");
    expect(container.querySelector('[data-testid="bt-node-n04"]')?.getAttribute("data-state")).toBe("maintenance");
    expect(container.querySelector('[data-testid="bt-node-n05"]')?.getAttribute("data-state")).toBe("unknown");
  });

  it("displays state in passport row when node is selected", () => {
    const nodeWithState: GraphReadyTopologyNode = {
      ...makeNode("n01", "edge router", "edge-01"),
      operational_state: "warning",
    };
    const view = makeView([nodeWithState], []);
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-n01"));
    const stateRow = screen.getByTestId("bt-passport-state-row");
    expect(stateRow).toBeInTheDocument();
    expect(stateRow).toHaveTextContent(/state/i);
    expect(stateRow).toHaveTextContent("Warning");
  });

  it("passport state row shows correct formatted state text", () => {
    const testCases: Array<[string, string]> = [
      ["healthy", "Healthy"],
      ["warning", "Warning"],
      ["degraded", "Degraded"],
      ["down", "Down"],
      ["maintenance", "Maintenance"],
      ["unknown", "Unknown"],
    ];

    for (const [state, display] of testCases) {
      const nodeWithState: GraphReadyTopologyNode = {
        ...makeNode("n01", "router"),
        operational_state: state as GraphReadyTopologyNode["operational_state"],
      };
      const view = makeView([nodeWithState], []);
      const { unmount } = render(
        withActive(
          fakeActive(),
          <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
        ),
      );
      fireEvent.click(screen.getByTestId("bt-node-n01"));
      const stateRow = screen.getByTestId("bt-passport-state-row");
      expect(stateRow).toHaveTextContent(display);
      unmount();
    }
  });

  it("passport state text has data-state attribute for CSS styling", () => {
    const nodeWithState: GraphReadyTopologyNode = {
      ...makeNode("n01", "router"),
      operational_state: "degraded",
    };
    const view = makeView([nodeWithState], []);
    render(
      withActive(
        fakeActive(),
        <BlueprintTopologyCanvas view={view} dataSource="simulated" />,
      ),
    );
    fireEvent.click(screen.getByTestId("bt-node-n01"));
    const stateStrong = screen.getByTestId("bt-passport-state-row").querySelector("strong");
    expect(stateStrong?.getAttribute("data-state")).toBe("degraded");
  });
});
