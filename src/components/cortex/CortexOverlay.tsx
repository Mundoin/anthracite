/**
 * D3B — Cortex command palette overlay.
 *
 * Mandatory Concept-D command navigation surface (D3_NAV_SPEC §7).
 * Composes the catalogue adapter into a deterministic search-and-jump
 * surface. Sits above the canvas. Closes on backdrop click, Esc,
 * or activation.
 *
 *   Surface     : 560 px wide · max-height 480 px · top offset 96 px
 *   Behaviour   : Ctrl/⌘+K opens (App-owned); Esc closes; ↑/↓ highlight;
 *                 Enter activates highlighted; click activates.
 *   Activation  : delegated to props (App routes mode/child).
 *   Deferred /
 *   blocked     : still visible + selectable; selection switches sidebar
 *                 context but does not fabricate a surface.
 */

import type { JSX, MouseEvent } from "react";
import { useEffect, useRef } from "react";
import type { ModeCatalogue } from "../../contracts/modeCatalogue";
import type { CortexEntry } from "../navigation/cortexCatalogueAdapter";
import { CortexInput } from "./CortexInput";
import { CortexResultRow } from "./CortexResultRow";
import { useCortexOverlay } from "./cortexOverlayState";
import "./CortexOverlay.css";

export interface CortexOverlayProps {
  readonly open: boolean;
  readonly catalogue: ModeCatalogue;
  readonly onClose: () => void;
  readonly onActivate: (entry: CortexEntry) => void;
}

const SECTION_HEADINGS: Record<string, string> = {
  modes:     "MODES",
  workflows: "WORKFLOWS",
  tools:     "TOOLS",
  surfaces:  "SURFACES",
  groups:    "GROUPS",
  foot:      "UTILITIES",
};

export function CortexOverlay({
  open,
  catalogue,
  onClose,
  onActivate,
}: CortexOverlayProps): JSX.Element | null {
  const state = useCortexOverlay({
    catalogue,
    open,
    onActivate: (entry) => {
      onActivate(entry);
      onClose();
    },
  });

  const listRef = useRef<HTMLDivElement>(null);

  // Scroll the highlighted row into view when highlight changes.
  useEffect(() => {
    if (!open) return;
    const root = listRef.current;
    if (!root) return;
    const highlighted = root.querySelector<HTMLElement>(
      "[data-highlighted=\"true\"]",
    );
    if (highlighted && typeof highlighted.scrollIntoView === "function") {
      highlighted.scrollIntoView({ block: "nearest" });
    }
  }, [state.highlightedIndex, open]);

  if (!open) return null;

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Compute the global row index per section to feed CortexResultRow's hover
  // handler, since highlightedIndex is a flat results-array index.
  let cursor = 0;

  return (
    <div
      className="cortex-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Cortex command palette"
      data-testid="cortex-overlay"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="cortex-overlay__panel" role="combobox" aria-haspopup="listbox" aria-expanded={true}>
        <CortexInput
          query={state.query}
          resultCount={state.results.length}
          onQueryChange={state.setQuery}
          onMoveHighlight={state.moveHighlight}
          onActivate={state.activateHighlighted}
          onRequestClose={onClose}
        />

        <div
          className="cortex-overlay__results"
          role="listbox"
          ref={listRef}
          data-testid="cortex-results"
        >
          {state.results.length === 0 ? (
            <div className="cortex-overlay__empty" role="status" data-testid="cortex-empty">
              <span className="cortex-overlay__empty-title">No matches</span>
              <span className="cortex-overlay__empty-body">
                Refine your query, or press Esc to close.
              </span>
            </div>
          ) : (
            state.sections.map((section) => {
              const sectionStart = cursor;
              cursor += section.entries.length;
              return (
                <div
                  key={section.scope}
                  className="cortex-overlay__section"
                  data-testid={`cortex-section-${section.scope}`}
                >
                  <div className="cortex-overlay__section-heading">
                    {SECTION_HEADINGS[section.scope] ?? section.heading}
                  </div>
                  {section.entries.map((entry, i) => {
                    const globalIndex = sectionStart + i;
                    return (
                      <CortexResultRow
                        key={entry.entryId}
                        entry={entry}
                        index={globalIndex}
                        isHighlighted={globalIndex === state.highlightedIndex}
                        onHover={state.setHighlightedIndex}
                        onActivate={state.activateHighlighted}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
