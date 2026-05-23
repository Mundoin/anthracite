/**
 * V1BJ — edge-aware callout placement.
 *
 * Pure geometry: given a pick anchor and a callout size, return
 * top/left of the callout card + leader endpoints so the card never
 * overflows the wrap rect.
 *
 * Rules:
 *   - default placement is up-and-right of the pick
 *   - flip horizontally when the right edge would overflow
 *   - flip vertically (place below) when the top edge would overflow
 *   - clamp inside the wrap with a minimum margin
 *   - leader anchors at the pick point and lands at the nearest
 *     corner of the callout card
 */

export interface CalloutAnchor {
  /** Pick position in wrap-relative px. */
  x: number;
  y: number;
}

export interface CalloutSize {
  w: number;
  h: number;
}

export interface CalloutWrap {
  w: number;
  h: number;
}

export interface CalloutPlacement {
  /** Card top-left in wrap-relative px. */
  cardLeft: number;
  cardTop: number;
  /** Which side of the pick the card sits on. */
  side: "tr" | "tl" | "br" | "bl";
  /** Leader-line attach point on the card in wrap-relative px. */
  leaderAttachX: number;
  leaderAttachY: number;
  /** Pick anchor passthrough for the renderer. */
  pickX: number;
  pickY: number;
}

const DEFAULT_OFFSET = 36;
const MIN_MARGIN = 8;

export function placeCallout(
  anchor: CalloutAnchor,
  size: CalloutSize,
  wrap: CalloutWrap,
): CalloutPlacement {
  const offset = DEFAULT_OFFSET;
  const margin = MIN_MARGIN;

  // Default: card sits top-right of pick.
  let side: CalloutPlacement["side"] = "tr";
  let cardLeft = anchor.x + offset;
  let cardTop = anchor.y - offset - size.h;

  // Horizontal flip — when right edge overflows, place to the left.
  if (cardLeft + size.w > wrap.w - margin) {
    side = side === "tr" ? "tl" : "bl";
    cardLeft = anchor.x - offset - size.w;
  }

  // Vertical flip — when top edge overflows, place below.
  if (cardTop < margin) {
    side = side === "tr" ? "br" : side === "tl" ? "bl" : side;
    cardTop = anchor.y + offset;
  }

  // Final clamp inside the wrap.
  cardLeft = Math.max(
    margin,
    Math.min(wrap.w - size.w - margin, cardLeft),
  );
  cardTop = Math.max(
    margin,
    Math.min(wrap.h - size.h - margin, cardTop),
  );

  // Leader attaches at the card corner nearest the pick.
  const leaderAttachX =
    side === "tr" || side === "br"
      ? cardLeft
      : cardLeft + size.w;
  const leaderAttachY =
    side === "tr" || side === "tl"
      ? cardTop + size.h
      : cardTop;

  return {
    cardLeft,
    cardTop,
    side,
    leaderAttachX,
    leaderAttachY,
    pickX: anchor.x,
    pickY: anchor.y,
  };
}
