/**
 * V1BS — Device icon registry.
 *
 * Each entry is the inner SVG content (no `<svg>` wrapper) for one family.
 * Authored in a 64×64 coordinate space; the canvas wraps the icon in a
 * transform that maps that box onto the family's FAMILY_FRAME w/h centered
 * at the node origin (icon-as-frame: the icon IS the device shape).
 *
 * Strokes use `stroke="currentColor"`. The CSS cascade sets `color:` on
 * `.bt-node` via the `data-family` attribute, so the icon picks up its
 * family colour without any per-icon hex.
 *
 * Source SVGs live in `src/assets/device-icons/` (matching content).
 */

import type { JSX } from "react";
import type { NodeFamilyCode } from "./blueprintGlyph";

/**
 * Source coordinate space for every icon. Each icon's geometry is drawn
 * inside a 64×64 box; the canvas scales it to the family's frame size.
 */
export const DEVICE_ICON_VIEWBOX = { w: 64, h: 64 } as const;

/**
 * Inner SVG content for each device family. The wrapping `<g>` is added
 * by the caller along with the translate+scale transform.
 */
export const DEVICE_ICON: Record<NodeFamilyCode, JSX.Element> = {
  "FW": (
    <g
      data-network-icon="fw"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect vectorEffect="non-scaling-stroke" x={6} y={26} width={52} height={14} rx={1} />
      <line vectorEffect="non-scaling-stroke" x1={20} y1={26} x2={20} y2={40} opacity={0.55} />
      <path
        vectorEffect="non-scaling-stroke"
        d="M13 29 10 30V33C10 34.5 11.5 36 13 36 14.5 36 16 34.5 16 33V30Z"
        opacity={0.55}
      />
      <circle vectorEffect="non-scaling-stroke" cx={18} cy={33} r={0.6} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={28} y={29} width={5} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={38} y={29} width={5} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={48} y={29} width={5} height={8} rx={0.5} opacity={0.55} />
    </g>
  ),
  "CORE-RT": (
    <g
      data-network-icon="core-rt"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect vectorEffect="non-scaling-stroke" x={6} y={20} width={52} height={24} rx={1} />
      <line vectorEffect="non-scaling-stroke" x1={18} y1={20} x2={18} y2={44} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={12} cy={26} r={0.7} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={12} cy={32} r={0.7} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={12} cy={38} r={0.7} opacity={0.55} />
      <line vectorEffect="non-scaling-stroke" x1={30} y1={20} x2={30} y2={44} opacity={0.55} />
      <line vectorEffect="non-scaling-stroke" x1={42} y1={20} x2={42} y2={44} opacity={0.55} />
      <line vectorEffect="non-scaling-stroke" x1={52} y1={20} x2={52} y2={44} opacity={0.55} />
    </g>
  ),
  "EDGE-RT": (
    <g
      data-network-icon="edge-rt"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect vectorEffect="non-scaling-stroke" x={6} y={26} width={52} height={14} rx={1} />
      <line vectorEffect="non-scaling-stroke" x1={14} y1={26} x2={14} y2={40} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={10} cy={33} r={0.6} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={18} y={29} width={8} height={8} rx={0.5} opacity={0.55} />
      <line vectorEffect="non-scaling-stroke" x1={30} y1={29} x2={30} y2={37} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={34} y={29} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={44} y={29} width={6} height={8} rx={0.5} opacity={0.55} />
    </g>
  ),
  "DIST-SW": (
    <g
      data-network-icon="dist-sw"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect vectorEffect="non-scaling-stroke" x={6} y={20} width={52} height={24} rx={1} />
      <line vectorEffect="non-scaling-stroke" x1={18} y1={20} x2={18} y2={44} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={12} cy={28} r={0.7} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={12} cy={36} r={0.7} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={22} y={23} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={32} y={23} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={42} y={23} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={51} y={23} width={5} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={22} y={33} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={32} y={33} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={42} y={33} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={51} y={33} width={5} height={8} rx={0.5} opacity={0.55} />
    </g>
  ),
  "ACC-SW": (
    <g
      data-network-icon="acc-sw"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect vectorEffect="non-scaling-stroke" x={6} y={26} width={52} height={14} rx={1} />
      <line vectorEffect="non-scaling-stroke" x1={14} y1={26} x2={14} y2={40} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={10} cy={33} r={0.6} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={18} y={29} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={26} y={29} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={34} y={29} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={42} y={29} width={6} height={8} rx={0.5} opacity={0.55} />
      <rect vectorEffect="non-scaling-stroke" x={51} y={30} width={5} height={6} rx={0.5} opacity={0.55} />
    </g>
  ),
  "WAP": (
    <g
      data-network-icon="wap"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle vectorEffect="non-scaling-stroke" cx={32} cy={42} r={10} />
      <circle vectorEffect="non-scaling-stroke" cx={32} cy={42} r={1.5} opacity={0.55} />
      <path vectorEffect="non-scaling-stroke" d="M22 33Q32 23 42 33" opacity={0.55} />
      <path vectorEffect="non-scaling-stroke" d="M16 27Q32 11 48 27" opacity={0.55} />
    </g>
  ),
  "SRV": (
    <g
      data-network-icon="srv"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect vectorEffect="non-scaling-stroke" x={16} y={10} width={32} height={44} rx={3} />
      <line vectorEffect="non-scaling-stroke" x1={16} y1={22} x2={48} y2={22} opacity={0.55} />
      <line vectorEffect="non-scaling-stroke" x1={16} y1={34} x2={48} y2={34} opacity={0.55} />
      <line vectorEffect="non-scaling-stroke" x1={16} y1={46} x2={48} y2={46} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={42} cy={16} r={0.8} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={42} cy={28} r={0.8} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={42} cy={40} r={0.8} opacity={0.55} />
      <circle vectorEffect="non-scaling-stroke" cx={42} cy={50} r={0.8} opacity={0.55} />
    </g>
  ),
  "UNK": (
    <g
      data-network-icon="unk"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        vectorEffect="non-scaling-stroke"
        x={6}
        y={26}
        width={52}
        height={14}
        rx={1}
        strokeDasharray="2 2"
      />
    </g>
  ),
};
