/**
 * Tauri Lab Blob Bridge — V1BO.
 *
 * Thin async wrapper over the two V1BO Tauri commands:
 *   - read_saved_environments_blob  → Option<String>
 *   - write_saved_environments_blob → Result<(), String>
 *
 * Detects Tauri runtime via the `__TAURI_INTERNALS__` global so it is
 * safe to call from browser dev (`vite dev`), unit tests, and SSR —
 * in those contexts every call resolves to a "no-op" verdict and the
 * caller falls back to the BrowserLocalStorageAdapter path.
 *
 * Why dynamic-import the Tauri core module: the import would otherwise
 * pull `@tauri-apps/api/core` into every Vite browser bundle, even when
 * the harness is not actually running inside Tauri (tests, dev). Dynamic
 * import keeps that surface lazy.
 */

const TAURI_GLOBAL = "__TAURI_INTERNALS__" as const;

/**
 * `true` when the current runtime exposes the Tauri 2 internals global,
 * meaning `invoke` will succeed.
 */
export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return TAURI_GLOBAL in window;
}

/**
 * Read the durable blob persisted by `LabBlobStore`. Returns the raw
 * JSON string (frontend deserializes via the existing snapshot parser),
 * or `null` when no durable file exists, when not in Tauri, or when
 * the invoke fails.
 */
export async function readTauriLabBlob(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const blob = await invoke<string | null>("read_saved_environments_blob");
    return blob ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[tauriLabBlobBridge] read failed", err);
    return null;
  }
}

/**
 * Persist a blob via `LabBlobStore`. Resolves with `{ ok: true }` on
 * success, `{ ok: false, error }` on Tauri-side failure, and silently
 * `{ ok: true }` in non-Tauri runtimes (the caller's BrowserLocalStorage
 * mirror is the authoritative store there).
 */
export async function writeTauriLabBlob(
  blob: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTauriRuntime()) return { ok: true };
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_saved_environments_blob", { blob });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn("[tauriLabBlobBridge] write failed", err);
    return { ok: false, error: msg };
  }
}
