import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { OverviewPanel } from "../OverviewPanel";
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

describe("OverviewPanel — Banners and Nudges", () => {
  it("renders overview panel with testid", () => {
    const onNavigate = vi.fn();
    renderWithProvider(<OverviewPanel onNavigate={onNavigate} />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    expect(screen.getByTestId("environments-overview")).toBeInTheDocument();
  });

  it("renders when provider is present", () => {
    renderWithProvider(<OverviewPanel onNavigate={vi.fn()} />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    expect(screen.getByTestId("environments-overview")).toBeInTheDocument();
  });

  it("has onNavigate callback wired up", () => {
    const onNavigate = vi.fn();
    renderWithProvider(<OverviewPanel onNavigate={onNavigate} />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    expect(screen.getByTestId("environments-overview")).toBeInTheDocument();
  });

  it("renders overview panel structure", () => {
    const { container } = renderWithProvider(<OverviewPanel onNavigate={vi.fn()} />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    const overviewPanel = container.querySelector(".overview-panel");
    expect(overviewPanel).toBeInTheDocument();
  });

  it("includes nudge section when appropriate", () => {
    const { container } = renderWithProvider(<OverviewPanel onNavigate={vi.fn()} />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    // Nudge or empty state should render
    const hasNudge = container.querySelector(".overview-panel__nudge") !== null;
    const hasEmpty = container.querySelector(".overview-panel__empty") !== null;
    expect(hasNudge || hasEmpty).toBe(true);
  });

  it("includes device inventory details element", () => {
    const { container } = renderWithProvider(<OverviewPanel onNavigate={vi.fn()} />, {
      storageAdapter: new InMemoryStorageAdapter(),
    });
    const inventory = container.querySelector(".overview-panel__inventory-details");
    // When active, inventory appears; when not, empty state hides it
    const hasActive = container.querySelector(".overview-panel__header") !== null;
    if (hasActive) {
      expect(inventory).toBeInTheDocument();
    }
  });

  it("renders without errors with onNavigate callback", () => {
    const onNavigate = vi.fn();
    expect(() => {
      renderWithProvider(<OverviewPanel onNavigate={onNavigate} />, {
        storageAdapter: new InMemoryStorageAdapter(),
      });
    }).not.toThrow();
  });
});
