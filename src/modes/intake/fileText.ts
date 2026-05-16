/**
 * Intake mode — UTF-8 file -> text helper (V1O).
 *
 * Isolated for testability without a native dialog. The dialog itself
 * runs in the WebView via <input type="file">; this helper is what the
 * panel calls once a File object is in hand.
 */

export interface LoadedFile {
  readonly text: string;
  readonly filename: string;
  readonly byte_size: number;
}

export type FileLoadOutcome =
  | { readonly ok: true; readonly value: LoadedFile }
  | { readonly ok: false; readonly message: string };

export async function readUtf8File(file: File): Promise<FileLoadOutcome> {
  if (file.size === 0) {
    return {
      ok: false,
      message: `File "${file.name}" is empty (0 bytes).`,
    };
  }
  try {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const text = decoder.decode(buffer);
    return {
      ok: true,
      value: {
        text,
        filename: file.name,
        byte_size: file.size,
      },
    };
  } catch (err) {
    return {
      ok: false,
      message: `File "${file.name}" is not valid UTF-8: ${describeError(err)}`,
    };
  }
}

export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
