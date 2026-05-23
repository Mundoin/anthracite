import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestClock } from "../environmentLifecycle";
import { MemoryStorageAdapter } from "../environmentPersistenceAdapter";
import { EnvironmentLifecycleProvider, useEnvironmentLifecycle } from "../EnvironmentLifecycleContext";

/**
 * Test consumer component that renders lifecycle context data for assertions.
 */
function TestConsumer(): JSX.Element {
  const ctx = useEnvironmentLifecycle();
  return (
    <div>
      <div data-testid="active-id">{ctx.active?.environment_id ?? "none"}</div>
      <div data-testid="active-name">{ctx.active?.name ?? "none"}</div>
      <div data-testid="visible-count">{ctx.visible_environments.length}</div>
      <div data-testid="save-status">{ctx.save_status.status}</div>
      <div data-testid="save-error">{ctx.save_status.error ?? "null"}</div>
      <div data-testid="load-status">{ctx.load_status.status}</div>
      <div data-testid="load-source">{ctx.load_status.source ?? "none"}</div>
      <button
        data-testid="create-btn"
        onClick={() => ctx.createFromScenario("branch-office", "Test Branch")}
      >
        Create
      </button>
      <button
        data-testid="select-btn"
        onClick={() => {
          const other = ctx.visible_environments.find((e) => e.environment_id !== ctx.active?.environment_id);
          if (other) ctx.selectActive(other.environment_id);
        }}
      >
        Select Other
      </button>
      <button
        data-testid="rename-btn"
        onClick={() => {
          if (ctx.active) ctx.rename(ctx.active.environment_id, "Renamed");
        }}
      >
        Rename
      </button>
      <button
        data-testid="duplicate-btn"
        onClick={() => {
          if (ctx.active) ctx.duplicate(ctx.active.environment_id);
        }}
      >
        Duplicate
      </button>
      <button
        data-testid="archive-btn"
        onClick={() => {
          if (ctx.active) ctx.archive(ctx.active.environment_id);
        }}
      >
        Archive
      </button>
      <button
        data-testid="restore-btn"
        onClick={() => {
          const archived = ctx.state.environments.find((e) => e.lifecycle_state === "archived");
          if (archived) ctx.restore(archived.environment_id);
        }}
      >
        Restore
      </button>
      <button data-testid="reload-btn" onClick={() => ctx.reloadFromDisk()}>
        Reload
      </button>
      <button data-testid="reset-btn" onClick={() => ctx.resetToDefault()}>
        Reset
      </button>
      <button data-testid="save-btn" onClick={() => ctx.saveNow()}>
        Save
      </button>
    </div>
  );
}

