import type { JSX } from "react";
import { SOURCE_LABEL, type DataSourceState } from "../../types/dataSource";

export interface DataSourceTagProps {
  readonly state: DataSourceState;
  readonly override?: string;
}

export function DataSourceTag({ state, override }: DataSourceTagProps): JSX.Element | null {
  if (state === "real") return null;
  const text = override ?? SOURCE_LABEL[state];
  return (
    <span
      className="micro"
      data-state={state}
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <span
        style={{
          display: "inline-block",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "var(--anth-role-provenance)",
          flexShrink: 0,
        }}
      />
      {text}
    </span>
  );
}
