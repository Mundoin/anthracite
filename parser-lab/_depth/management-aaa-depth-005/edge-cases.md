# management-aaa-depth-005 edge cases

- SSH may be enabled via a service knob or via a broader security block.
- SNMP community syntax varies sharply by vendor.
- NTP may be a client, server, or service block depending on platform.
- AAA may be represented by username objects, authentication schemes,
  or local user groups.
- RouterOS uses separate service and user command families.
- FortiOS management access can be split across system global and admin
  objects.
- Note-only ACL / NAT / QoS / security / routing lines should stay
  conservative.

