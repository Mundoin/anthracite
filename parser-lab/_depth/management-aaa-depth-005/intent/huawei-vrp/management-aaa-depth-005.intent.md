# huawei-vrp management-aaa-depth-005 intent

## Extraction expectations

- Stelnet / SSH enablement.
- SNMP community.
- NTP server.
- AAA local-user and VTY authentication.

## Conservative areas

- Keep `aaa` and `user-interface` contexts explicit.
- Do not infer firewall or routing semantics from management settings.

