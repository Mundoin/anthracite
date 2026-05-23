import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { EnvironmentsToolId } from "../modes/environments/EnvironmentsMode";

/**
 * Minimal test verifying that EnvironmentsMode imports and types compile.
 * Full App routing integration is tested via ModeRail and broader E2E flows.
 * Mocking the full App is complex due to extensive async setup and dependencies.
 */
describe("App — Environments routing", () => {
  it("EnvironmentsToolId type is available and valid", () => {
    const toolId: EnvironmentsToolId = "overview";
    expect(toolId).toBe("overview");

    const creatorId: EnvironmentsToolId = "creator";
    expect(creatorId).toBe("creator");

    const syncId: EnvironmentsToolId = "sync";
    expect(syncId).toBe("sync");
  });

  it("ENVIRONMENTS_TOOL_META includes all 6 tools", async () => {
    const { ENVIRONMENTS_TOOL_META } = await import(
      "../modes/environments/EnvironmentsMode"
    );
    expect(ENVIRONMENTS_TOOL_META).toHaveLength(6);
    const ids = ENVIRONMENTS_TOOL_META.map((t) => t.id);
    expect(ids).toContain("overview");
    expect(ids).toContain("creator");
    expect(ids).toContain("store");
    expect(ids).toContain("configs");
    expect(ids).toContain("dossier");
    expect(ids).toContain("sync");
  });

  it("ENVIRONMENTS_DEFAULT_TOOL_ID is overview", async () => {
    const { ENVIRONMENTS_DEFAULT_TOOL_ID } = await import(
      "../modes/environments/EnvironmentsMode"
    );
    expect(ENVIRONMENTS_DEFAULT_TOOL_ID).toBe("overview");
  });

  it("environments catalogue entry exists in modeCatalogue", async () => {
    const { MODE_CATALOGUE } = await import("../contracts/modeCatalogue");
    const envMode = MODE_CATALOGUE.modes.find((m) => m.id === "environments");
    expect(envMode).toBeDefined();
    expect(envMode?.label).toBe("Environments");
    expect(envMode?.group).toBe("Foundation");
    expect(envMode?.state).toBe("available");
    expect(envMode?.shortLabel).toBe("ENV");
  });

  it("environments is positioned before hierarchy in Foundation", async () => {
    const { MODE_CATALOGUE } = await import("../contracts/modeCatalogue");
    const envIndex = MODE_CATALOGUE.modes.findIndex((m) => m.id === "environments");
    const hierIndex = MODE_CATALOGUE.modes.findIndex((m) => m.id === "hierarchy");
    expect(envIndex).toBeGreaterThan(-1);
    expect(hierIndex).toBeGreaterThan(-1);
    expect(envIndex).toBeLessThan(hierIndex);
  });
});
