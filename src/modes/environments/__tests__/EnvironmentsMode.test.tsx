import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JSX } from "react";
import {
  EnvironmentsMode,
  ENVIRONMENTS_DEFAULT_TOOL_ID,
} from "../EnvironmentsMode";
import { EnvironmentLifecycleProvider } from "../../../state/EnvironmentLifecycleContext";
import {
  BrowserLocalStorageAdapter,
  type StorageAdapter,
} from "../../../state/environmentPersistenceAdapter";

// Mock in-memory storage for tests
class InMemoryStorageAdapter implements StorageAdapter {
  private data: Record<string, string> = {};

  read(key: string): string | null {
    return this.data[key] ?? null;
  }

  write(key: string, value: string): void {
    this.data[key] = value;
  }

  getItem(key: string): string | null {
    return this.data[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.data[key] = value;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  clear(): void {
    this.data = {};
  }
}

function renderWithProvider(
  component: JSX.Element,
  options?: { storageAdapter?: StorageAdapter },
): ReturnType<typeof render> {
  return render(
    <EnvironmentLifecycleProvider storageAdapter={options?.storageAdapter}>
      {component}
    </EnvironmentLifecycleProvider>,
  );
}

describe("EnvironmentsMode", () => {
  it("renders Overview panel by default when activeToolId='overview'", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="overview" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByTestId("environments-overview")).toBeInTheDocument();
  });

  it("switches to EnvironmentCreatorPanel when activeToolId='creator'", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="creator" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByTestId("environments-creator")).toBeInTheDocument();
  });

  it("switches to EnvironmentStorePanel when activeToolId='store'", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="store" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByTestId("environments-store")).toBeInTheDocument();
  });

  it("switches to ConfigsPanel when activeToolId='configs'", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="configs" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByTestId("environments-configs")).toBeInTheDocument();
  });

  it("switches to DossierPanel when activeToolId='dossier'", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="dossier" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByTestId("environments-dossier")).toBeInTheDocument();
  });

  it("switches to SyncStatusPanel when activeToolId='sync'", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="sync" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByTestId("environments-sync")).toBeInTheDocument();
  });

  it("calls onToolChange when quick-action button is clicked in Overview", async () => {
    const user = userEvent.setup();
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="overview" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    // Overview should show the active environment details with action buttons
    expect(screen.getByTestId("environments-overview")).toBeInTheDocument();
    const creatorButton = screen.getAllByRole("button", {
      name: /Open Environment Creator/i,
    })[0];
    await user.click(creatorButton);
    expect(onToolChange).toHaveBeenCalledWith("creator");
  });

  it("creator panel renders wizard without legacy 'Lab Generator' or 'Scenario Forge' labels", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="creator" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByTestId("environments-creator")).toBeInTheDocument();
    expect(screen.queryByText("Lab Generator")).not.toBeInTheDocument();
    expect(screen.queryByText("Scenario Forge")).not.toBeInTheDocument();
  });

  it("renders 'Environment Creator' label in overview actions", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="overview" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    const creatorButtons = screen.getAllByRole("button", {
      name: /Open Environment Creator/i,
    });
    expect(creatorButtons.length).toBeGreaterThan(0);
  });

  it("wizard creator panel opens on Choose Type step", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="creator" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    // Wizard starts with environment type selection (Generated Lab / Import / Live Discovery)
    expect(screen.getByTestId("wizard-type-card-generated-lab")).toBeInTheDocument();
  });

  it("renders environment table in store panel", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="store" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    const table = document.querySelector(".anth-table");
    expect(table).toBeInTheDocument();
  });

  it("renders configs preview in configs panel", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="configs" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByText("Configuration Preview")).toBeInTheDocument();
  });

  it("renders sync status in sync panel", () => {
    const onToolChange = vi.fn();
    renderWithProvider(
      <EnvironmentsMode activeToolId="sync" onToolChange={onToolChange} />,
      { storageAdapter: new InMemoryStorageAdapter() },
    );
    expect(screen.getByText("Sync Status")).toBeInTheDocument();
  });

  it("has ENVIRONMENTS_DEFAULT_TOOL_ID as 'overview'", () => {
    expect(ENVIRONMENTS_DEFAULT_TOOL_ID).toBe("overview");
  });
});
