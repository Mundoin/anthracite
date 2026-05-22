import { describe, it, expect } from "vitest";
import { synthesizeConfig, synthesizeConfigsFor } from "../labConfigSynthesizer";
import type { LabDevice } from "../../types/labEnvironment";

const createDevice = (
  overrides: Partial<LabDevice> = {}
): LabDevice => ({
  id: "test-dev-001",
  hostname: "test-router-001",
  display_label: "test-router-001",
  device_class: "router",
  vendor: "cisco",
  platform_id: "cisco-iosxe",
  os_family: "IOS XE",
  management_ip: {
    family: "v4",
    address: "10.10.0.1",
    prefix_length: 24,
    secondary: false,
    vrf: null,
  },
  loopback_ip: {
    family: "v4",
    address: "10.255.0.1",
    prefix_length: 32,
    secondary: false,
    vrf: null,
  },
  site_id: null,
  zone: null,
  tags: [],
  capabilities: ["routing"],
  interfaces: [
    {
      id: "test-dev-001-if-001",
      name: "GigabitEthernet0/0/0",
      kind: "physical",
      description: "Management",
      ip_addresses: [
        {
          family: "v4",
          address: "10.10.0.1",
          prefix_length: 24,
          secondary: false,
          vrf: null,
        },
      ],
      vlan_id: null,
      speed_mbps: 1000,
      enabled: true,
    },
  ],
  provenance: "generated-lab",
  source_state: "lab",
  ...overrides,
});

