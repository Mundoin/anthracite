/**
 * V1O-B archive picker — surfaces a single "Open archive…" button
 * that maps to the native file picker for `.zip`, `.tar`, `.tar.gz`,
 * `.tgz`. The actual decode happens upstream in `IntakePanel`; this
 * component is a thin file-input wrapper that hands the chosen
 * `File` to the parent and self-resets so the same archive can be
 * re-picked.
 */

import { useCallback, useRef, type ChangeEvent, type JSX } from "react";

export interface ArchiveOpenButtonProps {
  readonly onArchive: (file: File) => void;
  readonly disabled?: boolean;
  readonly label?: string;
}

const ACCEPT_EXTENSIONS = ".zip,.tar,.tar.gz,.tgz";

export function ArchiveOpenButton({
  onArchive,
  disabled,
  label = "Open archive…",
}: ArchiveOpenButtonProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onClick = useCallback((): void => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      // Reset before calling out so the same archive can be re-opened
      // without remounting the input.
      e.target.value = "";
      if (file) {
        onArchive(file);
      }
    },
    [onArchive],
  );

  return (
    <span className="intake-archive-open">
      <button
        type="button"
        className="intake-btn intake-btn--archive"
        onClick={onClick}
        disabled={disabled ?? false}
        aria-label="Open archive"
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_EXTENSIONS}
        className="intake-archive-open__input"
        style={{ display: "none" }}
        onChange={onChange}
        aria-hidden="true"
      />
    </span>
  );
}
