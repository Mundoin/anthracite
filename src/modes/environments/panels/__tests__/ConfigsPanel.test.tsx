import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigsPanel } from "../ConfigsPanel";
import { EnvironmentLifecycleProvider } from "../../../../state/EnvironmentLifecycleContext";
import type { LocalEnvironmentRecord } from "../../../../types/localEnvironment";
import type { LabEnvironment, LabDevice, LabConfigArtifact } from "../../../../types/labEnvironment";

function createTestEnvironment(overrides?: Partial<LabEnvironment>): LabEnvironment {
  return {
    environment_id: "test-env",
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
    environment_id: "env-1",
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
    device_count: 0,
    link_count: 0,
    config_count: 0,
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

function createTestDevice(overrides?: Partial<LabDevice>): LabDevice {
  return {
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
    ...overrides,
  };
}

function createTestConfig(overrides?: Partial<LabConfigArtifact>): LabConfigArtifact {
  return {
    device_id: "dev-1",
    config_kind: "cli_config",
    vendor: "cisco",
    platform_id: "cisco-iosxe",
    generated_at: "2024-01-01T00:00:00Z",
    config_text: "hostname router-1\ninterface eth0\n ip address 10.0.0.1\n",
    structured_profile: null,
    parser_hint: null,
    provenance: "generated-lab",
    limitations: [],
    ...overrides,
  };
}

describe("ConfigsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = (children: React.ReactNode) => {
    return render(
      <EnvironmentLifecycleProvider>
        {children}
      </EnvironmentLifecycleProvider>
    );
  };

  it("renders panel with data-testid and title", () => {
    renderWithContext(<ConfigsPanel />);
    expect(screen.getByTestId("environments-configs")).toBeInTheDocument();
    expect(screen.getByText("Configuration Preview")).toBeInTheDocument();
  });
});
