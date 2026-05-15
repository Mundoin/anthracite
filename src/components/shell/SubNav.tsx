import type { JSX, ReactNode } from "react";

export interface SubNavItem {
  readonly id: string;
  readonly label: string;
  readonly count?: number | string;
  readonly warn?: boolean;
  readonly err?: boolean;
}

export interface SubNavProps {
  readonly items: readonly SubNavItem[];
  readonly activeId: string;
  readonly onChange?: (id: string) => void;
  readonly right?: ReactNode;
}

/** Mode-local segmented sub-nav. Renders below the title bar. */
export function SubNav({ items, activeId, onChange, right }: SubNavProps): JSX.Element {
  return (
    <div className="anth-subnav" role="tablist">
      {items.map((item) => {
        const isActive = item.id === activeId;
        const cls = ["seg", isActive ? "active" : ""].join(" ").trim();
        return (
          <div
            key={item.id}
            className={cls}
            role="tab"
            tabIndex={0}
            aria-selected={isActive}
            onClick={() => onChange?.(item.id)}
          >
            <span>{item.label}</span>
            {item.count !== undefined && <span className="count">{item.count}</span>}
          </div>
        );
      })}
      <div className="grow" />
      {right}
    </div>
  );
}
