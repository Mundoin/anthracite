/** Ambient types for the File System Access API
 * (showSaveFilePicker + showOpenFilePicker). */

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | Blob | BufferSource): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
  getFile(): Promise<File>;
}

interface SaveFilePickerOptions {
  readonly suggestedName?: string;
  readonly types?: ReadonlyArray<{
    readonly description: string;
    readonly accept: Record<string, ReadonlyArray<string>>;
  }>;
}

interface OpenFilePickerOptions {
  readonly multiple?: boolean;
  readonly excludeAcceptAllOption?: boolean;
  readonly types?: ReadonlyArray<{
    readonly description: string;
    readonly accept: Record<string, ReadonlyArray<string>>;
  }>;
}

interface Window {
  showSaveFilePicker(
    options?: SaveFilePickerOptions,
  ): Promise<FileSystemFileHandle>;
  showOpenFilePicker(
    options?: OpenFilePickerOptions,
  ): Promise<FileSystemFileHandle[]>;
}
