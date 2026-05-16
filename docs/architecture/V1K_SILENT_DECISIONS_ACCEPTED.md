# V1K silent decisions — accepted

**Stage of origin:** V1K — Cisco IOS / IOS XE parser (L1 + L2).
**Decided in stage:** V1L.
**Recorded by:** Claude (Architect), accepted by Bujar.

V1K shipped the first parser. Five non-trivial encoding choices were made
silently to stay inside V1K's editing scope. This note ratifies them as
the V1L-and-onward contract. Anything not listed here remains open.

---

## 1. Service attributes packed into `notes`

**Status:** accepted. No `ServiceModel` schema addendum scheduled.

`ServiceModel` only carries `kind / servers / source_interface / vrf /
authentication_mode / notes`. Multi-attribute services pack scalars into
`notes` as a deterministic `key=value;key=value;…` string. Encoded keys
are stable across parser versions.

SNMP communities and trap hosts are emitted as **two distinct**
`ServiceModel { kind: Snmp }` records, differentiated by their `notes`
key. This duplication is intentional and is part of the V1L contract.

A later stage may introduce a `ServiceModel::v2` shape with typed
sub-attributes. That migration is out of scope for V1L.

---

## 2. `ip default-gateway` is a parsed acknowledgement only

**Status:** accepted.

`ip default-gateway X.X.X.X` increments `parsed_line_count` and is
otherwise discarded. Management IPs come from the IPv4 addresses on
interfaces classified as `InterfaceKind::Management`. Two reasons:

- `ip default-gateway` is a host-style gateway record, not a management
  address. Promoting it to `management_ips` would mix two distinct
  concepts.
- Cisco devices that need a real management address always put one on a
  `Management*` (or equivalent) interface. The interface-driven path is
  the canonical one.

---

## 3. `exec-timeout` fills SSH idle-timeout only when `ip ssh time-out` absent

**Status:** accepted.

Inside `line vty N M`, `exec-timeout MIN SEC` is converted to seconds.
The result is written to `ssh.idle_timeout_seconds` only if no prior
`ip ssh time-out` value has been recorded. This breaks the
last-write-wins ambiguity that would otherwise make idle-timeout depend
on config ordering across two unrelated top-level commands.

`ip ssh time-out` always wins. `exec-timeout` is a fallback.

---

## 4. `service timestamps …` lines remain unknown evidence

**Status:** accepted.

V1L does not parse `service timestamps`. These lines land in
`unknown_lines[]` with their `context_path` and the default unknown
reason. Captured for evidence, not interpreted. Promotion is a
later-stage concern.

---

## 5. SSH idle-timeout unit is seconds

**Status:** accepted.

`ssh.idle_timeout_seconds` is the canonical field. `ip ssh time-out N`
records `N` directly (Cisco's unit is already seconds). `exec-timeout
MIN SEC` converts to seconds before being written. Downstream consumers
may assume seconds without further interpretation.

---

## V1L addendum (the one model change)

V1L additionally adds `UnknownReason::UnrecognizedInterfaceForm` to
`network_model.rs` and bumps `cisco_iosxe::PARSER_VERSION` from 1 to 2.
This is the only schema-level change unlocked by accepting the above
decisions; everything else stays inside the V1K contract.

---

## Cross-references

- [V1K stage note §Silent decisions](../../obsidian/stages/V1K-cisco-iosxe-parser.md)
- [V1K binding spec](../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md)
- [CANONICAL_NETWORK_MODEL.md](CANONICAL_NETWORK_MODEL.md)
- [PARSER_VERSIONING.md](PARSER_VERSIONING.md)
