# Fortinet FortiOS syntax notes

These notes capture the syntax patterns represented in the current
FortiOS baseline batch.

## System / global

- `fortios-system-interface-zone-001.cfg / config system global`
- `fortios-routing-objects-002.cfg / config system global`
- `fortios-vpn-sdwan-notes-003.cfg / config system global`

Observed patterns:

- `set hostname "..."`.
- `set admintimeout N`.
- `set timezone N`.

## Interface blocks

- `fortios-system-interface-zone-001.cfg / config system interface`
- `fortios-routing-objects-002.cfg / config system interface`
- `fortios-vpn-sdwan-notes-003.cfg / config system interface`

Observed patterns:

- `edit "portN"`.
- `edit "VLAN10"`.
- `set interface "portX"` for VLAN interfaces.
- `set vlanid N`.
- `set ip A.B.C.D MASK`.
- `set allowaccess ...`.
- `set role wan|lan`.
- `set alias "..."`.

## Zones

- `fortios-system-interface-zone-001.cfg / config system zone`
- `fortios-routing-objects-002.cfg / config system zone`
- `fortios-vpn-sdwan-notes-003.cfg / config system zone`

Observed pattern:

- `set interface "port1" "VLAN10"` or similar membership lists.

## Firewall address / service objects

- `fortios-system-interface-zone-001.cfg / config firewall address`
- `fortios-routing-objects-002.cfg / config firewall address`
- `fortios-vpn-sdwan-notes-003.cfg / config firewall address`
- `fortios-system-interface-zone-001.cfg / config firewall service custom`
- `fortios-routing-objects-002.cfg / config firewall service custom`
- `fortios-vpn-sdwan-notes-003.cfg / config firewall service custom`

Observed patterns:

- `set subnet A.B.C.D MASK`.
- `set tcp-portrange 443`.
- `set udp-portrange 53`.
- `set tcp-portrange 8080-8081`.

## Firewall policies

- `fortios-system-interface-zone-001.cfg / config firewall policy`
- `fortios-routing-objects-002.cfg / config firewall policy`
- `fortios-vpn-sdwan-notes-003.cfg / config firewall policy`

Observed patterns:

- `set srcintf "ZONE"`.
- `set dstintf "ZONE"`.
- `set srcaddr "NAME"`.
- `set dstaddr "all"` or named objects.
- `set service "NAME" "NAME"`.
- `set action accept`.
- `set schedule "always"`.
- `set nat enable`.
- `set ippool enable`.
- `set poolname "POOL-NAME"`.
- `set logtraffic all`.

## Static routes

- `fortios-system-interface-zone-001.cfg / config router static`
- `fortios-routing-objects-002.cfg / config router static`
- `fortios-vpn-sdwan-notes-003.cfg / config router static`

Observed patterns:

- `set dst 0.0.0.0/0`.
- `set gateway 198.51.100.1`.
- `set device "port1"`.
- `set distance 10`.

## NAT markers

- `fortios-system-interface-zone-001.cfg / config firewall policy`
- `fortios-routing-objects-002.cfg / config firewall ippool`
- `fortios-vpn-sdwan-notes-003.cfg / config firewall ippool`

Observed patterns:

- `set nat enable`.
- `config firewall ippool` with overload pool fields.
- `set ippool enable`.

## Note-only VPN / SD-WAN hints

- `fortios-system-interface-zone-001.cfg`
- `fortios-routing-objects-002.cfg`
- `fortios-vpn-sdwan-notes-003.cfg`

Observed pattern:

- Comment-only hints for future `config vpn ipsec phase1-interface`,
  `config vpn ipsec phase2-interface`, and `config system sdwan` work.

