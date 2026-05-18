# Stale neighbour intent

## stale-iosxe-001

- Extract the LLDP evidence but reject it because the age is too old.
- Likely future OCC touch points: stale-evidence policy and downgrade logic.
- Stay out of scope: accepting a report just because the fields are complete.
- Ambiguity note: holdtime alone does not guarantee freshness.

## stale-junos-002

- Extract the Junos LLDP evidence but reject or downgrade it because the
  report is too old.
- Likely future OCC touch points: age thresholds and raw evidence retention.
- Stay out of scope: promoting a stale report into a fresh accepted fact.
- Ambiguity note: a complete LLDP report can still be stale.

## stale-eos-003

- Extract the EOS CDP evidence but reject it because the evidence age is too
  old.
- Likely future OCC touch points: age annotation and stale-source handling.
- Stay out of scope: treating age notes as optional.
- Ambiguity note: CDP can be stale even when the device-id looks correct.
