# Port-channel / LAG neighbour syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/port-channel-lag-neighbour-004.cfg / lag-iosxe-001`
- Observed patterns:
  - `channel-group N mode active`
  - `interface Port-channelN`
  - `switchport mode trunk`
  - `switchport trunk native vlan N`
  - `switchport trunk allowed vlan ...`

## NX-OS

- `snippets/port-channel-lag-neighbour-004.cfg / lag-nxos-002`
- Observed patterns:
  - `feature lacp`
  - `channel-group N mode active`
  - `interface port-channelN`
  - `switchport trunk allowed vlan ...`

## Junos

- `snippets/port-channel-lag-neighbour-004.cfg / lag-junos-003`
- Observed patterns:
  - `gigether-options { 802.3ad aeN; }`
  - `aggregated-ether-options { lacp active; }`
  - `unit 0 { family inet { address ...; } }`

## Conservative note

- Member links are not remote neighbors.
- A bundle interface is a local association and a topology hint only.
- Trunk VLANs and LACP state help rank candidates, but they do not prove an
  edge on their own.
