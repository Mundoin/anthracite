import type { LabEnvironment } from "../types/labEnvironment";
import type {
  FabricatorEnvironment,
  FabricatedDevice,
  FabricatedLink,
} from "../types/fabricator";

export function toFabricatorView(labEnv: LabEnvironment): FabricatorEnvironment {
  const devices: FabricatedDevice[] = labEnv.devices.map((d) => ({
    id: d.id,
    name: d.hostname,
    vendor: d.vendor,
    platform: d.platform_id,
    role_hint: "device",
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
