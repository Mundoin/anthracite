/**
 * D3B — Cortex input field.
 *
 * Search input + scope label + Esc hint. Mounts focused via autofocus
 * (parent renders only when overlay is open). Keyboard:
 *   - text input → setQuery
 *   - ↑ ↓        → moveHighlight
 *   - Enter      → activateHighlighted
 *   - Esc        → onRequestClose
 *
 * Obeys D3_NAV_SPEC §7 (Cortex input row).
 */

import { useEffect, useRef, type ChangeEvent, type JSX, type KeyboardEvent } from "react";
import { AnthIcon } from "../icons/AnthIcon";

export interface CortexInputProps {
  readonly query: string;
  readonly resultCount: number;
  readonly onQueryChange: (next: string) => void;
  readonly onMoveHighlight: (delta: number) => void;
  readonly onActivate: () => void;
  readonly onRequestClose: () => void;
}

export function CortexInput({
  query,
  resultCount,
  onQueryChange,
  onMoveHighlight,
  onActivate,
  onRequestClose,
}: CortexInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onQueryChange(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onMoveHighlight(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onMoveHighlight(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onActivate();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onRequestClose();
      return;
    }
  };

  return (
    <div className="cortex-input" data-testid="cortex-input-row">
      <span className="cortex-input__chip" aria-label="Search scope">
        Catalogue
      </span>
      <span className="cortex-input__caret" aria-hidden="true">
        <AnthIcon id="search" size="sm" />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="jump, search…"
        className="cortex-input__field"
        data-testid="cortex-input"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="Cortex search"
        autoComplete="off"
        spellCheck={false}
      />
      <span className="cortex-input__count" aria-live="polite" data-testid="cortex-result-count">
        {resultCount} {resultCount === 1 ? "result" : "results"}
      </span>
      <span className="cortex-input__esc" aria-hidden="true">Esc</span>
    </div>
  );
}
