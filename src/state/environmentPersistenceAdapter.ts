/**
 * Storage Adapter Interface and Implementations.
 *
 * Abstracts storage backend (browser localStorage, file system, in-memory).
 * Adapters are defensive: all errors are caught and logged, never thrown.
 */

export interface StorageAdapter {
  readonly kind: "local-browser" | "local-file" | "memory";
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

/**
 * Browser localStorage adapter.
 * Defensive: catches and warns on quota exceeded, access denied, etc.
 */
export class BrowserLocalStorageAdapter implements StorageAdapter {
  readonly kind = "local-browser" as const;

  read(key: string): string | null {
    try {
      if (typeof globalThis === "undefined" || !globalThis.localStorage) {
        return null;
      }
      return globalThis.localStorage.getItem(key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[BrowserLocalStorageAdapter] read error for key "${key}": ${msg}`);
      return null;
    }
  }

  write(key: string, value: string): void {
    try {
      if (typeof globalThis === "undefined" || !globalThis.localStorage) {
        console.warn(`[BrowserLocalStorageAdapter] localStorage not available`);
        return;
      }
      globalThis.localStorage.setItem(key, value);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[BrowserLocalStorageAdapter] write error for key "${key}": ${msg}`);
    }
  }

  remove(key: string): void {
    try {
      if (typeof globalThis === "undefined" || !globalThis.localStorage) {
        return;
      }
      globalThis.localStorage.removeItem(key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[BrowserLocalStorageAdapter] remove error for key "${key}": ${msg}`);
    }
  }
}

/**
 * In-memory storage adapter for testing and non-persistent scenarios.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  readonly kind = "memory" as const;
  private store = new Map<string, string>();

  read(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  write(key: string, value: string): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}
