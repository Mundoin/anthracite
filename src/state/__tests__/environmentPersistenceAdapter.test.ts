/**
 * Environment Persistence Adapter Tests.
 *
 * Tests StorageAdapter interface implementations: MemoryStorageAdapter and BrowserLocalStorageAdapter.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryStorageAdapter, BrowserLocalStorageAdapter } from "../environmentPersistenceAdapter";

describe("Environment Persistence Adapter", () => {
  // ===== MemoryStorageAdapter =====

  describe("MemoryStorageAdapter", () => {
    it("kind is 'memory'", () => {
      const adapter = new MemoryStorageAdapter();
      expect(adapter.kind).toBe("memory");
    });

    it("write + read round-trip", () => {
      const adapter = new MemoryStorageAdapter();
      const key = "test-key";
      const value = "test-value";

      adapter.write(key, value);
      const read = adapter.read(key);

      expect(read).toBe(value);
    });

    it("read returns null when key absent", () => {
      const adapter = new MemoryStorageAdapter();
      const read = adapter.read("missing-key");
      expect(read).toBeNull();
    });

    it("remove clears key", () => {
      const adapter = new MemoryStorageAdapter();
      const key = "test-key";

      adapter.write(key, "value");
      adapter.remove(key);
      const read = adapter.read(key);

      expect(read).toBeNull();
    });

    it("independent instances don't share state", () => {
      const adapter1 = new MemoryStorageAdapter();
      const adapter2 = new MemoryStorageAdapter();

      adapter1.write("key", "value1");
      adapter2.write("key", "value2");

      expect(adapter1.read("key")).toBe("value1");
      expect(adapter2.read("key")).toBe("value2");
    });

    it("write overwrites existing value", () => {
      const adapter = new MemoryStorageAdapter();
      const key = "test-key";

      adapter.write(key, "value1");
      adapter.write(key, "value2");

      expect(adapter.read(key)).toBe("value2");
    });

    it("multiple keys coexist independently", () => {
      const adapter = new MemoryStorageAdapter();

      adapter.write("key1", "value1");
      adapter.write("key2", "value2");
      adapter.write("key3", "value3");

      expect(adapter.read("key1")).toBe("value1");
      expect(adapter.read("key2")).toBe("value2");
      expect(adapter.read("key3")).toBe("value3");
    });
  });

  // ===== BrowserLocalStorageAdapter =====

  describe("BrowserLocalStorageAdapter", () => {
    // Save reference to real localStorage and restore after tests
    let realLocalStorage: typeof globalThis.localStorage | undefined;

    beforeEach(() => {
      realLocalStorage = globalThis.localStorage;
      // Vitest jsdom provides localStorage by default
    });

    it("kind is 'local-browser'", () => {
      const adapter = new BrowserLocalStorageAdapter();
      expect(adapter.kind).toBe("local-browser");
    });

    it("write + read round-trip", () => {
      const adapter = new BrowserLocalStorageAdapter();
      const key = "test-key";
      const value = "test-value";

      adapter.write(key, value);
      const read = adapter.read(key);

      expect(read).toBe(value);

      // Clean up
      adapter.remove(key);
    });

    it("read returns null when key absent", () => {
      const adapter = new BrowserLocalStorageAdapter();
      const read = adapter.read("definitely-missing-key");
      expect(read).toBeNull();
    });

    it("remove clears key", () => {
      const adapter = new BrowserLocalStorageAdapter();
      const key = "test-key";

      adapter.write(key, "value");
      adapter.remove(key);
      const read = adapter.read(key);

      expect(read).toBeNull();
    });

    it("handles read errors gracefully (doesn't throw, returns null)", () => {
      const adapter = new BrowserLocalStorageAdapter();

      // Mock localStorage to throw on read
      const originalGetItem = globalThis.localStorage.getItem;
      globalThis.localStorage.getItem = vi.fn(() => {
        throw new Error("Access denied");
      });

      // Should not throw and return null
      expect(() => {
        const result = adapter.read("any-key");
        expect(result).toBeNull();
      }).not.toThrow();

      // Restore
      globalThis.localStorage.getItem = originalGetItem;
    });

    it("handles write errors gracefully (doesn't throw)", () => {
      const adapter = new BrowserLocalStorageAdapter();

      // Mock localStorage to throw on write
      const originalSetItem = globalThis.localStorage.setItem;
      globalThis.localStorage.setItem = vi.fn(() => {
        throw new Error("Quota exceeded");
      });

      // Should not throw
      expect(() => {
        adapter.write("any-key", "any-value");
      }).not.toThrow();

      // Restore
      globalThis.localStorage.setItem = originalSetItem;
    });

    it("handles remove errors gracefully (doesn't throw)", () => {
      const adapter = new BrowserLocalStorageAdapter();

      // Mock localStorage to throw on remove
      const originalRemoveItem = globalThis.localStorage.removeItem;
      globalThis.localStorage.removeItem = vi.fn(() => {
        throw new Error("Access denied");
      });

      // Should not throw
      expect(() => {
        adapter.remove("any-key");
      }).not.toThrow();

      // Restore
      globalThis.localStorage.removeItem = originalRemoveItem;
    });

    it("handles undefined globalThis gracefully (read returns null)", () => {
      const adapter = new BrowserLocalStorageAdapter();

      // Temporarily unset globalThis.localStorage
      const originalLocalStorage = globalThis.localStorage;
      delete (globalThis as any).localStorage;

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = adapter.read("any-key");
      expect(result).toBeNull();

      // Restore
      (globalThis as any).localStorage = originalLocalStorage;
      consoleSpy.mockRestore();
    });

    it("multiple keys coexist independently", () => {
      const adapter = new BrowserLocalStorageAdapter();

      try {
        adapter.write("key1", "value1");
        adapter.write("key2", "value2");

        expect(adapter.read("key1")).toBe("value1");
        expect(adapter.read("key2")).toBe("value2");
      } finally {
        adapter.remove("key1");
        adapter.remove("key2");
      }
    });

    it("write overwrites existing value", () => {
      const adapter = new BrowserLocalStorageAdapter();
      const key = "test-key";

      try {
        adapter.write(key, "value1");
        adapter.write(key, "value2");

        expect(adapter.read(key)).toBe("value2");
      } finally {
        adapter.remove(key);
      }
    });
  });
});
