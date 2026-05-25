import type { LabEnvironment, LabDevice } from "../types/labEnvironment";
import type {
  FabricatorEnvironment,
  FabricatedDevice,
  FabricatedLink,
} from "../types/fabricator";

function deriveRoleHint(d: LabDevice): string {
  const h = d.hostname.toLowerCase();

  // Match strongest signal first
  if (d.device_class === "firewall") return "firewall";
  if (d.device_class === "access_point") return "wireless ap";
  if (d.device_class === "server" || d.device_class === "endpoint") return "server";
  if (d.device_class === "camera") return "endpoint";
  if (d.device_class === "isp_edge") return "isp edge router";
  if (d.device_class === "home_gateway") return "edge router cpe";

  if (d.device_class === "router") {
    if (h.includes("-core-") || h.includes("-spine-")) return "core router";
    if (h.includes("-pe-") || h.includes("-edge-")) return "edge router";
    if (h.includes("-cpe-")) return "edge router cpe";
    return "router";
  }

  if (d.device_class === "switch") {
    if (h.includes("-spine-")) return "core switch";
    if (h.includes("-leaf-") || h.includes("-acc-")) return "access switch";
    if (h.includes("-dist-") || h.includes("-agg-")) return "distribution switch";
    return "switch";
  }

  return "device";
}

export function toFabricatorView(labEnv: LabEnvironment): FabricatorEnvironment {
  const devices: FabricatedDevice[] = labEnv.devices.map((d) => ({
    id: d.id,
    name: d.hostname,
    vendor: d.vendor,
    platform: d.platform_id,
    role_hint: deriveRoleHint(d),
    operational_state: d.operational_state ?? "healthy",
    source: "fabricated" as const,
  }));

  const links: FabricatedLink[] = labEnv.links.map((l) => ({
    id: l.id,
    source_device_id: l.endpoint_a_device_id,
    target_device_id: l.endpoint_b_device_id,
    kind: "manual" as const,
    source: "fabricated" as const,
  }));

  return {
    environment_id: labEnv.environment_id,
    name: labEnv.name,
    devices,
    links,
    provenance: "fabricated" as const,
    schema_version: "1" as const,
  };
}
