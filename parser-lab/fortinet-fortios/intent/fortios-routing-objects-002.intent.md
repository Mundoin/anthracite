# fortios-routing-objects-002.intent

## What this fixture is for

This fixture adds the routing and policy side of the baseline: static
routes, firewall objects, policies, and explicit NAT pool material.

## Devices and interfaces to extract

- The device hostname.
- `port3` as the WAN edge interface.
- `port4` as the server trunk.
- `VLAN20` and `VLAN30` as server VLAN interfaces.
- `DMZ` and `SERVERS` zones.
- Firewall address objects and service objects.
- Static routes and NAT pool metadata.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `vlans`
- `firewall_zones`
- `services`
- `nat_rules`
- `static_routes`
- `unknown_lines`
- `parse_confidence`

## In scope for a future parser stage

- Interface and VLAN inventory.
- Static route extraction.
- Address and service object extraction.
- Policy source/destination interface mapping.
- NAT pool recognition.

## Out of scope for this parser stage

- Firewall inspection behavior.
- Session tracking.
- VPN / SD-WAN.
- HA / cluster behavior.

## Ambiguity notes

- One policy has NAT enabled with an IP pool; another policy is
  intentionally plain to keep the baseline from overfitting to NAT.
- The route to `VLAN20` is a prep artifact, not a topology claim.

## Expected parser risks

- FortiOS route syntax can vary by release, so the parser should stay
  tolerant about route field ordering and punctuation.
- Firewall objects may be defined before or after the policies that use
  them.

