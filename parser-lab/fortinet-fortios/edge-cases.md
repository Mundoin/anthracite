# Fortinet FortiOS edge cases

The current baseline intentionally includes a few later-stage parser
risks.

## Nested config / edit / next / end blocks

- `fortios-system-interface-zone-001.cfg`
- `fortios-routing-objects-002.cfg`
- `fortios-vpn-sdwan-notes-003.cfg`

The parser needs to preserve the block stack correctly so an object in
`config firewall policy` does not get confused with one in `config system
interface`.

## VLAN interfaces on a physical parent

- `fortios-system-interface-zone-001.cfg`
- `fortios-routing-objects-002.cfg`
- `fortios-vpn-sdwan-notes-003.cfg`

FortiOS VLAN interfaces carry both the parent port and the VLAN ID.

## Zones versus interfaces

- `fortios-system-interface-zone-001.cfg`
- `fortios-routing-objects-002.cfg`
- `fortios-vpn-sdwan-notes-003.cfg`

Zones are membership containers, not physical interfaces.

## NAT marker forms

- `fortios-system-interface-zone-001.cfg`
- `fortios-routing-objects-002.cfg`
- `fortios-vpn-sdwan-notes-003.cfg`

NAT may show up as policy flags and as IP pool definitions; the parser
should not invent live behavior from those lines.

## Firewall object ordering

- `fortios-system-interface-zone-001.cfg`
- `fortios-routing-objects-002.cfg`
- `fortios-vpn-sdwan-notes-003.cfg`

Address and service objects may appear before or after the policies that
reference them.

## Comment-only VPN / SD-WAN hints

- `fortios-system-interface-zone-001.cfg`
- `fortios-routing-objects-002.cfg`
- `fortios-vpn-sdwan-notes-003.cfg`

These comments are intentional prep markers and should stay out of scope
for the first baseline stage.

## Lines to ignore for this stage

- `set gui-theme ...`
- `set admintimeout ...`
- `set role ...`
- `set mtu-override enable`
- `set logtraffic all`
- comment-only VPN / SD-WAN notes

These may matter later, but they do not need to drive the first
parser-prep baseline.

