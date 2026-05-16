import { useCallback, useRef, type ChangeEvent, type JSX } from "react";
import type { IntakeSource, IntakeStatus } from "../intakeTypes";

export interface ConfigInputAreaProps {
  readonly text: string;
  readonly source: IntakeSource | null;
  readonly status: IntakeStatus;
  readonly onTextChange: (text: string) => void;
  readonly onFile: (file: File) => void;
  readonly onClear: () => void;
  readonly onDetect: () => void;
}

const ACCEPT = ".cfg,.txt,.conf,.config,text/plain";

export function ConfigInputArea(props: ConfigInputAreaProps): JSX.Element {
  const { text, source, status, onTextChange, onFile, onClear, onDetect } = props;
  const fileRef = useRef<HTMLInputElement | null>(null);

  const busy = status === "detecting" || status === "parsing";
  const canDetect = !busy && text.length > 0;
  const canClear = !busy && (text.length > 0 || status === "error");

  const triggerFile = useCallback((): void => {
    fileRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      e.target.value = "";
    },
    [onFile],
  );

  const sourceLabel = describeSource(source, text);

  return (
    <section className="intake-input" aria-label="Config input">
      <header className="intake-input__header">
        <div className="intake-input__title">CONFIG INPUT</div>
        <div className="intake-input__source">{sourceLabel}</div>
        <div className="intake-input__actions">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="intake-input__file"
            onChange={onFileChange}
            data-testid="intake-file-input"
          />
          <button
            type="button"
            className="intake-btn"
            onClick={triggerFile}
            disabled={busy}
          >
            Open file…
          </button>
          <button
            type="button"
            className="intake-btn"
            onClick={onClear}
            disabled={!canClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="intake-btn intake-btn--primary"
            onClick={onDetect}
            disabled={!canDetect}
          >
            {status === "detecting" ? "Detecting…" : "Detect platform"}
          </button>
        </div>
      </header>
      <textarea
        className="intake-input__textarea"
        spellCheck={false}
        wrap="off"
        placeholder="Paste a single device config here, or open a file."
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        readOnly={busy}
        aria-label="Config text"
      />
      <footer className="intake-input__footer">
        <span>{text.length.toLocaleString("en-US")} chars</span>
        <span>{countLines(text).toLocaleString("en-US")} lines</span>
      </footer>
    </section>
  );
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  let n = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function describeSource(source: IntakeSource | null, text: string): string {
  if (text.length === 0) return "(no input)";
  if (!source) return "paste";
  if (source.kind === "file") {
    const size = source.byte_size != null
      ? ` · ${source.byte_size.toLocaleString("en-US")} bytes`
      : "";
    return `file · ${source.filename ?? "(unnamed)"}${size}`;
  }
  return "paste";
}