describe("EnvironmentLifecycleContext", () => {
  beforeEach(() => {
    // Clear localStorage before each test to avoid cross-test pollution
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      globalThis.localStorage.clear();
    }
  });

  it("1. useEnvironmentLifecycle throws when used outside provider", () => {
    function BadComponent(): JSX.Element {
      useEnvironmentLifecycle();
      return <div>bad</div>;
    }

    expect(() => {
      render(<BadComponent />);
    }).toThrow("useEnvironmentLifecycle must be used inside <EnvironmentLifecycleProvider>.");
  });

  it("2. Provider mounts and yields state with env-fab-demo active", () => {
    const adapter = new MemoryStorageAdapter();
    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    expect(screen.getByTestId("active-id")).toHaveTextContent("env-fab-demo");
    expect(screen.getByTestId("active-name")).toHaveTextContent("Micro Lab");
  });

  it("3. Provider initializes visible_environments with 1 env", () => {
    const adapter = new MemoryStorageAdapter();
    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    expect(screen.getByTestId("visible-count")).toHaveTextContent("1");
  });

  it("4. Provider createFromScenario grows list to 2", async () => {
    const user = userEvent.setup();
    render(
      <EnvironmentLifecycleProvider>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    expect(screen.getByTestId("visible-count")).toHaveTextContent("1");
    await user.click(screen.getByTestId("create-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("visible-count")).toHaveTextContent("2");
    });
  });

  it("5. Provider selectActive(id) updates active", async () => {
    const user = userEvent.setup();
    render(
      <EnvironmentLifecycleProvider>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    const oldId = screen.getByTestId("active-id").textContent;
    await user.click(screen.getByTestId("create-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("visible-count")).toHaveTextContent("2");
    });

    await user.click(screen.getByTestId("select-btn"));

    await waitFor(() => {
      const newId = screen.getByTestId("active-id").textContent;
      expect(newId).not.toBe(oldId);
    });
  });

  it("6. Provider rename updates env name", async () => {
    const user = userEvent.setup();
    render(
      <EnvironmentLifecycleProvider>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await user.click(screen.getByTestId("rename-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("active-name")).toHaveTextContent("Renamed");
    });
  });

  it("7. Provider duplicate adds new env", async () => {
    const user = userEvent.setup();
    render(
      <EnvironmentLifecycleProvider>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    expect(screen.getByTestId("visible-count")).toHaveTextContent("1");
    await user.click(screen.getByTestId("duplicate-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("visible-count")).toHaveTextContent("2");
    });
  });

  it("8. Provider archive removes from visible list (default)", async () => {
    const user = userEvent.setup();
    const adapter = new MemoryStorageAdapter();
    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await user.click(screen.getByTestId("archive-btn"));

    await waitFor(
      () => {
        expect(screen.getByTestId("visible-count")).toHaveTextContent("0");
      },
      { timeout: 3000 },
    );
  });

  it("9. Provider restore brings archived back", async () => {
    const user = userEvent.setup();
    render(
      <EnvironmentLifecycleProvider>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await user.click(screen.getByTestId("archive-btn"));

    await waitFor(
      () => {
        expect(screen.getByTestId("visible-count")).toHaveTextContent("0");
      },
      { timeout: 3000 },
    );

    await user.click(screen.getByTestId("restore-btn"));

    await waitFor(
      () => {
        expect(screen.getByTestId("visible-count")).toHaveTextContent("1");
      },
      { timeout: 3000 },
    );
  });

  it("10. Save status starts 'never' when no snapshot present", () => {
    const adapter = new MemoryStorageAdapter();
    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    expect(screen.getByTestId("save-status")).toHaveTextContent("never");
  });

  it("11. After mutation, save_status flips to 'saved' (auto-save)", async () => {
    const user = userEvent.setup();
    const adapter = new MemoryStorageAdapter();
    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    expect(screen.getByTestId("save-status")).toHaveTextContent("never");
    await user.click(screen.getByTestId("rename-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
    });
  });

  it("12. After mutation, MemoryStorageAdapter has written JSON snapshot at key", async () => {
    const user = userEvent.setup();
    const adapter = new MemoryStorageAdapter();
    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await user.click(screen.getByTestId("rename-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
    });

    const written = (adapter as any).store.get("anthracite.env-lifecycle.v1");
    expect(written).toBeDefined();
    expect(typeof written).toBe("string");
    const parsed = JSON.parse(written);
    expect(parsed).toHaveProperty("schema_version", "1");
    expect(parsed).toHaveProperty("store");
  });

  it("13. Reloading provider with same adapter restores state from snapshot", async () => {
    const user = userEvent.setup();
    const adapter = new MemoryStorageAdapter();
    const { unmount } = render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await user.click(screen.getByTestId("rename-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
    });

    const renamedName = screen.getByTestId("active-name").textContent;

    unmount();

    // Re-render with same adapter
    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-name")).toHaveTextContent(renamedName);
    });
  });

  it("14. Save status reflects load_status 'ok' when initial snapshot present", async () => {
    const adapter = new MemoryStorageAdapter();

    // First render: create, rename, save
    const { unmount } = render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    screen.getByTestId("rename-btn").click();

    await waitFor(() => {
      expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
    });

    unmount();

    // Second render: should load from snapshot
    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("load-status")).toHaveTextContent("ok");
      expect(screen.getByTestId("load-source")).toHaveTextContent("snapshot");
      expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
    });
  });

  it("15. Multiple consumers of useEnvironmentLifecycle see same active env", async () => {
    function Consumer1(): JSX.Element {
      const ctx = useEnvironmentLifecycle();
      return <div data-testid="consumer1-id">{ctx.active?.environment_id}</div>;
    }

    function Consumer2(): JSX.Element {
      const ctx = useEnvironmentLifecycle();
      return <div data-testid="consumer2-id">{ctx.active?.environment_id}</div>;
    }

    render(
      <EnvironmentLifecycleProvider>
        <div>
          <Consumer1 />
          <Consumer2 />
          <TestConsumer />
        </div>
      </EnvironmentLifecycleProvider>,
    );

    const c1Id = screen.getByTestId("consumer1-id").textContent;
    const c2Id = screen.getByTestId("consumer2-id").textContent;
    const tcId = screen.getByTestId("active-id").textContent;

    expect(c1Id).toBe(c2Id);
    expect(c2Id).toBe(tcId);
  });

  it("16. reloadFromDisk re-reads snapshot into state", async () => {
    const user = userEvent.setup();
    const adapter = new MemoryStorageAdapter();

    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await user.click(screen.getByTestId("rename-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
    });

    const savedName = screen.getByTestId("active-name").textContent;

    // Mutate the state in-memory by resetting
    await user.click(screen.getByTestId("reset-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("active-name")).not.toHaveTextContent(savedName);
    });

    // Now reload from disk
    await user.click(screen.getByTestId("reload-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("active-name")).toHaveTextContent(savedName);
    });
  });

  it("17. resetToDefault returns to createInitialStore equivalent", async () => {
    const user = userEvent.setup();
    const adapter = new MemoryStorageAdapter();

    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    expect(screen.getByTestId("visible-count")).toHaveTextContent("1");
    expect(screen.getByTestId("active-id")).toHaveTextContent("env-fab-demo");

    await user.click(screen.getByTestId("create-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("visible-count")).toHaveTextContent("2");
    });

    await user.click(screen.getByTestId("reset-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("visible-count")).toHaveTextContent("1");
      expect(screen.getByTestId("active-id")).toHaveTextContent("env-fab-demo");
      expect(screen.getByTestId("active-name")).toHaveTextContent("Micro Lab");
    });
  });

  it("18. saveNow triggers save immediately", async () => {
    const user = userEvent.setup();
    const adapter = new MemoryStorageAdapter();

    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter} autoSave={false}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    expect(screen.getByTestId("save-status")).toHaveTextContent("never");

    await user.click(screen.getByTestId("rename-btn"));

    // With autoSave={false}, rename does NOT auto-save
    await waitFor(() => {
      // We need a way to confirm the rename happened; check active name
      expect(screen.getByTestId("active-name")).toHaveTextContent("Renamed");
    });

    // Save status should still be "never"
    expect(screen.getByTestId("save-status")).toHaveTextContent("never");

    // Now manually save
    await user.click(screen.getByTestId("save-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
    });

    const written = (adapter as any).store.get("anthracite.env-lifecycle.v1");
    expect(written).toBeDefined();
  });

  it("19. Auto-save can be disabled via autoSave={false} prop", async () => {
    const user = userEvent.setup();
    const adapter = new MemoryStorageAdapter();

    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter} autoSave={false}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await user.click(screen.getByTestId("rename-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("active-name")).toHaveTextContent("Renamed");
    });

    // Give async auto-save time to fire (it shouldn't)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const written = (adapter as any).store.get("anthracite.env-lifecycle.v1");
    expect(written).toBeUndefined();
  });

  it("20. Clock injection: deterministic last_saved_at after mutation", async () => {
    const user = userEvent.setup();
    const testClock = createTestClock({
      now: "2026-05-23T12:34:56.000Z",
      idSequence: ["env-branch-office-abc123"],
    });

    const adapter = new MemoryStorageAdapter();

    render(
      <EnvironmentLifecycleProvider storageAdapter={adapter} clock={testClock}>
        <TestConsumer />
      </EnvironmentLifecycleProvider>,
    );

    await user.click(screen.getByTestId("rename-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
    });

    const written = (adapter as any).store.get("anthracite.env-lifecycle.v1");
    const parsed = JSON.parse(written);

    expect(parsed.saved_at).toBe("2026-05-23T12:34:56.000Z");
  });
});
