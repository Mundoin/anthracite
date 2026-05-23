import { describe, it, expect } from "vitest";
import {
  getConfigsByVendor,
  getConfigCountForDevice,
  countConfigLines,
  getConfigKindDistribution,
} from "../configHelpers";
import type { LocalEnvironmentRecord } from "../../../types/localEnvironment";
import type { LabEnvironment } from "../../../types/labEnvironment";

// Helper to create a minimal valid test environment
function createTestEnvironment(overrides?: Partial<LabEnvironment>): LabEnvironment {
  return {
    environment_id: "test-env-1",
    name: "Test Lab",
    scenario_id: "scenario-1",
    scenario_name: "Test Scenario",
    scenario_seed: "seed-123",
    source_kind: "network-lab",
    provenance: "generated-lab",
    source_state: "lab",
    generator_version: "lab-engine/0.1.0",
    schema_version: "1",
    devices: [],
    links: [],
    address_plan: {
      management_subnet: "10.10.0.0/24",
      loopback_subnet: "10.255.0.0/24",
      transit_subnet: "10.20.0.0/16",
      vlan_subnets: [],
      site_subnets: [],
      allocated: [],
    },
    configs: [],
    capability_flags: {
      topology: true,
      inventory: true,
      interfaces: true,
      addressing: true,
      configs: true,
      routing: true,
      services: true,
      security: true,
    },
    device_count: 0,
    link_count: 0,
    config_count: 0,
    ...overrides,
  };
}

function createTestRecord(overrides?: Partial<LocalEnvironmentRecord>): LocalEnvironmentRecord {
  return {
    environment_id: "env-123",
    name: "Test Environment",
    kind: "generated-lab",
    scenario_id: "scenario-1",
    scenario_name: "Test Scenario",
    scenario_seed: "seed-abc",
    provenance: "generated-lab",
    status: "idle",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    source_summary: "Generated from test scenario",
    device_count: 2,
    link_count: 1,
    config_count: 2,
    lab_payload: createTestEnvironment(),
    capability_flags: {
      topology: true,
      inventory: true,
      interfaces: true,
      addressing: true,
      configs: true,
      routing: true,
      services: true,
      security: true,
    },
    generator_version: "lab-engine/0.1.0",
    lifecycle_state: "active",
    revision: 1,
    origin: "local",
    source_id: null,
    sync_state: "clean",
    local_only: false,
    environment_uid: "uid-123",
    base_revision: 1,
    last_saved_at: "2024-01-02T00:00:00Z",
    last_loaded_at: "2024-01-02T00:00:00Z",
    updated_by: "test-user",
    ...overrides,
  };
}

