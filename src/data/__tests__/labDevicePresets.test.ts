import { describe, it, expect } from "vitest";
import {
  LAB_DEVICE_PRESETS,
  getPreset,
  requirePreset,
  type LabDevicePreset,
} from "../labDevicePresets";

describe("labDevicePresets", () => {
  it("LAB_DEVICE_PRESETS is frozen", () => {
    expect(Object.isFrozen(LAB_DEVICE_PRESETS)).toBe(true);
  });

  it("all device classes except endpoint have at least one preset", () => {
    const deviceClassesWithPresets = new Set(
      LAB_DEVICE_PRESETS.map((p) => p.device_class)
    );
    const requiredClasses = [
      "router",
      "switch",
      "firewall",
      "access_point",
      "camera",
      "server",
      "isp_edge",
      "cpe",
      "home_gateway",
    ] as const;
    for (const dc of requiredClasses) {
      expect(deviceClassesWithPresets.has(dc as any)).toBe(
        true,
        `Device class '${dc}' should have at least one preset`
      );
    }
  });

  it("getPreset returns undefined on unknown combo", () => {
    const result = getPreset("endpoint", "nonexistent-vendor" as any);
    expect(result).toBeUndefined();
  });

  it("requirePreset throws on unknown combo", () => {
    expect(() => {
      requirePreset("endpoint", "nonexistent-vendor" as any);
    }).toThrow(/No preset for endpoint\/nonexistent-vendor/);
  });

  it("all presets have non-empty platform_ids", () => {
    for (const preset of LAB_DEVICE_PRESETS) {
      expect(preset.platform_id).toBeTruthy();
      expect(preset.platform_id).not.toBe("");
    }
  });

  it("all presets have kebab-case hostname_prefixes", () => {
    for (const preset of LAB_DEVICE_PRESETS) {
      // Allow simple alphanumeric with dashes and numbers
      expect(preset.hostname_prefix).toMatch(/^[a-z0-9\-]+$/);
    }
  });

  it("cisco-router preset uses platform cisco-iosxe", () => {
    const preset = getPreset("router", "cisco");
    expect(preset).toBeDefined();
    expect(preset!.platform_id).toBe("cisco-iosxe");
  });

  it("avm home_gateway uses appliance_manifest config_kind", () => {
    const preset = getPreset("home_gateway", "avm");
    expect(preset).toBeDefined();
    expect(preset!.default_config_kind).toBe("appliance_manifest");
  });

  it("axis camera uses appliance_manifest config_kind", () => {
    const preset = getPreset("camera", "axis");
    expect(preset).toBeDefined();
    expect(preset!.default_config_kind).toBe("appliance_manifest");
  });

  it("mikrotik router uses cli_config and ether{n} interface pattern", () => {
    const preset = getPreset("router", "mikrotik");
    expect(preset).toBeDefined();
    expect(preset!.default_config_kind).toBe("cli_config");
    expect(preset!.interface_name_pattern).toBe("ether{n}");
  });

  it("all presets have non-empty default_capabilities or are explicitly allowed to be empty", () => {
    for (const preset of LAB_DEVICE_PRESETS) {
      // Endpoint is allowed to have empty capabilities
      if (preset.device_class === "endpoint") {
        expect(preset.default_capabilities.length).toBe(0);
      } else {
        expect(preset.default_capabilities.length).toBeGreaterThan(0);
      }
    }
  });

  it("all presets have default_interface_count >= 1", () => {
    for (const preset of LAB_DEVICE_PRESETS) {
      expect(preset.default_interface_count).toBeGreaterThanOrEqual(1);
    }
  });

  it("getPreset returns correct preset for known combos", () => {
    const preset = getPreset("switch", "arista");
    expect(preset).toBeDefined();
    expect(preset!.os_family).toBe("EOS");
    expect(preset!.default_interface_count).toBe(32);
  });

  it("requirePreset returns correct preset and does not throw", () => {
    expect(() => {
      const preset = requirePreset("firewall", "fortinet");
      expect(preset.platform_id).toBe("fortinet-fortios");
    }).not.toThrow();
  });
});
