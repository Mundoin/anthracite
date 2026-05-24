import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopologyEnvSelector } from "../TopologyEnvSelector";

const ENV_MICRO = {
  environment_id: "env-micro",
  name: "Micro Lab",
  kind: "generated-lab" as const,
  scenario_id: "micro",
  scenario_name: "Micro",
  scenario_seed: "seed-micro",
  provenance: "generated-lab" as const,
  status: "idle" as const,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  source_summary: "",
  device_count: 4,
  link_count: 3,
  config_count: 0,
  lab_payload: {} as never,
  capability_flags: {} as never,
  generator_version: "1",
  lifecycle_state: "active" as const,
  revision: 1,
  origin: "local" as const,
  source_id: null,
  sync_state: "local-only" as const,
  local_only: true,
  environment_uid: "uid-micro",
  base_revision: 1,
  last_saved_at: null,
  last_loaded_at: null,
  updated_by: null,
};

const ENV_BRANCH = {
  ...ENV_MICRO,
  environment_id: "env-branch",
  name: "Branch Lab",
  scenario_id: "branch",
  scenario_name: "Branch",
  scenario_seed: "seed-branch",
  lifecycle_state: "available" as const,
  environment_uid: "uid-branch",
};

const ENV_CAMPUS = {
  ...ENV_MICRO,
  environment_id: "env-campus",
  name: "Campus Lab",
  scenario_id: "campus",
  scenario_name: "Campus",
  scenario_seed: "seed-campus",
  lifecycle_state: "available" as const,
  environment_uid: "uid-campus",
};

const mockSelectActive = vi.fn();

vi.mock("../../../state/EnvironmentLifecycleContext", () => ({
  useEnvironmentLifecycle: vi.fn(),
}));

import { useEnvironmentLifecycle } from "../../../state/EnvironmentLifecycleContext";
const mockedUseEnv = vi.mocked(useEnvironmentLifecycle);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeCtx(
  environments: typeof ENV_MICRO[],
  activeId: string,
): ReturnType<typeof useEnvironmentLifecycle> {
  return {
    state: {} as never,
    save_status: "idle" as never,
    load_status: "idle" as never,
    active: environments.find((e) => e.environment_id === activeId) ?? null,
    visible_environments: environments,
    selectActive: mockSelectActive,
    listAll: () => environments,
    createEnvironment: vi.fn(),
    updateEnvironment: vi.fn(),
    archiveEnvironment: vi.fn(),
    deleteEnvironment: vi.fn(),
    nudge: vi.fn(),
  } as unknown as ReturnType<typeof useEnvironmentLifecycle>;
}

describe("TopologyEnvSelector", () => {
  it("renders selector when multiple environments exist", () => {
    mockedUseEnv.mockReturnValue(makeCtx([ENV_MICRO, ENV_BRANCH], "env-micro"));
    render(<TopologyEnvSelector />);
    expect(screen.getByTestId("tm-env-selector")).toBeInTheDocument();
  });

  it("shows active environment as selected option", () => {
    mockedUseEnv.mockReturnValue(makeCtx([ENV_MICRO, ENV_BRANCH], "env-micro"));
    render(<TopologyEnvSelector />);
    const select = screen.getByTestId("tm-env-selector") as HTMLSelectElement;
    expect(select.value).toBe("env-micro");
  });

  it("lists all visible environments as options", () => {
    mockedUseEnv.mockReturnValue(
      makeCtx([ENV_MICRO, ENV_BRANCH, ENV_CAMPUS], "env-micro"),
    );
    render(<TopologyEnvSelector />);
    expect(screen.getByRole("option", { name: "Micro Lab" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Branch Lab" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Campus Lab" })).toBeInTheDocument();
  });

  it("calls selectActive with chosen environment id on change", () => {
    mockedUseEnv.mockReturnValue(makeCtx([ENV_MICRO, ENV_BRANCH], "env-micro"));
    render(<TopologyEnvSelector />);
    const select = screen.getByTestId("tm-env-selector");
    fireEvent.change(select, { target: { value: "env-branch" } });
    expect(mockSelectActive).toHaveBeenCalledWith("env-branch");
    expect(mockSelectActive).toHaveBeenCalledTimes(1);
  });

  it("does not render when fewer than 2 environments exist", () => {
    mockedUseEnv.mockReturnValue(makeCtx([ENV_MICRO], "env-micro"));
    const { container } = render(<TopologyEnvSelector />);
    expect(container.firstChild).toBeNull();
  });

  it("does not render when context is unavailable", () => {
    mockedUseEnv.mockImplementation(() => {
      throw new Error("no provider");
    });
    const { container } = render(<TopologyEnvSelector />);
    expect(container.firstChild).toBeNull();
  });

  it("does not remove other environments when one is selected", () => {
    const ctx = makeCtx([ENV_MICRO, ENV_BRANCH, ENV_CAMPUS], "env-micro");
    mockedUseEnv.mockReturnValue(ctx);
    render(<TopologyEnvSelector />);
    fireEvent.change(screen.getByTestId("tm-env-selector"), {
      target: { value: "env-branch" },
    });
    // visible_environments unchanged — all 3 still in context
    expect(ctx.visible_environments).toHaveLength(3);
    // selectActive called with new id, not a destructive op
    expect(mockSelectActive).toHaveBeenCalledWith("env-branch");
    expect(mockSelectActive).not.toHaveBeenCalledWith(null);
  });

  it("selecting env calls selectActive, not a no-op when already active", () => {
    mockedUseEnv.mockReturnValue(makeCtx([ENV_MICRO, ENV_BRANCH], "env-micro"));
    render(<TopologyEnvSelector />);
    fireEvent.change(screen.getByTestId("tm-env-selector"), {
      target: { value: "env-micro" },
    });
    expect(mockSelectActive).toHaveBeenCalledWith("env-micro");
  });
});
