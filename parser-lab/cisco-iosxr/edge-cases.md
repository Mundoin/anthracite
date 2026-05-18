# Cisco IOS-XR edge cases

The current baseline intentionally includes a few later-stage parser
risks.

## Native dot1q on a subinterface

- `iosxr-vlan-l2-native-002.cfg`

The parser should preserve the difference between a tagged subinterface
and a native subinterface.

## L2 transport plus routed termination

- `iosxr-vlan-l2-native-002.cfg`

The l2transport subinterfaces and the BVI live in the same fixture so
the parser can keep L2 and routed termination distinct.

## IPv4 and IPv6 on the same loopback

- `iosxr-system-routed-001.cfg`

Loopbacks may carry both families and should not be flattened into one
address family.

## Shutdown and no shutdown

- `iosxr-system-routed-001.cfg`
- `iosxr-note-rich-003.cfg`

Explicit shutdown state should remain visible in the parsed output.

## Note-only policy and security markers

- `iosxr-system-routed-001.cfg`
- `iosxr-vlan-l2-native-002.cfg`
- `iosxr-note-rich-003.cfg`

These lines are intentionally comments only and should stay out of the
first parser pass.

## Lines to ignore for this stage

- `rewrite ingress tag pop 1 symmetric`
- comment-only ACL markers
- comment-only NAT markers
- comment-only QoS markers
- comment-only AAA markers
- comment-only security markers
- comment-only routing markers

These may matter later, but they do not need to drive the first
parser-prep baseline.

