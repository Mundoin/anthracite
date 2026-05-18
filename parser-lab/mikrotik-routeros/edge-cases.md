# MikroTik RouterOS edge cases

The current baseline intentionally includes a few later-stage parser
risks.

## Renames and `find` selectors in the same line

- `routeros-system-interface-001.cfg`
- `routeros-vlan-bridge-002.cfg`
- `routeros-note-rich-003.cfg`

The parser should keep interface renames associated with the physical
interface they target.

## Bridge plus routed interface on the same device

- `routeros-system-interface-001.cfg`
- `routeros-vlan-bridge-002.cfg`
- `routeros-note-rich-003.cfg`

RouterOS often mixes bridging and routing on the same box, so the
parser should not assume one mode excludes the other.

## VLAN filtering and tagged membership

- `routeros-vlan-bridge-002.cfg`

`bridge vlan` can list the bridge itself as a tagged member and still be
syntactically normal.

## Access port PVID and trunk tagging

- `routeros-vlan-bridge-002.cfg`

PVID and tagged membership should remain distinct.

## Note-only policy and security markers

- `routeros-system-interface-001.cfg`
- `routeros-vlan-bridge-002.cfg`
- `routeros-note-rich-003.cfg`

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

