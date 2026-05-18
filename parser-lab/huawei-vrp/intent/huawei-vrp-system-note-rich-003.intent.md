# huawei-vrp-system-note-rich-003.intent

## What this fixture is for

This fixture rounds out the Huawei VRP baseline with more trunk/access
variation, extra static route form, and note-only markers for ACL, NAT,
QoS, AAA, and VPN coverage.

## Devices and interfaces to extract

- The device hostname.
- Physical interfaces `GigabitEthernet0/0/8`, `0/0/9`, and `0/0/10`.
- `Vlanif300` and `Vlanif330`.
- Static routes.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `vlans`
- `static_routes`
- `unknown_lines`
- `parse_confidence`

## In scope for a future parser stage

- Hostname and interface basics.
- Access and trunk L2 configuration.
- SVI extraction.
- Static route extraction.
- Note-only markers for later policy/security prep.

## Out of scope for this parser stage

- ACL semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- VPN behavior.
- Live state.

## Ambiguity notes

- The note-only markers are deliberately non-operative and should remain
  comments for this prep stage.
- One SVI is shut down to keep admin-state handling visible in the
  corpus.

## Expected parser risks

- The parser should not invent ACL or NAT schemas from comments.
- Huawei VRP syntax can vary by product line, so the stage should focus
  on the common forms represented here.

