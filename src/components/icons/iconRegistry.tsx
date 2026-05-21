/**
 * D1B — Icon registry (placeholder artwork).
 *
 * Maps semantic icon IDs to inline SVGs. Artwork is TEMPORARY — Bujar
 * replaces in a follow-up. All glyphs share:
 *   - 24x24 viewBox
 *   - currentColor stroke
 *   - 1.5px stroke (via --anth-icon-stroke when consumed)
 *   - no fill (line-icon discipline)
 *
 * Groups:
 *   shell/nav, mode, network-device, cloud, topology, workflow,
 *   status, assess, build, intake, security.
 */

import type { JSX } from "react";

export type IconGroup =
  | "shell"
  | "mode"
  | "network-device"
  | "cloud"
  | "topology"
  | "workflow"
  | "status"
  | "assess"
  | "build"
  | "intake"
  | "security";

export interface IconDescriptor {
  readonly id: string;
  readonly group: IconGroup;
  readonly render: () => JSX.Element;
}

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function svgPaths(...children: JSX.Element[]): JSX.Element {
  return <g {...stroke}>{children}</g>;
}

const ICONS: ReadonlyArray<IconDescriptor> = [
  // shell / navigation
  { id: "menu", group: "shell", render: () => svgPaths(<path key="a" d="M4 7h16M4 12h16M4 17h16" />) },
  { id: "search", group: "shell", render: () => svgPaths(<circle key="a" cx="11" cy="11" r="6" />, <path key="b" d="m20 20-4-4" />) },
  { id: "cortex", group: "shell", render: () => svgPaths(<circle key="a" cx="12" cy="12" r="3" />, <path key="b" d="M12 4v3M12 17v3M4 12h3M17 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />) },
  { id: "settings", group: "shell", render: () => svgPaths(<circle key="a" cx="12" cy="12" r="3" />, <path key="b" d="M12 3v3M12 18v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />) },
  { id: "chevron-right", group: "shell", render: () => svgPaths(<path key="a" d="m9 6 6 6-6 6" />) },

  // mode rail
  { id: "mode-discovery", group: "mode", render: () => svgPaths(<circle key="a" cx="11" cy="11" r="6" />, <path key="b" d="m20 20-4-4" />) },
  { id: "mode-topology", group: "mode", render: () => svgPaths(<circle key="a" cx="6" cy="6" r="2" />, <circle key="b" cx="18" cy="6" r="2" />, <circle key="c" cx="12" cy="18" r="2" />, <path key="d" d="M7 7l4 9M17 7l-4 9" />) },
  { id: "mode-intake", group: "mode", render: () => svgPaths(<path key="a" d="M5 4h10l4 4v12H5z" />, <path key="b" d="M15 4v4h4" />) },
  { id: "mode-operate", group: "mode", render: () => svgPaths(<path key="a" d="M4 12h4l3-8 3 16 3-8h3" />) },
  { id: "mode-assess", group: "mode", render: () => svgPaths(<path key="a" d="M5 4h14v16H5z" />, <path key="b" d="M8 9h8M8 13h8M8 17h5" />) },
  { id: "mode-diagnose", group: "mode", render: () => svgPaths(<path key="a" d="M12 3v6M12 15v6M3 12h6M15 12h6" />, <circle key="b" cx="12" cy="12" r="2" />) },
  { id: "mode-build", group: "mode", render: () => svgPaths(<path key="a" d="M4 20h16" />, <path key="b" d="M6 20V8l6-4 6 4v12" />, <path key="c" d="M10 20v-6h4v6" />) },
  { id: "mode-hierarchy", group: "mode", render: () => svgPaths(<rect key="a" x="9" y="3" width="6" height="4" />, <rect key="b" x="3" y="14" width="6" height="4" />, <rect key="c" x="15" y="14" width="6" height="4" />, <path key="d" d="M12 7v4M12 11h-6v3M12 11h6v3" />) },

  // network device
  { id: "device-router", group: "network-device", render: () => svgPaths(<rect key="a" x="3" y="10" width="18" height="8" rx="1" />, <path key="b" d="M7 14h2M11 14h2M15 14h2" />) },
  { id: "device-switch", group: "network-device", render: () => svgPaths(<rect key="a" x="3" y="9" width="18" height="9" />, <path key="b" d="M6 14h2M10 14h2M14 14h2M18 14h0" />) },
  { id: "device-firewall", group: "network-device", render: () => svgPaths(<rect key="a" x="4" y="5" width="16" height="14" />, <path key="b" d="M4 9h16M4 14h16M9 5v4M14 9v5M9 14v5" />) },
  { id: "device-server", group: "network-device", render: () => svgPaths(<rect key="a" x="5" y="4" width="14" height="7" />, <rect key="b" x="5" y="13" width="14" height="7" />, <circle key="c" cx="8" cy="7.5" r="0.5" />, <circle key="d" cx="8" cy="16.5" r="0.5" />) },
  { id: "device-endpoint", group: "network-device", render: () => svgPaths(<rect key="a" x="4" y="6" width="14" height="10" />, <path key="b" d="M8 20h6M11 16v4" />) },

  // cloud / campus / datacenter
  { id: "cloud", group: "cloud", render: () => svgPaths(<path key="a" d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1A4 4 0 0 0 7 17z" />) },
  { id: "datacenter", group: "cloud", render: () => svgPaths(<rect key="a" x="5" y="4" width="14" height="16" />, <path key="b" d="M5 9h14M5 14h14" />) },
  { id: "campus", group: "cloud", render: () => svgPaths(<path key="a" d="M4 20V10l8-5 8 5v10" />, <path key="b" d="M10 20v-6h4v6" />) },

  // topology construct
  { id: "topology-node", group: "topology", render: () => svgPaths(<circle key="a" cx="12" cy="12" r="4" />) },
  { id: "topology-link", group: "topology", render: () => svgPaths(<path key="a" d="M5 5l14 14" />, <circle key="b" cx="5" cy="5" r="2" />, <circle key="c" cx="19" cy="19" r="2" />) },
  { id: "topology-cluster", group: "topology", render: () => svgPaths(<circle key="a" cx="8" cy="8" r="3" />, <circle key="b" cx="16" cy="8" r="3" />, <circle key="c" cx="12" cy="16" r="3" />) },
  { id: "topology-3d", group: "topology", render: () => svgPaths(<path key="a" d="M12 3 4 7v10l8 4 8-4V7z" />, <path key="b" d="m4 7 8 4 8-4M12 11v10" />) },
  { id: "topology-minimap", group: "topology", render: () => svgPaths(<rect key="a" x="4" y="4" width="16" height="12" />, <rect key="b" x="14" y="11" width="6" height="5" />) },

  // workflow / events
  { id: "workflow-play", group: "workflow", render: () => svgPaths(<path key="a" d="M8 5l11 7-11 7z" />) },
  { id: "workflow-pause", group: "workflow", render: () => svgPaths(<rect key="a" x="6" y="5" width="4" height="14" />, <rect key="b" x="14" y="5" width="4" height="14" />) },
  { id: "workflow-step", group: "workflow", render: () => svgPaths(<path key="a" d="M5 12h10M11 6l6 6-6 6" />) },
  { id: "workflow-clock", group: "workflow", render: () => svgPaths(<circle key="a" cx="12" cy="12" r="8" />, <path key="b" d="M12 7v5l3 2" />) },

  // status / capability / readiness
  { id: "status-ok", group: "status", render: () => svgPaths(<circle key="a" cx="12" cy="12" r="8" />, <path key="b" d="m8 12 3 3 5-6" />) },
  { id: "status-warn", group: "status", render: () => svgPaths(<path key="a" d="M12 4l10 16H2z" />, <path key="b" d="M12 10v5M12 18v.5" />) },
  { id: "status-err", group: "status", render: () => svgPaths(<circle key="a" cx="12" cy="12" r="8" />, <path key="b" d="m9 9 6 6M15 9l-6 6" />) },
  { id: "status-info", group: "status", render: () => svgPaths(<circle key="a" cx="12" cy="12" r="8" />, <path key="b" d="M12 10v6M12 7v.5" />) },
  { id: "status-deferred", group: "status", render: () => svgPaths(<circle key="a" cx="12" cy="12" r="8" />, <path key="b" d="M8 12h8" />) },

  // assess / report
  { id: "assess-report", group: "assess", render: () => svgPaths(<path key="a" d="M6 3h9l3 3v15H6z" />, <path key="b" d="M9 12h6M9 16h6M9 8h4" />) },
  { id: "assess-pipeline", group: "assess", render: () => svgPaths(<circle key="a" cx="6" cy="12" r="2" />, <circle key="b" cx="18" cy="12" r="2" />, <path key="c" d="M8 12h8" />, <path key="d" d="M11 9v6M14 9v6" />) },
  { id: "assess-checklist", group: "assess", render: () => svgPaths(<path key="a" d="M5 4h14v16H5z" />, <path key="b" d="m8 9 1.5 1.5L13 7M8 15l1.5 1.5L13 13" />) },

  // build / config intent
  { id: "build-intent", group: "build", render: () => svgPaths(<path key="a" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />) },
  { id: "build-wrench", group: "build", render: () => svgPaths(<path key="a" d="M14 6a4 4 0 0 1-5 5l-6 6 3 3 6-6a4 4 0 0 1 5-5z" />) },
  { id: "build-deploy", group: "build", render: () => svgPaths(<path key="a" d="M5 19V9l7-5 7 5v10" />, <path key="b" d="M9 19v-6h6v6" />) },

  // intake / parser
  { id: "intake-upload", group: "intake", render: () => svgPaths(<path key="a" d="M5 17v3h14v-3" />, <path key="b" d="M12 14V4M7 9l5-5 5 5" />) },
  { id: "intake-parser", group: "intake", render: () => svgPaths(<path key="a" d="M5 4h14v16H5z" />, <path key="b" d="m9 9 6 6M15 9l-6 6" opacity="0.4" />, <path key="c" d="M8 13h2M8 16h6" />) },

  // security / governance
  { id: "security-shield", group: "security", render: () => svgPaths(<path key="a" d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z" />) },
  { id: "security-key", group: "security", render: () => svgPaths(<circle key="a" cx="7" cy="12" r="3" />, <path key="b" d="M10 12h11M17 12v3M20 12v2" />) },
];

const REGISTRY: ReadonlyMap<string, IconDescriptor> = new Map(
  ICONS.map((i) => [i.id, i]),
);

export const ICON_IDS: readonly string[] = ICONS.map((i) => i.id);

export function resolveIcon(id: string): IconDescriptor | null {
  return REGISTRY.get(id) ?? null;
}

export function listIcons(group?: IconGroup): readonly IconDescriptor[] {
  if (group === undefined) return ICONS;
  return ICONS.filter((i) => i.group === group);
}
