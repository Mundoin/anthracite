# Nokia SR OS edge cases

The current baseline intentionally includes a few later-stage parser
risks.

## Service-based VLAN/L2 syntax

- `sros-vlan-l2-native-002.cfg`

VLAN/L2 is represented with service constructs and SAPs, not a flat
switchport model.

## Native / untagged SAP

- `sros-vlan-l2-native-002.cfg`

`sap 1/1/3 create` is used as the native-style case in this synthetic
baseline.

## Router Base versus system context

- `sros-system-routed-001.cfg`
- `sros-note-rich-003.cfg`

System configuration and router interfaces should remain separate in the
parsed output.

## Comment-only policy and security markers

- `sros-system-routed-001.cfg`
- `sros-vlan-l2-native-002.cfg`
- `sros-note-rich-003.cfg`

These lines are intentionally comments only and should stay out of the
first parser pass.

## Lines to ignore for this stage

- comment-only ACL markers
- comment-only NAT markers
- comment-only QoS markers
- comment-only AAA markers
- comment-only security markers
- comment-only routing markers

These may matter later, but they do not need to drive the first
parser-prep baseline.

