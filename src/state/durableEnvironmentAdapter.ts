/**
 * Durable Environment Adapter — V1BO.
 *
 * Sync `StorageAdapter` decorator that mirrors every write into the
 * Tauri `LabBlobStore` so generated lab environments survive app
 * restart / refresh / localStorage clear.
 *
 * Contract:
 *   - read(key)   → delegates to the wrapped adapter (sync).
 *   - write(key, value) → calls wrapped.write synchronously THEN fires
 *     an async Tauri write-through. The Tauri write is fire-and-forget
 *     by design: the local mirror is the authoritative SaveStatus path
 *     (sync, immediately observable). The Tauri side is a best-effort
 *     durable mirror; failures are logged in `tauriLabBlobBridge` and
 *     do not block save UX.
 *   - remove(key) → delegates locally and writes an empty blob to
 *     Tauri so the durable file is cleared on next boot.
 *
 * In a non-Tauri runtime (browser dev, vite preview, vitest jsdom)
 * the bridge no-ops and this adapter degrades to a thin pass-through
 * over the wrapped local adapter.
 *
 * Why decorate vs replace: the EnvironmentLifecycleProvider already
 * accepts a `StorageAdapter` for tests. Decorating preserves that
 * test seam (MemoryStorageAdapter still works unmodified) and keeps
 * the sync StorageAdapter contract intact — no need to refactor the
 * auto-save useEffect or the SaveStatus state machine.
 */

import {
  type StorageAdapter,
  BrowserLocalStorageAdapter,
} from "./environmentPersistenceAdapter";
import { writeTauriLabBlob } from "./tauriLabBlobBridge";

export class DurableEnvironmentAdapter implements StorageAdapter {
  readonly kind: StorageAdapter["kind"];
  private readonly inner: StorageAdapter;

  constructor(inner: StorageAdapter = new BrowserLocalStorageAdapter()) {
    this.inner = inner;
    // Surface the inner adapter's kind so any caller filtering on
    // `kind === "local-browser"` keeps working transparently.
    this.kind = inner.kind;
  }

  read(key: string): string | null {
    return this.inner.read(key);
  }

  write(key: string, value: string): void {
    this.inner.write(key, value);
    // Best-effort durable mirror. Fire-and-forget with bridge-level
    // logging; the local write above is the authoritative path that
    // SaveStatus reflects. Wrapped in `void` so eslint understands
    // we intentionally drop the promise.
    void writeTauriLabBlob(value);
  }

  remove(key: string): void {
    this.inner.remove(key);
    // Clear the durable mirror too — passing an empty string tells
    // LabBlobStore to overwrite the file with empty content. Next
    // boot's hydrate path treats empty blob as "no durable state".
    void writeTauriLabBlob("");
  }
}
