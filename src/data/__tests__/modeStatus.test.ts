import { describe, expect, it } from "vitest";
import { MODE_STATUS } from "../modeStatus";

const ALL_MODE_IDS = [
  "hierarchy", "intake", "provisioning", "operate", "topology",
  "diagnose", "assess", "security", "dashboards", "build", "settings",
  "opsConsole",
] as const;

describe("MODE_STATUS", () => {
  it("every ModeId has an entry", () => {
    for (const id of ALL_MODE_IDS) {
      expect(MODE_STATUS[id]).toBeDefined();
    }
  });

  it("intake, assess, hierarchy, settings, opsConsole, topology are built", () => {
    expect(MODE_STATUS.intake.state).toBe("built");
    expect(MODE_STATUS.assess.state).toBe("built");
    expect(MODE_STATUS.hierarchy.state).toBe("built");
    expect(MODE_STATUS.settings.state).toBe("built");
    expect(MODE_STATUS.opsConsole.state).toBe("built");
    expect(MODE_STATUS.topology.state).toBe("built");
  });

  it("all not_connected entries have non-empty engineName", () => {
    for (const status of Object.values(MODE_STATUS)) {
      if (status.state === "not_connected") {
        expect(status.engineName.length).toBeGreaterThan(0);
      }
    }
  });

  it("exactly 6 not_connected and 6 built (post-V1AJ topology flip)", () => {
    const entries = Object.values(MODE_STATUS);
    expect(entries.filter((s) => s.state === "not_connected").length).toBe(6);
    expect(entries.filter((s) => s.state === "built").length).toBe(6);
  });
});
