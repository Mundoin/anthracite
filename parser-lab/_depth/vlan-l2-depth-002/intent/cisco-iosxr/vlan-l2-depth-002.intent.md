# cisco-iosxr vlan-l2-depth-002 intent

## Extraction expectations

- L2 transport subinterfaces `...2.100` and `...2.200`.
- Dot1q encapsulation including native form.
- `BVI100` as routed termination.

## Conservative areas

- `rewrite ingress` is an L2 marker, not a new behavioral model.
- Keep bridge-domain representation conservative.

