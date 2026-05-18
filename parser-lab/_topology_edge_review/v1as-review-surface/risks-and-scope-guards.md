# Risks and Scope Guards

- The exact resolver must remain exact: hostname or record_id only.
- No fuzzy matching, no substring matching, no management IP fallback, no chassis ID fallback, no interface-description promotion, and no subnet or VLAN inference.
- V1AR evidence store truth remains authoritative.
- No Rust truth mutation, no parser changes, no DeviceModel changes, and no validator or rule-pack changes.
- No live SSH, no SNMP, no polling daemon, and no graph renderer.
- Graph-ready data is allowed only as display contract data.
- Hidden store mutation is out of scope.
- Invented edges are out of scope.
- Future OCC may consume the review surface, but only after the stage is explicitly approved.
