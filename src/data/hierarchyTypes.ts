export interface RowSeed {
  readonly group: "production" | "non-prod" | "special";
  readonly id: string;
  readonly region: string;
  readonly scope: string;
  readonly sites: number;
  readonly readiness: number;
  readonly l2: number;
  readonly l3: number;
  readonly ebgp: number;
  readonly drift: number;
  readonly events: number;
  readonly owner: string;
  readonly last: string;
}
