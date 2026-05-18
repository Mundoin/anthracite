# Cisco IOS-XE edge cases

The current batch intentionally includes a few later-stage parser risks.

## Parent interface with no IP but subinterfaces with IPs

- `iosxe-subinterface-dot1q-002.cfg`

The physical parent exists only as a carrier. The IPv4 addresses live on
the subinterfaces.

## Native VLAN subinterface

- `iosxe-subinterface-dot1q-002.cfg`

`encapsulation dot1Q 999 native` should be recognized as a special case,
not flattened into a normal tagged subinterface.

## Trunk allowed VLAN ranges

- `iosxe-interface-depth-001.cfg`
- `iosxe-portchannel-vlan-003.cfg`

The parser prep should expect comma lists today and range-normalized
lists later.

## Port-channel vs member interfaces

- `iosxe-portchannel-vlan-003.cfg`

Membership is declared on the member interfaces with `channel-group`.
The logical `Port-channel10` is the aggregation record, not the member
link list by itself.

## Shutdown inherited vs explicit no shutdown

- `iosxe-interface-depth-001.cfg`
- `iosxe-subinterface-dot1q-002.cfg`
- `iosxe-portchannel-vlan-003.cfg`

The configs mix explicit `shutdown`, explicit `no shutdown`, and
interfaces that may later be treated as implicitly up. Keep those states
separate.

## Description punctuation

- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.300`

Descriptions may include commas, slashes, and semicolons. Preserve the
raw text.

## IPv6 optional parsing

- `iosxe-interface-depth-001.cfg`
- `iosxe-subinterface-dot1q-002.cfg`

IPv6 is present in one batch fixture and absent in others. The parser
must not require IPv6 to succeed on the interface record.

## Lines to ignore for this stage

- `version`
- `service timestamps`
- `vlan` definitions
- `service-policy input PREP-QOS-IN`
- `spanning-tree portfast trunk`
- `ip route`
- `ip ssh`
- `ntp server`
- `snmp-server`
- `logging`
- `line vty`

These may matter later, but they do not belong in the first interface-
depth prep stage.

