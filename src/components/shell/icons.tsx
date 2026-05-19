/**
 * Icon set — ported from
 * docs/design/anthracite-master/handoff/src/components/icons.jsx (Direction D).
 * 1.5 px stroke, currentColor, render at any size via the `size` prop.
 */

import type { CSSProperties, ReactNode, SVGProps, JSX } from "react";

interface IcProps extends Omit<SVGProps<SVGSVGElement>, "fill" | "stroke"> {
  size?: number;
  sw?: number;
  fill?: string;
  viewBox?: string;
  children?: ReactNode;
  d?: string;
  style?: CSSProperties;
}

function Ic({
  d,
  size = 16,
  sw = 1.5,
  fill = "none",
  children,
  viewBox = "0 0 24 24",
  style,
  ...rest
}: IcProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto", display: "block", ...style }}
      {...rest}
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

/* Mode icons */
export const IcoHierarchy = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <rect x="9" y="3" width="6" height="5" rx="1" />
    <rect x="3" y="15" width="6" height="5" rx="1" />
    <rect x="15" y="15" width="6" height="5" rx="1" />
    <path d="M12 8v3M6 15v-2h12v2" />
  </Ic>
);
export const IcoProvision = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <path d="M12 3v18M3 12h18" />
    <circle cx="12" cy="12" r="3" />
  </Ic>
);
export const IcoOperate = (p: IcProps): JSX.Element => (
  <Ic {...p} d="M3 12h4l3-7 4 14 3-7h4" />
);
export const IcoTopology = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <circle cx="5" cy="6" r="2" />
    <circle cx="19" cy="6" r="2" />
    <circle cx="5" cy="18" r="2" />
    <circle cx="19" cy="18" r="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M7 6h10M7 18h10M6.5 7.5l4 3M17.5 7.5l-4 3M6.5 16.5l4-3M17.5 16.5l-4-3" />
  </Ic>
);
export const IcoDiagnose = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <path d="M11 4a7 7 0 1 0 4 12.5L20 21" />
    <path d="M11 7v4M11 14v.01" />
  </Ic>
);
export const IcoAssess = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 12l3 3 5-6" />
  </Ic>
);
export const IcoSecurity = (p: IcProps): JSX.Element => (
  <Ic {...p} d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
);
export const IcoDashboards = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <rect x="3" y="3" width="8" height="10" rx="1" />
    <rect x="13" y="3" width="8" height="6" rx="1" />
    <rect x="13" y="11" width="8" height="10" rx="1" />
    <rect x="3" y="15" width="8" height="6" rx="1" />
  </Ic>
);
export const IcoBuild = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <path d="M14 6l4 4-9 9H5v-4z" />
    <path d="M13 7l4 4" />
  </Ic>
);
export const IcoIntake = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M4 19h16" />
  </Ic>
);
export const IcoSettings = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Ic>
);
export const IcoDiscovery = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="8" />
    <path d="M20 4l-2 2" />
  </Ic>
);

/* Chrome icons */
export const IcoSearch = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M16 16l4 4" />
  </Ic>
);
export const IcoBell = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Ic>
);
export const IcoUser = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
  </Ic>
);
export const IcoChevD = (p: IcProps): JSX.Element => <Ic {...p} d="M6 9l6 6 6-6" />;
export const IcoMin = (p: IcProps): JSX.Element => <Ic {...p} sw={1.2} d="M5 12h14" />;
export const IcoMax = (p: IcProps): JSX.Element => (
  <Ic {...p} sw={1.2}>
    <rect x="5" y="5" width="14" height="14" />
  </Ic>
);
export const IcoX = (p: IcProps): JSX.Element => (
  <Ic {...p} sw={1.2}>
    <path d="M6 6l12 12M18 6l-12 12" />
  </Ic>
);
export const IcoTerminal = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <path d="M7 9l3 3-3 3M13 15h4" />
  </Ic>
);

export const IcoPlus = (p: IcProps): JSX.Element => <Ic {...p} d="M12 5v14M5 12h14" />;
export const IcoFilter = (p: IcProps): JSX.Element => (
  <Ic {...p} d="M4 5h16l-6 8v6l-4-2v-4z" />
);
export const IcoRefresh = (p: IcProps): JSX.Element => (
  <Ic {...p} d="M21 8a9 9 0 0 0-15.5-2L3 9M3 16a9 9 0 0 0 15.5 2L21 15M3 4v5h5M21 20v-5h-5" />
);
export const IcoExport = (p: IcProps): JSX.Element => (
  <Ic {...p} d="M12 4v12M7 9l5-5 5 5M5 20h14" />
);
export const IcoMore = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <circle cx="6" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18" cy="12" r="1" />
  </Ic>
);
export const IcoTable = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <path d="M3 10h18M9 4v16" />
  </Ic>
);
export const IcoGrid = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <rect x="3" y="3" width="8" height="8" />
    <rect x="13" y="3" width="8" height="8" />
    <rect x="3" y="13" width="8" height="8" />
    <rect x="13" y="13" width="8" height="8" />
  </Ic>
);
export const IcoMap = (p: IcProps): JSX.Element => (
  <Ic {...p} d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />
);

export const IcoChevR = (p: IcProps): JSX.Element => <Ic {...p} d="M9 6l6 6-6 6" />;
export const IcoChevL = (p: IcProps): JSX.Element => <Ic {...p} d="M15 6l-6 6 6 6" />;
export const IcoDevice = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <rect x="3" y="6" width="18" height="10" rx="1" />
    <path d="M7 10v2M11 10v2M15 10v2M19 10v2M3 19h18" />
  </Ic>
);
export const IcoSite = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </Ic>
);
export const IcoBolt = (p: IcProps): JSX.Element => (
  <Ic {...p} d="M13 3l-9 12h6l-1 6 9-12h-6z" />
);
export const IcoEye = (p: IcProps): JSX.Element => (
  <Ic {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Ic>
);
export const IcoLink = (p: IcProps): JSX.Element => (
  <Ic
    {...p}
    d="M9 15l6-6M10 6l1.5-1.5a4 4 0 0 1 5.5 5.5L15 12M14 18l-1.5 1.5a4 4 0 0 1-5.5-5.5L9 12"
  />
);

/* Anthracite mark — angular A. */
export function AnthMark({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path d="M2 21 L 12 3 L 22 21 Z" fill="#1A202C" />
      <path d="M8.2 17 L 12 9 L 15.8 17 Z" fill="#F8FAFC" />
      <rect x="8.6" y="14.4" width="6.8" height="1.2" fill="#1A202C" />
    </svg>
  );
}
