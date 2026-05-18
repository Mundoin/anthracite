# fortios-vpn-sdwan-notes-003.intent

## What this fixture is for

This fixture rounds out the baseline with extra interface and zone
variation, more static routes, and note-only reminders for future VPN
and SD-WAN prep.

## Devices and interfaces to extract

- The device hostname.
- `port5` as the LAN trunk.
- `port6` as the WAN uplink.
- `VLAN100` and `VLAN200` as VLAN interfaces.
- `GUEST`, `IOT`, and `WAN` zones.
- Firewall address and service objects.
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

- VLAN interfaces on a shared parent port.
- Zone membership.
- NAT pool and policy NAT markers.
- Multiple static routes.
- Basic policy extraction.

## Out of scope for this parser stage

- VPN tunnel semantics.
- SD-WAN member/health-check behavior.
- UTM profile semantics.
- Live state.

## Ambiguity notes

- The VPN and SD-WAN material is intentionally comment-only.
- The policy references a zone-to-zone pattern and should not be forced
  into a more specific semantic shape than the schema allows.

## Expected parser risks

- The parser should not invent VPN or SD-WAN model objects from
  comments.
- Mixed WAN/LAN references can be easy to over-normalize if the parser
  assumes every zone implies an interface role change.

