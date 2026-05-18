# cisco-iosxe management-aaa-depth-005 intent

## Extraction expectations

- SSH service enabled.
- Local AAA model and username.
- SNMP, NTP, and logging hints.
- VTY transport restriction to SSH.

## Conservative areas

- Do not infer policy beyond the explicit service lines.
- Keep AAA and management-plane fields distinct.

