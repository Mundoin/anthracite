/**
 * V1S — narrow save-to-file bridge over the browser File System Access API.
 *
 * Uses showSaveFilePicker (available in Tauri v2 webview2 on Windows).
 * Zero new dependencies. Zero Rust churn. Zero capability changes.
 */

export interface SaveFileResult {
  readonly ok: true;
}

export interface SaveFileCancelled {
  readonly cancelled: true;
}

export interface SaveFileError {
  readonly error: true;
  readonly message: string;
}

export type SaveFileOutcome = SaveFileResult | SaveFileCancelled | SaveFileError;

export interface SaveFileOptions {
  readonly suggestedName: string;
  readonly mimeType: string;
  readonly extension: string;
}

export async function saveToFile(
  text: string,
  options: SaveFileOptions,
): Promise<SaveFileOutcome> {
  if (typeof window === "undefined" || typeof window.showSaveFilePicker !== "function") {
    return { error: true, message: "File save API not available in this context." };
  }

  let handle: FileSystemFileHandle;
  try {
    handle = await window.showSaveFilePicker({
      suggestedName: options.suggestedName,
      types: [
        {
          description: options.extension.toUpperCase(),
          accept: { [options.mimeType]: [`.${options.extension}`] },
        },
      ],
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { cancelled: true };
    }
    return {
      error: true,
      message: `Save dialog failed: ${describeSaveError(err)}`,
    };
  }

  let writable: FileSystemWritableFileStream;
  try {
    writable = await handle.createWritable();
  } catch (err: unknown) {
    return {
      error: true,
      message: `Could not open file for writing: ${describeSaveError(err)}`,
    };
  }

  try {
    await writable.write(text);
    await writable.close();
  } catch (err: unknown) {
    return {
      error: true,
      message: `Write failed: ${describeSaveError(err)}`,
    };
  }

  return { ok: true };
}

function describeSaveError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
