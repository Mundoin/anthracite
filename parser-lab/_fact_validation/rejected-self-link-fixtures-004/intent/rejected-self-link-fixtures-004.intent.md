# Rejected self-link intent

## self-link-iosxe-001

- Extract the LLDP evidence but reject it because the remote endpoint matches
  the local node.
- Likely future OCC touch points: self-link detection and rejection
  persistence.
- Stay out of scope: promoting the same node as both ends of an edge.
- Ambiguity note: the evidence may look valid until names are normalized.

## self-link-junos-002

- Extract the Junos LLDP evidence but reject it because the port id resolves
  back to the local interface.
- Likely future OCC touch points: local/remote normalization and rejection
  persistence.
- Stay out of scope: accepting loopback-style or self-referential peers.
- Ambiguity note: unit names can hide the self-link until normalized.

## self-link-eos-003

- Extract the EOS CDP evidence but reject it because the device-id resolves to
  the local node.
- Likely future OCC touch points: self-link detection in Cisco/Arista CDP
  evidence.
- Stay out of scope: accepting a device-id that only looks different by case.
- Ambiguity note: CDP can be strong and still be the wrong edge.
