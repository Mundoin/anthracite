/**
 * V1CB-HF1 — Imported-evidence demo fixture + adapter chain tests.
 */

import { describe, it, expect } from "vitest";
import {
  buildImportedDemoTopologyView,
  IMPORTED_DEMO_ENV_ID,
} from "../__fixtures__/importedDemoEvidence";
import { attachImportedSourceToTopologyView } from "../importedEvidenceTopologyAdapter";

describe("buildImportedDemoTopologyView", () => {
  it("produces a view with 4 nodes + 3 LLDP edges + non-zero evidence", () => {
    const v = buildImportedDemoTopologyView();
    expect(v.environment_id).toBe(IMPORTED_DEMO_ENV_ID);
    expect(v.nodes.length).toBe(4);
    expect(v.edges.length).toBe(3);
    for (const e of v.edges) {
      expect(e.kind).toBe("lldp");
      expect(e.evidence_count).toBeGreaterThan(0);
    }
  });

  it("carries device operational states so V1BU/V1BV/V1BW have visible payload", () => {
    const v = buildImportedDemoTopologyView();
    const states = v.nodes.map((n) => n.operational_state).sort();
    expect(states).toContain("warning");
    expect(states).toContain("degraded");
    // At least one healthy so affected-only fade can be visually
    // observed too.
    expect(states).toContain("healthy");
  });

  it("derives link state via severity precedence", () => {
    const v = buildImportedDemoTopologyView();
    const linkStates = v.edges.map((e) => e.operational_state).sort();
    // core-rtr (warning) ↔ dist-sw (degraded) → degraded wins
    expect(linkStates).toContain("degraded");
  });

  it("is deterministic — repeated calls return identical structure", () => {
    const a = buildImportedDemoTopologyView();
    const b = buildImportedDemoTopologyView();
    expect(a).toEqual(b);
  });
});

describe("V1CB-HF1 demo → V1CB adapter chain", () => {
  it("passes through the V1CB adapter and stamps source.kind = 'imported'", () => {
    const raw = buildImportedDemoTopologyView();
    const stamped = attachImportedSourceToTopologyView({
      view: raw,
      label: "Imported · Demo (V1CB-HF1)",
      evidence: ["fixture", "lldp-demo"],
      producer: "imported-demo/0.1",
    });
    expect(stamped.source?.kind).toBe("imported");
    expect(stamped.source?.label).toBe("Imported · Demo (V1CB-HF1)");
    expect(stamped.source?.evidence).toEqual(["fixture", "lldp-demo"]);
    expect(stamped.source?.producer).toBe("imported-demo/0.1");
    // Freshness stays "unknown" because no observed_at provided.
    expect(stamped.source?.freshness).toBe("unknown");
    // Nodes + edges preserved.
    expect(stamped.nodes.length).toBe(4);
    expect(stamped.edges.length).toBe(3);
  });
});
