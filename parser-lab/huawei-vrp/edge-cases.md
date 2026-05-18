# Huawei VRP edge cases

The current baseline intentionally includes a few later-stage parser
risks.

## `undo shutdown` as the explicit up-state

- `huawei-vrp-system-l2-001.cfg`
- `huawei-vrp-vlan-trunk-edge-002.cfg`
- `huawei-vrp-system-note-rich-003.cfg`

Huawei VRP often uses `undo shutdown` rather than `no shutdown`, so the
parser needs to normalize that to an up/admin-enabled state without
losing the original signal.

## VLAN ranges and mixed lists

- `huawei-vrp-system-l2-001.cfg`
- `huawei-vrp-vlan-trunk-edge-002.cfg`
- `huawei-vrp-system-note-rich-003.cfg`

The trunk allow-pass syntax mixes discrete VLANs and ranges.

## Access versus trunk versus routed interfaces

- `huawei-vrp-system-l2-001.cfg`
- `huawei-vrp-vlan-trunk-edge-002.cfg`
- `huawei-vrp-system-note-rich-003.cfg`

The parser should keep L2 and routed interfaces separate rather than
inferring a stronger model from one line.

## SVI variants

- `huawei-vrp-system-l2-001.cfg`
- `huawei-vrp-vlan-trunk-edge-002.cfg`
- `huawei-vrp-system-note-rich-003.cfg`

`VlanifN` records may be up, down, or present without additional
signals.

## Dot1q subinterface note

- `huawei-vrp-vlan-trunk-edge-002.cfg`

The subinterface is there to keep edge-case syntax visible, but the
first baseline should still stay conservative about what it extracts.

## Lines to ignore for this stage

- `stp edged-port enable`
- note-only ACL markers
- note-only NAT markers
- note-only QoS markers
- note-only AAA markers
- note-only VPN markers

These may matter later, but they do not need to drive the first
parser-prep baseline.

