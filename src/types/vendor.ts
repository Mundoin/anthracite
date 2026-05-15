/**
 * Vendor Registry Engine — TypeScript surface.
 *
 * Mirrors `src-tauri/src/engines/vendor_registry.rs`. Keep in sync.
 * The Rust side is authoritative; TS types describe what the typed
 * Tauri command boundary returns.
 */

export type PriorityTier = "t1" | "t2" | "t3";

export type ParserMaturity =
  | "l0identify"
  | "l1inventory"
  | "l2topology"
  | "l3policy"
  | "l4intent"
  | "l5validation"
  | "l6render";

export type CapabilityFamily =
  | "interfaces"
  | "ip_addressing"
  | "vlans"
  | "vrfs"
  | "static_routing"
  | "ospf"
  | "isis"
  | "eigrp"
  | "bgp"
  | "acl_firewall"
  | "nat"
  | "vpn_tunnels"
  | "qos"
  | "lag_lacp"
  | "services"
  | "topology_hints";

export interface VendorPlatform {
  readonly id: string;
  readonly vendor: string;
  readonly os_family: string;
  readonly primary_role: string;
  readonly config_style: string;
  readonly priority_tier: PriorityTier;
  readonly initial_parser_target_level: ParserMaturity;
  readonly capability_families: ReadonlyArray<CapabilityFamily>;
  readonly notes: string;
}
