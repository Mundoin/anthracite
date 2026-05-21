/**
 * V1CB — BuildIntentWorkspace comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  buildBuildIntentWorkspace,
  type BuildIntentDraft,
  type BuildIntentType,
} from "../buildIntentWorkspace";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_WORKBENCH_ACTION_ROUTER } from "../../../state/workbenchActionRouter";
import { EMPTY_CORTEX_COMMAND_REGISTRY } from "../../../state/cortexCommandRegistry";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function workspace(summary: WorkbenchContextSummary) {
  return buildBuildIntentWorkspace({
    summary,
    readiness: EMPTY_ASSESSMENT_READINESS,
    router: EMPTY_WORKBENCH_ACTION_ROUTER,
    registry: EMPTY_CORTEX_COMMAND_REGISTRY,
    now: () => FIXED_NOW,
  });
}

function draftOf(
  drafts: readonly BuildIntentDraft[],
  intent_type: BuildIntentType,
): BuildIntentDraft {
  const d = drafts.find((x) => x.intent_type === intent_type);
  if (!d) throw new Error(`missing draft ${intent_type}`);
  return d;
}

describe("BuildIntentWorkspace — behavior", () => {
  it("topology nodes enable interface_intent partial", () => {
    const w = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 3,
      },
    });
    const d = draftOf(w.drafts, "interface_intent");
    expect(d.status).toBe("partial");
    expect(d.generated_preview_lines.length).toBeGreaterThan(0);
  });

  it("topology edges improve site_link_intent to partial", () => {
    const empty = workspace(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
    expect(draftOf(empty.drafts, "site_link_intent").status).toBe("blocked");

    const withEdges = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 2,
        edge_count: 2,
      },
    });
    expect(draftOf(withEdges.drafts, "site_link_intent").status).toBe(
      "partial",
    );
  });

  it("topology edges activate routing_intent (deferred without)", () => {
    const empty = workspace(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
    expect(draftOf(empty.drafts, "routing_intent").status).toBe("deferred");

    const withEdges = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 2,
        edge_count: 1,
      },
    });
    expect(draftOf(withEdges.drafts, "routing_intent").status).toBe("partial");
  });

  it("parsed devices activate vlan_intent and acl_intent", () => {
    const w = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        parsed_device_count: 5,
      },
    });
    expect(draftOf(w.drafts, "vlan_intent").status).toBe("partial");
    expect(draftOf(w.drafts, "acl_intent").status).toBe("partial");
  });

  it("known platform alone activates vlan_intent partial", () => {
    const w = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        current_platform_id: "cisco-ios",
      },
    });
    expect(draftOf(w.drafts, "vlan_intent").status).toBe("partial");
  });

  it("receipts mirror drafts safely", () => {
    const w = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 2,
        edge_count: 1,
      },
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        parsed_device_count: 1,
      },
    });
    for (let i = 0; i < w.drafts.length; i++) {
      const d = w.drafts[i];
      const r = w.receipts[i];
      expect(r.draft_id).toBe(d.draft_id);
      expect(r.status).toBe(d.status);
      expect(r.preview_line_count).toBe(d.generated_preview_lines.length);
      expect(r.missing_input_count).toBe(d.missing_inputs.length);
      expect(r.limitation_count).toBe(d.limitations.length);
      expect(r.can_generate_preview).toBe(d.generated_preview_lines.length > 0);
    }
  });

  it("preview lines are deterministic and contain no vendor config syntax", () => {
    const a = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 4,
        edge_count: 3,
      },
    });
    const b = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 4,
        edge_count: 3,
      },
    });
    expect(a.drafts).toEqual(b.drafts);
    for (const d of a.drafts) {
      for (const line of d.generated_preview_lines) {
        // Generic comment lines only — never `interface GigabitEthernet0/1`
        // style vendor syntax. Lines start with `#`.
        expect(line.startsWith("#")).toBe(true);
        expect(line.toLowerCase()).not.toContain("interface gigabit");
        expect(line.toLowerCase()).not.toContain("vlan database");
        expect(line.toLowerCase()).not.toContain("access-list");
      }
    }
  });

  it("workspace counts agree with draft statuses", () => {
    const w = workspace({
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 1,
      },
    });
    let p = 0;
    let d = 0;
    let b = 0;
    for (const draft of w.drafts) {
      if (draft.status === "partial") p += 1;
      else if (draft.status === "deferred") d += 1;
      else if (draft.status === "blocked") b += 1;
    }
    expect(w.partial_count).toBe(p);
    expect(w.deferred_count).toBe(d);
    expect(w.blocked_count).toBe(b);
    expect(w.total_count).toBe(5);
  });

  it("idFactory + now are honored", () => {
    const w = buildBuildIntentWorkspace({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => "2099-01-01T00:00:00.000Z",
      idFactory: (t, n) => `custom-${n}-${t}`,
    });
    expect(w.created_at).toBe("2099-01-01T00:00:00.000Z");
    expect(w.drafts[0].draft_id).toBe("custom-1-interface_intent");
  });
});
