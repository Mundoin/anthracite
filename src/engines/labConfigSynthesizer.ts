import type {
  LabDevice,
  LabConfigArtifact,
  LabPlatformId,
} from "../types/labEnvironment";

interface PlatformConfigGenerator {
  readonly kind: "cli_config" | "structured_profile" | "appliance_manifest";
  readonly generate: (device: LabDevice, seed: string) => string | Record<string, unknown>;
}

const PLATFORM_GENERATORS: Record<LabPlatformId, PlatformConfigGenerator> = {
  "cisco-iosxe": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `hostname ${device.hostname}\n` +
      `interface GigabitEthernet0/0/0\n` +
      ` ip address ${device.management_ip?.address} 255.255.255.0\n` +
      ` no shutdown\n` +
      `router ospf 1\n` +
      ` network 0.0.0.0 255.255.255.255 area 0\n`,
  },
  "cisco-ios": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `hostname ${device.hostname}\n` +
      `interface FastEthernet0/0\n` +
      ` ip address ${device.management_ip?.address} 255.255.255.0\n` +
      ` no shutdown\n` +
      `router ospf 1\n` +
      ` network 0.0.0.0 255.255.255.255 area 0\n`,
  },
  "cisco-iosxr": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `hostname ${device.hostname}\n` +
      `interface GigabitEthernet0/0/0/0\n` +
      ` ipv4 address ${device.management_ip?.address} 255.255.255.0\n` +
      ` no shutdown\n` +
      `router ospf 1\n` +
      ` address-family ipv4\n` +
      `!\n` +
      `commit\n`,
  },
  "juniper-junos": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `set system host-name ${device.hostname}\n` +
      `set interfaces ge-0/0/0 unit 0 family inet address ${device.management_ip?.address}/24\n` +
      `set routing-options router-id ${device.loopback_ip?.address}\n` +
      `set routing-options autonomous-system 65000\n`,
  },
  "arista-eos": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `hostname ${device.hostname}\n` +
      `interface Ethernet1\n` +
      ` ip address ${device.management_ip?.address} 255.255.255.0\n` +
      ` no shutdown\n` +
      `ip routing\n`,
  },
  "mikrotik-routeros": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `/system identity set name=${device.hostname}\n` +
      `/ip address add address=${device.management_ip?.address}/24 interface=ether1\n` +
      `/routing ospf instance set default router-id=${device.loopback_ip?.address}\n`,
  },
  "fortinet-fortios": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `config system global\n` +
      `  set hostname "${device.hostname}"\n` +
      `end\n` +
      `config system interface\n` +
      `  edit "port1"\n` +
      `    set ip ${device.management_ip?.address} 255.255.255.0\n` +
      `  next\n` +
      `end\n`,
  },
  "paloalto-panos": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `set deviceconfig system hostname ${device.hostname}\n` +
      `set network interface ethernet ethernet1/1 layer3 ip ${device.management_ip?.address}/24\n` +
      `set network profiles monitor-profile default ping host 8.8.8.8\n`,
  },
  "huawei-vrp": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `sysName ${device.hostname}\n` +
      `interface GigabitEthernet0/0/0\n` +
      ` ip address ${device.management_ip?.address} 255.255.255.0\n` +
      ` shutdown\n` +
      `ospf 1\n` +
      ` area 0.0.0.0\n`,
  },
  "nokia-sros": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `configure system name "${device.hostname}"\n` +
      `configure router interface "system" ipv4 primary address ${device.loopback_ip?.address} prefix-length 32\n` +
      `configure router ospf admin-state enable\n`,
  },
  "aruba-aoscx": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `hostname ${device.hostname}\n` +
      `interface 1/1/1\n` +
      ` ip address ${device.management_ip?.address}/24\n` +
      ` no shutdown\n`,
  },
  "extreme-exos": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `configure snmp sysname "${device.hostname}"\n` +
      `configure ipaddress ${device.management_ip?.address} 255.255.255.0 vlan mgmt\n` +
      `enable ospf\n`,
  },
  "ubiquiti-edgeos": {
    kind: "cli_config",
    generate: (device: LabDevice) =>
      `set system host-name ${device.hostname}\n` +
      `set interfaces ethernet eth0 address ${device.management_ip?.address}/24\n` +
      `set protocols ospf area 0.0.0.0 network ${device.loopback_ip?.address}/32\n`,
  },
  "avm-fritzos": {
    kind: "appliance_manifest",
    generate: (device: LabDevice) => ({
      hostname: device.hostname,
      lan_ip: device.management_ip?.address,
      wifi_ssid: "Lab-AP",
      services: ["dhcp", "nat", "wifi"],
    }),
  },
  "axis-os": {
    kind: "appliance_manifest",
    generate: (device: LabDevice) => ({
      hostname: device.hostname,
      ip: device.management_ip?.address,
      model: "AXIS-Lab",
      services: ["rtsp", "http"],
    }),
  },
  "isp-generic": {
    kind: "structured_profile",
    generate: (device: LabDevice) => ({
      hostname: device.hostname,
      wan_handoff: "ethernet-1g",
      peer: "isp-pop-a",
    }),
  },
  "generic-os": {
    kind: "structured_profile",
    generate: (device: LabDevice) => ({
      hostname: device.hostname,
      role: device.device_class,
      services: [],
    }),
  },
};

export function synthesizeConfig(
  device: LabDevice,
  scenarioSeed: string
): LabConfigArtifact {
  const generator = PLATFORM_GENERATORS[device.platform_id];

  if (!generator) {
    throw new Error(
      `Unknown platform_id for config synthesis: ${device.platform_id}`
    );
  }

  const generated = generator.generate(device, scenarioSeed);
  const isCliConfig = generator.kind === "cli_config";

  return {
    device_id: device.id,
    config_kind: generator.kind,
    vendor: device.vendor,
    platform_id: device.platform_id,
    generated_at: "lab-deterministic",
    config_text: isCliConfig ? (generated as string) : null,
    structured_profile: isCliConfig ? null : (generated as Record<string, unknown>),
    parser_hint: device.platform_id,
    provenance: device.provenance,
    limitations:
      generator.kind === "cli_config"
        ? []
        : ["Config is synthesized for lab parity; not field-validated."],
  };
}

export function synthesizeConfigsFor(
  devices: readonly LabDevice[],
  scenarioSeed: string
): readonly LabConfigArtifact[] {
  return devices.map((device) => synthesizeConfig(device, scenarioSeed));
}
