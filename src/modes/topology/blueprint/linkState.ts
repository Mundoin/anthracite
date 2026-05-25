/**
 * V1BV — Pure link/edge state derivation.
 *
 * Given the operational state of two endpoint devices, returns the
 * derived link state via severity precedence:
 *
 *     down > degraded > warning > maintenance > unknown > healthy
 *
 * Either endpoint missing/undefined → treated as "unknown".
 *
 * No I/O, no randomness, no DOM. Stable for unit tests.
 */
import type { LabOperationalState } from "../../../types/labEnvironment";

const SEVERITY: Record<LabOperationalState, number> = {
  healthy: 0,
  unknown: 1,
  maintenance: 2,
  warning: 3,
  degraded: 4,
  down: 5,
};

export function deriveLinkState(
  a: LabOperationalState | undefined,
  b: LabOperationalState | undefined,
): LabOperationalState {
  const left = a ?? "unknown";
  const right = b ?? "unknown";
  return SEVERITY[left] >= SEVERITY[right] ? left : right;
}
