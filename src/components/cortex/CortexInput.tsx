/**
 * D3B — Cortex input field.
 *
 * Search input + scope chip row + Esc hint. D3C: scope chips cycle via
 * Tab / Shift+Tab and clickable selection.
 *
 * Keyboard:
 *   - text input → setQuery
 *   - ↑ ↓        → moveHighlight
 *   - Enter      → activateHighlighted
 *   - Esc        → onRequestClose
 *   - Tab        → cycle scope forward
 *   - Shift+Tab  → cycle scope back
 *
 * Obeys D3_NAV_SPEC §7.
 */

import { useEffect, useRef, type ChangeEvent, type JSX, type KeyboardEvent } from "react";
import { AnthIcon } from "../icons/AnthIcon";
import {
  SCOPE_FILTER_LABEL,
  SCOPE_FILTER_ORDER,
  type CortexScopeFilter,
} from "./cortexOverlayState";

export interface CortexInputProps {
  readonly query: string;
  readonly resultCount: number;
  readonly scope: CortexScopeFilter;
  readonly onQueryChange: (next: string) => void;
  readonly onScopeChange: (next: CortexScopeFilter) => void;
  readonly onCycleScope: (delta: 1 | -1) => void;
  readonly onMoveHighlight: (delta: number) => void;
  readonly onActivate: () => void;
  readonly onRequestClose: () => void;
}

export function CortexInput({
  query,
  resultCount,
  scope,
  onQueryChange,
  onScopeChange,
  onCycleScope,
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
    if (e.key === "Tab") {
      e.preventDefault();
      onCycleScope(e.shiftKey ? -1 : 1);
      return;
    }
  };

  return (
    <div className="cortex-input-block" data-testid="cortex-input-block">
      {/* Scope chip row */}
      <div
        className="cortex-input__scope-row"
        role="tablist"
        aria-label="Cortex scope filter"
        data-testid="cortex-scope-row"
      >
        {SCOPE_FILTER_ORDER.map((value) => {
          const selected = value === scope;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              data-active={selected ? "true" : undefined}
              className={`cortex-input__scope-chip ${selected ? "cortex-input__scope-chip--active" : ""}`}
              data-testid={`cortex-scope-${value}`}
              onClick={() => onScopeChange(value)}
              tabIndex={-1}
            >
              {SCOPE_FILTER_LABEL[value]}
            </button>
          );
        })}
      </div>

      {/* Input row */}
      <div className="cortex-input" data-testid="cortex-input-row">
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
    </div>
  );
}
