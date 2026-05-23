import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnvironmentStorePanel } from "../EnvironmentStorePanel";
import { EnvironmentLifecycleProvider } from "../../../../state/EnvironmentLifecycleContext";
import type { LocalEnvironmentRecord } from "../../../../types/localEnvironment";
import type { LabEnvironment } from "../../../../types/labEnvironment";

// Helper to create minimal test environments
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

describe("EnvironmentStorePanel", () => {
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

  it("renders the panel with data-testid", () => {
    renderWithContext(<EnvironmentStorePanel />);
    expect(screen.getByTestId("environments-store")).toBeInTheDocument();
  });

  it("renders filter pill buttons", () => {
    renderWithContext(<EnvironmentStorePanel />);

    expect(screen.getByTestId("store-filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("store-filter-active")).toBeInTheDocument();
    expect(screen.getByTestId("store-filter-generated-lab")).toBeInTheDocument();
    expect(screen.getByTestId("store-filter-archived")).toBeInTheDocument();
  });

  it("renders title and main elements", () => {
    renderWithContext(<EnvironmentStorePanel />);
    expect(screen.getByText("Environment Store")).toBeInTheDocument();
    expect(screen.getByTestId("environments-store")).toBeInTheDocument();
  });
});
