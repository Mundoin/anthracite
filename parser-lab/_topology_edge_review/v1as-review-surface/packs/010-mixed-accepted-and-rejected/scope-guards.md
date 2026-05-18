# Scope Guards

- Prep-only corpus; not integrated.
- Exact resolver stays exact: hostname or record_id only.
- No fuzzy matching, substring matching, management IP fallback, chassis ID fallback, interface-description promotion, or subnet/VLAN inference.
- V1AR evidence store remains authoritative.
- No Rust truth mutation, parser changes, DeviceModel changes, validator or rule-pack changes, live SSH, SNMP, polling, or graph renderer.
- Display-only graph-ready data may be consumed later, but no renderer, layout engine, coordinates, physics, or animation are introduced here.
- Do not hide rejected evidence when an accepted edge exists.