describe("configHelpers", () => {
  describe("getConfigsByVendor", () => {
    it("groups configs by vendor and returns sorted array", () => {
      const record = createTestRecord({
        lab_payload: createTestEnvironment({
          devices: [
            {
              id: "dev-1",
              hostname: "router-1",
              display_label: "Router 1",
              device_class: "router",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              os_family: "IOS XE",
              management_ip: null,
              loopback_ip: null,
              site_id: null,
              zone: null,
              tags: [],
              capabilities: [],
              interfaces: [],
              provenance: "generated-lab",
              source_state: "lab",
            },
            {
              id: "dev-2",
              hostname: "switch-1",
              display_label: "Switch 1",
              device_class: "switch",
              vendor: "arista",
              platform_id: "arista-eos",
              os_family: "EOS",
              management_ip: null,
              loopback_ip: null,
              site_id: null,
              zone: null,
              tags: [],
              capabilities: [],
              interfaces: [],
              provenance: "generated-lab",
              source_state: "lab",
            },
            {
              id: "dev-3",
              hostname: "router-2",
              display_label: "Router 2",
              device_class: "router",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              os_family: "IOS XE",
              management_ip: null,
              loopback_ip: null,
              site_id: null,
              zone: null,
              tags: [],
              capabilities: [],
              interfaces: [],
              provenance: "generated-lab",
              source_state: "lab",
            },
          ],
          configs: [
            {
              device_id: "dev-1",
              config_kind: "cli_config",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: "hostname router-1\n",
              structured_profile: null,
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
            {
              device_id: "dev-2",
              config_kind: "cli_config",
              vendor: "arista",
              platform_id: "arista-eos",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: "hostname switch-1\n",
              structured_profile: null,
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
            {
              device_id: "dev-3",
              config_kind: "cli_config",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: "hostname router-2\n",
              structured_profile: null,
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
          ],
        }),
      });

      const result = getConfigsByVendor(record);

      expect(result).toHaveLength(2);
      expect(result[0].vendor).toBe("arista");
      expect(result[0].entries).toHaveLength(1);
      expect(result[1].vendor).toBe("cisco");
      expect(result[1].entries).toHaveLength(2);
    });

    it("returns empty array when no configs exist", () => {
      const record = createTestRecord({
        lab_payload: createTestEnvironment({
          devices: [
            {
              id: "dev-1",
              hostname: "router-1",
              display_label: "Router 1",
              device_class: "router",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              os_family: "IOS XE",
              management_ip: null,
              loopback_ip: null,
              site_id: null,
              zone: null,
              tags: [],
              capabilities: [],
              interfaces: [],
              provenance: "generated-lab",
              source_state: "lab",
            },
          ],
          configs: [],
        }),
      });

      const result = getConfigsByVendor(record);

      expect(result).toHaveLength(0);
    });

    it("skips devices with no matching config", () => {
      const record = createTestRecord({
        lab_payload: createTestEnvironment({
          devices: [
            {
              id: "dev-1",
              hostname: "router-1",
              display_label: "Router 1",
              device_class: "router",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              os_family: "IOS XE",
              management_ip: null,
              loopback_ip: null,
              site_id: null,
              zone: null,
              tags: [],
              capabilities: [],
              interfaces: [],
              provenance: "generated-lab",
              source_state: "lab",
            },
            {
              id: "dev-2",
              hostname: "device-2",
              display_label: "Device 2",
              device_class: "endpoint",
              vendor: "generic",
              platform_id: "generic-os",
              os_family: "Generic",
              management_ip: null,
              loopback_ip: null,
              site_id: null,
              zone: null,
              tags: [],
              capabilities: [],
              interfaces: [],
              provenance: "generated-lab",
              source_state: "lab",
            },
          ],
          configs: [
            {
              device_id: "dev-1",
              config_kind: "cli_config",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: "hostname router-1\n",
              structured_profile: null,
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
          ],
        }),
      });

      const result = getConfigsByVendor(record);

      expect(result).toHaveLength(1);
      expect(result[0].entries).toHaveLength(1);
    });
  });

  describe("getConfigCountForDevice", () => {
    it("counts configurations for a specific device", () => {
      const record = createTestRecord({
        lab_payload: createTestEnvironment({
          configs: [
            {
              device_id: "dev-1",
              config_kind: "cli_config",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: "config1",
              structured_profile: null,
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
            {
              device_id: "dev-1",
              config_kind: "structured_profile",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: null,
              structured_profile: { key: "value" },
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
            {
              device_id: "dev-2",
              config_kind: "cli_config",
              vendor: "arista",
              platform_id: "arista-eos",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: "config2",
              structured_profile: null,
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
          ],
        }),
      });

      expect(getConfigCountForDevice(record, "dev-1")).toBe(2);
      expect(getConfigCountForDevice(record, "dev-2")).toBe(1);
      expect(getConfigCountForDevice(record, "dev-3")).toBe(0);
    });
  });

  describe("countConfigLines", () => {
    it("returns 0 for null", () => {
      expect(countConfigLines(null)).toBe(0);
    });

    it("returns 0 for undefined", () => {
      expect(countConfigLines(undefined)).toBe(0);
    });

    it("returns 0 for empty string", () => {
      expect(countConfigLines("")).toBe(0);
    });

    it("returns 0 for whitespace-only string", () => {
      expect(countConfigLines("   \n  \n  ")).toBe(0);
    });

    it("returns 1 for single line without newline", () => {
      expect(countConfigLines("hostname router-1")).toBe(1);
    });

    it("returns correct count for multiline text", () => {
      const config = "line1\nline2\nline3\n";
      expect(countConfigLines(config)).toBe(4);
    });

    it("counts lines split by newline correctly", () => {
      const config = "interface eth0\n  ip address 10.0.0.1\ninterface eth1\n";
      expect(countConfigLines(config)).toBe(4);
    });
  });

  describe("getConfigKindDistribution", () => {
    it("returns distribution of config kinds", () => {
      const record = createTestRecord({
        lab_payload: createTestEnvironment({
          configs: [
            {
              device_id: "dev-1",
              config_kind: "cli_config",
              vendor: "cisco",
              platform_id: "cisco-iosxe",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: "config1",
              structured_profile: null,
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
            {
              device_id: "dev-2",
              config_kind: "cli_config",
              vendor: "arista",
              platform_id: "arista-eos",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: "config2",
              structured_profile: null,
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
            {
              device_id: "dev-3",
              config_kind: "structured_profile",
              vendor: "juniper",
              platform_id: "juniper-junos",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: null,
              structured_profile: { key: "value" },
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
            {
              device_id: "dev-4",
              config_kind: "appliance_manifest",
              vendor: "fortinet",
              platform_id: "fortinet-fortios",
              generated_at: "2024-01-01T00:00:00Z",
              config_text: null,
              structured_profile: { manifest: "data" },
              parser_hint: null,
              provenance: "generated-lab",
              limitations: [],
            },
          ],
        }),
      });

      const result = getConfigKindDistribution(record);

      expect(result.cli_config).toBe(2);
      expect(result.structured_profile).toBe(1);
      expect(result.appliance_manifest).toBe(1);
    });

    it("returns empty object when no configs exist", () => {
      const record = createTestRecord({
        lab_payload: createTestEnvironment({
          configs: [],
        }),
      });

      const result = getConfigKindDistribution(record);

      expect(result).toEqual({});
    });
  });
});
