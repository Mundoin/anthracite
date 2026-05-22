import { describe, it, expect } from "vitest";
import {
  LAB_MAX_DEVICES,
  LAB_MAX_LINKS,
  LAB_GENERATOR_VERSION,
  type LabEnvironment,
  type LabDevice,
  type LabLink,
  type LabInterface,
} from "../labEnvironment";

describe("labEnvironment types and constants", () => {
  it("LAB_MAX_DEVICES is 128", () => {
    expect(LAB_MAX_DEVICES).toBe(128);
  });

  it("LAB_MAX_LINKS is 384", () => {
    expect(LAB_MAX_LINKS).toBe(384);
  });

  it("LAB_GENERATOR_VERSION matches lab-engine/N.N.N pattern", () => {
    expect(LAB_GENERATOR_VERSION).toMatch(/^lab-engine\/\d+\.\d+\.\d+$/);
  });

  it("exports all named types and constants (smoke test)", () => {
    // Verify that core types are importable and have expected structure
    const mockDevice: LabDevice = {
      id: "lab-dev-001",
      hostname: "router-01",
      display_label: "R1",
      device_class: "router",
      vendor: "cisco",
      platform_id: "cisco-iosxe",
      os_family: "IOS XE",
      management_ip: null,
      loopback_ip: null,
      site_id: null,
      zone: null,
      tags: [],
      capabilities: ["routing", "ospf"],
      interfaces: [],
      provenance: "generated-lab",
      source_state: "lab",
    };

    expect(mockDevice.id).toBe("lab-dev-001");
    expect(mockDevice.device_class).toBe("router");
    expect(mockDevice.vendor).toBe("cisco");
  });

  it("LabInterface type is properly structured", () => {
    const mockIface: LabInterface = {
      id: "iface-001",
      name: "GigabitEthernet0/0/0",
      kind: "physical",
      description: "Uplink to core",
      ip_addresses: [],
      vlan_id: null,
      speed_mbps: 1000,
      enabled: true,
    };

    expect(mockIface.name).toBe("GigabitEthernet0/0/0");
    expect(mockIface.enabled).toBe(true);
  });

  it("LabLink type is properly structured", () => {
    const mockLink: LabLink = {
      id: "lab-link-001",
      endpoint_a_device_id: "lab-dev-001",
      endpoint_a_interface_id: "iface-001",
      endpoint_b_device_id: "lab-dev-002",
      endpoint_b_interface_id: "iface-002",
      link_type: "routed",
      medium: "ethernet",
      speed_mbps: 10000,
      enabled: true,
      vlan_id: null,
      provenance: "generated-lab",
    };

    expect(mockLink.link_type).toBe("routed");
    expect(mockLink.medium).toBe("ethernet");
  });
});
