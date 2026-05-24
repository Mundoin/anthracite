import type { JSX } from "react";
import { useEnvironmentLifecycle } from "../../state/EnvironmentLifecycleContext";

export function TopologyEnvSelector(): JSX.Element | null {
  const ctx = (() => {
    try {
      return useEnvironmentLifecycle();
    } catch {
      return null;
    }
  })();

  if (!ctx?.visible_environments || ctx.visible_environments.length < 2) return null;

  const { visible_environments, active } = ctx;

  return (
    <select
      className="tm-env-selector"
      value={active?.environment_id ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        if (id) ctx.selectActive(id);
      }}
      aria-label="Active environment"
      data-testid="tm-env-selector"
    >
      {visible_environments.map((env) => (
        <option key={env.environment_id} value={env.environment_id}>
          {env.name}
        </option>
      ))}
    </select>
  );
}
