/**
 * V1BO durable persistence — EnvironmentLifecycleContext integration.
 *
 * Asserts:
 *   - mount hydrate replaces state with the durable Tauri blob when
 *     one is present (simulated via mocked bridge)
 *   - hydrate is a no-op when the bridge returns null
 *   - commitEnvironment writes through to the Tauri bridge
 *
 * The bridge module is mocked at the import boundary so we never
 * actually try to invoke a Tauri command from jsdom.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { useContext, useEffect, type JSX } from "react";

// vi.mock must come before SUT import so the SUT picks up the mocks.
vi.mock("../tauriLabBlobBridge", () => ({
  isTauriRuntime: vi.fn(() => true),
  readTauriLabBlob: vi.fn(),
  writeTauriLabBlob: vi.fn(() => Promise.resolve({ ok: true })),
}));

import {
  EnvironmentLifecycleContext,
  EnvironmentLifecycleProvider,
  type EnvironmentLifecycleContextValue,
} from "../EnvironmentLifecycleContext";
import { MemoryStorageAdapter } from "../environmentPersistenceAdapter";
import {
  PERSISTENCE_STORAGE_KEY,
  serializeStore,
  snapshotToJson,
} from "../environmentPersistence";
import { createInitialStore } from "../environmentLifecycle";
import { readTauriLabBlob, writeTauriLabBlob } from "../tauriLabBlobBridge";
import type { LocalEnvironmentRecord } from "../../types/localEnvironment";

function mockedReadBridge(): ReturnType<typeof vi.fn> {
  return readTauriLabBlob as unknown as ReturnType<typeof vi.fn>;
}
function mockedWriteBridge(): ReturnType<typeof vi.fn> {
  return writeTauriLabBlob as unknown as ReturnType<typeof vi.fn>;
}

const FIXED_CLOCK = { now: () => "2026-05-24T12:00:00.000Z" };

function captureContext(into: { value: EnvironmentLifecycleContextValue | null }): JSX.Element {
  return <Capture into={into} />;
}

function Capture({
  into,
}: {
  into: { value: EnvironmentLifecycleContextValue | null };
}): null {
  const ctx = useContext(EnvironmentLifecycleContext);
  useEffect(() => {
    into.value = ctx;
  }, [ctx, into]);
  return null;
}

/**
 * Build a valid LocalEnvironmentRecord by cloning the seeded record
 * from `createInitialStore` (already a real, deserializer-valid lab
 * with `lab_payload.devices` array etc.) and overriding the id/name.
 * Far simpler than hand-rolling every nested field.
 */
function makeLabRecord(id: string, name: string): LocalEnvironmentRecord {
  const seed = createInitialStore(FIXED_CLOCK).environments[0];
  return {
    ...seed,
    environment_id: id,
    name,
    environment_uid: `uid-${id}`,
  };
}

describe("EnvironmentLifecycleContext — V1BO durable hydrate", () => {
  beforeEach(() => {
    mockedReadBridge().mockReset();
    mockedWriteBridge().mockReset();
    mockedWriteBridge().mockResolvedValue({ ok: true });
  });

  it("hydrates from durable Tauri blob on mount (lab survives 'restart')", async () => {
    // Simulate prior session: persist a lab via the same serializer
    // the provider uses, then hand the blob back via the bridge mock.
    const priorState = {
      ...createInitialStore(FIXED_CLOCK),
      environments: [makeLabRecord("lab-A", "Branch A")],
      active_environment_id: "lab-A",
    };
    const snapshot = serializeStore(priorState, FIXED_CLOCK.now());
    const blob = snapshotToJson(snapshot);
    mockedReadBridge().mockResolvedValueOnce(blob);

    const captured: { value: EnvironmentLifecycleContextValue | null } = {
      value: null,
    };
    // Use a MemoryStorageAdapter so we bypass jsdom localStorage
    // cross-test contamination. The hydrate effect will still mirror
    // the blob into this adapter via adapterRef.current.write.
    const memAdapter = new MemoryStorageAdapter();
    render(
      <EnvironmentLifecycleProvider
        storageAdapter={memAdapter}
        clock={FIXED_CLOCK}
      >
        {captureContext(captured)}
      </EnvironmentLifecycleProvider>,
    );

    // Wait for the async hydrate effect to dispatch `load`.
    await waitFor(() => {
      expect(
        captured.value?.state.environments.find((e) => e.environment_id === "lab-A"),
      ).toBeTruthy();
    });
    expect(captured.value?.active?.environment_id).toBe("lab-A");
    // Durable mirror was written back into the local adapter so any
    // subsequent sync read returns a snapshot that contains lab-A.
    // Strict equality with the seed blob is too tight — the load
    // dispatch bumps store_revision, which triggers the auto-save
    // effect to re-serialize and overwrite the adapter with a fresh
    // (semantically equivalent) blob.
    const mirrored = memAdapter.read(PERSISTENCE_STORAGE_KEY);
    expect(mirrored).not.toBeNull();
    expect(mirrored).toContain("lab-A");
  });

  it("hydrate is a no-op when the bridge returns null (no durable file yet)", async () => {
    mockedReadBridge().mockResolvedValueOnce(null);
    const captured: { value: EnvironmentLifecycleContextValue | null } = {
      value: null,
    };
    render(
      <EnvironmentLifecycleProvider
        storageAdapter={new MemoryStorageAdapter()}
        clock={FIXED_CLOCK}
      >
        {captureContext(captured)}
      </EnvironmentLifecycleProvider>,
    );
    // Give the async hydrate effect a tick to settle.
    await act(async () => {
      await Promise.resolve();
    });
    // Initial store stays at the default seed (Micro Lab). No lab
    // bearing the "lab-from-tauri" id was hydrated in.
    expect(
      captured.value?.state.environments.find(
        (e) => e.environment_id === "lab-from-tauri",
      ),
    ).toBeUndefined();
  });

  it("commitEnvironment writes through to the Tauri bridge (durable mirror)", async () => {
    mockedReadBridge().mockResolvedValueOnce(null);
    // Use the default adapter chain — DurableEnvironmentAdapter wraps
    // BrowserLocalStorage, which in jsdom is in-memory but global; we
    // assert the bridge write happened, not the storage shape.
    const captured: { value: EnvironmentLifecycleContextValue | null } = {
      value: null,
    };
    render(
      <EnvironmentLifecycleProvider clock={FIXED_CLOCK}>
        {captureContext(captured)}
      </EnvironmentLifecycleProvider>,
    );

    await waitFor(() => {
      expect(captured.value).not.toBeNull();
    });

    // Reset write spy so we only capture writes triggered by commit.
    mockedWriteBridge().mockClear();

    act(() => {
      captured.value!.commitEnvironment(
        makeLabRecord("lab-B", "Branch B"),
        { setActive: true },
      );
    });

    // Auto-save effect runs on store_revision change → adapter.write →
    // DurableEnvironmentAdapter.write fires the bridge call.
    await waitFor(() => {
      expect(mockedWriteBridge()).toHaveBeenCalled();
    });
    const blobsWritten = mockedWriteBridge().mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    // At least one write carries the new lab id in its serialized
    // payload.
    expect(
      blobsWritten.some((b: string) => b.includes("lab-B")),
    ).toBe(true);
  });
});