describe("labConfigSynthesizer", () => {
  describe("CLI config platforms", () => {
    it("should generate cisco-iosxe cli_config with hostname", () => {
      const device = createDevice({ platform_id: "cisco-iosxe" });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("hostname test-router-001");
      expect(config.config_text).toContain("interface GigabitEthernet");
      expect(config.config_text).toContain("router ospf");
      expect(config.structured_profile).toBeNull();
    });

    it("should generate cisco-ios cli_config", () => {
      const device = createDevice({ platform_id: "cisco-ios" });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("hostname test-router-001");
      expect(config.config_text).toContain("interface FastEthernet");
    });

    it("should generate cisco-iosxr cli_config with commit", () => {
      const device = createDevice({ platform_id: "cisco-iosxr" });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("hostname test-router-001");
      expect(config.config_text).toContain("commit");
    });

    it("should generate juniper-junos cli_config", () => {
      const device = createDevice({
        vendor: "juniper",
        platform_id: "juniper-junos",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("set system host-name");
      expect(config.config_text).toContain("set interfaces");
      expect(config.config_text).toContain("set routing-options");
    });

    it("should generate arista-eos cli_config", () => {
      const device = createDevice({
        vendor: "arista",
        platform_id: "arista-eos",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("hostname test-router-001");
      expect(config.config_text).toContain("ip routing");
    });

    it("should generate fortinet-fortios cli_config", () => {
      const device = createDevice({
        vendor: "fortinet",
        platform_id: "fortinet-fortios",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("set hostname");
      expect(config.config_text).toContain("test-router-001");
    });

    it("should generate mikrotik-routeros cli_config", () => {
      const device = createDevice({
        vendor: "mikrotik",
        platform_id: "mikrotik-routeros",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("/system identity set");
    });

    it("should generate paloalto-panos cli_config", () => {
      const device = createDevice({
        vendor: "paloalto",
        platform_id: "paloalto-panos",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("set deviceconfig system");
    });

    it("should generate huawei-vrp cli_config", () => {
      const device = createDevice({
        vendor: "huawei",
        platform_id: "huawei-vrp",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("sysName");
    });

    it("should generate nokia-sros cli_config", () => {
      const device = createDevice({
        vendor: "nokia",
        platform_id: "nokia-sros",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("configure system name");
    });

    it("should generate aruba-aoscx cli_config", () => {
      const device = createDevice({
        vendor: "aruba",
        platform_id: "aruba-aoscx",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("hostname test-router-001");
    });

    it("should generate extreme-exos cli_config", () => {
      const device = createDevice({
        vendor: "extreme",
        platform_id: "extreme-exos",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("configure snmp sysname");
    });

    it("should generate ubiquiti-edgeos cli_config", () => {
      const device = createDevice({
        vendor: "ubiquiti",
        platform_id: "ubiquiti-edgeos",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("cli_config");
      expect(config.config_text).toContain("set system host-name");
    });
  });

  describe("appliance manifest platforms", () => {
    it("should generate avm-fritzos appliance_manifest", () => {
      const device = createDevice({
        vendor: "avm",
        platform_id: "avm-fritzos",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("appliance_manifest");
      expect(config.config_text).toBeNull();
      expect(config.structured_profile).toEqual({
        hostname: "test-router-001",
        lan_ip: "10.10.0.1",
        wifi_ssid: "Lab-AP",
        services: ["dhcp", "nat", "wifi"],
      });
      expect(config.limitations.length).toBeGreaterThan(0);
      expect(config.limitations[0]).toContain("Config is synthesized for lab parity");
    });

    it("should generate axis-os appliance_manifest", () => {
      const device = createDevice({
        vendor: "axis",
        platform_id: "axis-os",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("appliance_manifest");
      expect(config.config_text).toBeNull();
      expect(config.structured_profile).toEqual({
        hostname: "test-router-001",
        ip: "10.10.0.1",
        model: "AXIS-Lab",
        services: ["rtsp", "http"],
      });
    });
  });

  describe("structured profile platforms", () => {
    it("should generate isp-generic structured_profile", () => {
      const device = createDevice({
        vendor: "isp",
        platform_id: "isp-generic",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("structured_profile");
      expect(config.config_text).toBeNull();
      expect(config.structured_profile).toEqual({
        hostname: "test-router-001",
        wan_handoff: "ethernet-1g",
        peer: "isp-pop-a",
      });
    });

    it("should generate generic-os structured_profile", () => {
      const device = createDevice({
        vendor: "generic",
        platform_id: "generic-os",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.config_kind).toBe("structured_profile");
      expect(config.config_text).toBeNull();
      expect(config.structured_profile).toEqual({
        hostname: "test-router-001",
        role: "router",
        services: [],
      });
    });
  });

  describe("config metadata", () => {
    it("should set device_id from device", () => {
      const device = createDevice({ id: "my-device-123" });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.device_id).toBe("my-device-123");
    });

    it("should set vendor and platform_id from device", () => {
      const device = createDevice({
        vendor: "cisco",
        platform_id: "cisco-iosxe",
      });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.vendor).toBe("cisco");
      expect(config.platform_id).toBe("cisco-iosxe");
    });

    it("should set generated_at to lab-deterministic", () => {
      const config = synthesizeConfig(createDevice(), "test-seed");

      expect(config.generated_at).toBe("lab-deterministic");
    });

    it("should set parser_hint to platform_id", () => {
      const config = synthesizeConfig(createDevice(), "test-seed");

      expect(config.parser_hint).toBe("cisco-iosxe");
    });

    it("should preserve provenance from device", () => {
      const device = createDevice({ provenance: "generated-lab" });
      const config = synthesizeConfig(device, "test-seed");

      expect(config.provenance).toBe("generated-lab");
    });

    it("should set limitations for structured/appliance configs", () => {
      const cliConfig = synthesizeConfig(
        createDevice({ platform_id: "cisco-iosxe" }),
        "test-seed"
      );
      expect(cliConfig.limitations).toHaveLength(0);

      const structuredConfig = synthesizeConfig(
        createDevice({ platform_id: "avm-fritzos" }),
        "test-seed"
      );
      expect(structuredConfig.limitations.length).toBeGreaterThan(0);
    });
  });

  describe("determinism", () => {
    it("should produce identical configs for same device + seed", () => {
      const device = createDevice();
      const config1 = synthesizeConfig(device, "seed-001");
      const config2 = synthesizeConfig(device, "seed-001");

      expect(config1).toEqual(config2);
    });
  });

  describe("synthesizeConfigsFor", () => {
    it("should synthesize configs for multiple devices", () => {
      const devices: LabDevice[] = [
        createDevice({ id: "dev-001", hostname: "router-001" }),
        createDevice({ id: "dev-002", hostname: "router-002" }),
        createDevice({
          id: "dev-003",
          hostname: "switch-001",
          platform_id: "arista-eos",
        }),
      ];

      const configs = synthesizeConfigsFor(devices, "test-seed");

      expect(configs).toHaveLength(3);
      expect(configs[0]?.device_id).toBe("dev-001");
      expect(configs[1]?.device_id).toBe("dev-002");
      expect(configs[2]?.device_id).toBe("dev-003");
    });

    it("should preserve device order in config array", () => {
      const devices: LabDevice[] = [
        createDevice({ id: "first" }),
        createDevice({ id: "second" }),
        createDevice({ id: "third" }),
      ];

      const configs = synthesizeConfigsFor(devices, "test-seed");

      expect(configs.map((c) => c.device_id)).toEqual([
        "first",
        "second",
        "third",
      ]);
    });
  });

  describe("error handling", () => {
    it("should throw on unknown platform_id", () => {
      const device = createDevice({
        platform_id: "unknown-platform" as any,
      });

      expect(() => synthesizeConfig(device, "test-seed")).toThrow(
        /Unknown platform_id/
      );
    });
  });
});
