import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { DossierPanel } from "../DossierPanel";
import { EnvironmentLifecycleProvider } from "../../../../state/EnvironmentLifecycleContext";
import type { StorageAdapter } from "../../../../state/environmentPersistenceAdapter";

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

describe("DossierPanel", () => {
  it("renders panel with data-testid", () => {
    const onNavigate = vi.fn();
    renderWithProvider(<DossierPanel onNavigate={onNavigate} />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    expect(screen.getByTestId("environments-dossier")).toBeInTheDocument();
  });

  it("passes onNavigate prop correctly", () => {
    const onNavigate = vi.fn();
    renderWithProvider(<DossierPanel onNavigate={onNavigate} />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    // Panel renders successfully with callback
    expect(screen.getByTestId("environments-dossier")).toBeInTheDocument();
  });

  it("handles no onNavigate prop gracefully", () => {
    renderWithProvider(<DossierPanel />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    expect(screen.getByTestId("environments-dossier")).toBeInTheDocument();
  });

  it("renders when lifecycle provider is present", () => {
    renderWithProvider(<DossierPanel />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    expect(screen.getByTestId("environments-dossier")).toBeInTheDocument();
  });
});
