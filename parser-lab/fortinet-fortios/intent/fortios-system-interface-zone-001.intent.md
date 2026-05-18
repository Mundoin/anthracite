# fortios-system-interface-zone-001.intent

## What this fixture is for

This fixture establishes the FortiOS baseline shape: system/global,
interfaces, VLANs, zones, address/service objects, a simple policy, and
a NAT marker.

## Devices and interfaces to extract

- The device hostname from `config system global`.
- `port1` as the WAN-facing physical interface.
- `port2` as the LAN-facing physical interface.
- `VLAN10` as the VLAN interface on `port2`.
- `LAN` and `WAN` system zones.
- Firewall address and service objects.
- A basic LAN-to-WAN policy.

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

- Hostname and basic system metadata.
- Interface names, aliases, IPs, and roles.
- VLAN interface extraction.
- Zone membership.
- Address and service objects.
- Basic policy fields.
- NAT marker recognition.
- Static route extraction.

## Out of scope for this parser stage

- VPN semantics.
- SD-WAN behavior.
- UTM profile behavior.
- HA / cluster behavior.
- Live state.

## Ambiguity notes

- Policy semantics may later need schema decisions if the FortiOS parser
  wants richer policy records than the current DeviceModel exposes.
- The VPN and SD-WAN references are comments only, not parser targets.

## Expected parser risks

- FortiOS uses nested `config` / `edit` / `next` / `end` structure, so
  the parser should preserve block context correctly.
- Zone names and interface names are separate concepts.
- NAT is marked by policy flags here, not by live packet behavior.

