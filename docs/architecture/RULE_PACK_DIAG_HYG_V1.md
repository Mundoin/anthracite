# Rule Pack — DIAG-HYG v1

Status: **Locked at V1U; extended at V1Z-A.** Second rule pack
shipped by the Validator Engine. Four vendor-neutral diagnostic
hygiene rules targeting services that every managed network device
should configure. DIAG-HYG-004 (NTP service configured without
server) lands at V1Z-A once the Junos `NtpAccum` is aligned with
NX-OS / EOS — see clause below.

Pair docs:
- [`VALIDATOR_ENGINE_CONTRACT.md`](./VALIDATOR_ENGINE_CONTRACT.md)
- [`RULE_PACK_MGMT_HYG_V1.md`](./RULE_PACK_MGMT_HYG_V1.md) — first pack (MGMT-HYG)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)

`rule_pack_version`: **3** (shared with MGMT-HYG; the pack version is
global to the engine, not per-rule-family)
`validator_version`: **1** (unchanged — engine shape frozen)

---

## Rules

### DIAG-HYG-001 — NTP service not configured

| Field | Value |
|---|---|
| id | `DIAG-HYG-001` |
| rule_version | 1 |
| area | `services_ntp` |
| default_severity | Medium |
| signal | Hard |
| title | "NTP service not configured" |
| recommendation | "Configure NTP for time synchronisation and accurate audit logs." |

**Evaluate:**

1. If `area_not_in_scope(model, "services_ntp")` → `Skipped(AreaNotInScope)`.
2. If any service has `kind == ServiceKind::Ntp` → `Clean`.
3. Otherwise → `Triggered` with one Finding:
   - `finding_key`: `"DIAG-HYG-001:services_ntp:absent"`
   - `evidence`: `[{ kind: ModelPath, model_path: "services", note: "ntp_service=absent" }]`
   - `affected_area`: `"services_ntp"`

**Rationale:** Unsynchronised clocks corrupt audit-log timestamps and
invalidate time-based security policies (certificate validity, log
correlation). Every managed device must reference an NTP source.

---

### DIAG-HYG-002 — Syslog service not configured

| Field | Value |
|---|---|
| id | `DIAG-HYG-002` |
| rule_version | 1 |
| area | `services_syslog` |
| default_severity | Medium |
| signal | Hard |
| title | "Syslog service not configured" |
| recommendation | "Configure remote syslog for forensic timestamps and audit trail." |

**Evaluate:** Same shape as DIAG-HYG-001.

1. `area_not_in_scope` check → `Skipped(AreaNotInScope)`.
2. Any `ServiceKind::Syslog` → `Clean`.
3. Otherwise → `Triggered`:
   - `finding_key`: `"DIAG-HYG-002:services_syslog:absent"`
   - `note`: `"syslog_service=absent"`

**Rationale:** Without remote syslog, device logs are lost on reboot
or if storage fills. Forensic reconstruction after an incident becomes
impossible. Remote syslog is a baseline hygiene requirement.

---

### DIAG-HYG-003 — DNS resolution not configured

| Field | Value |
|---|---|
| id | `DIAG-HYG-003` |
| rule_version | 1 |
| area | `services_dns` |
| default_severity | Low |
| signal | Hard |
| title | "DNS resolution not configured" |
| recommendation | "Configure DNS resolvers for hostname-based operations." |

**Evaluate:** Same shape.

1. `area_not_in_scope` check → `Skipped(AreaNotInScope)`.
2. Any `ServiceKind::Dns` → `Clean`.
3. Otherwise → `Triggered`:
   - `finding_key`: `"DIAG-HYG-003:services_dns:absent"`
   - `note`: `"dns_service=absent"`

**Rationale:** Without DNS, hostname-based logging targets, NTP peers,
and syslog destinations degrade to IP-only. Low severity because it is
functional but increases operational friction.

---

## DIAG-HYG-004 — NTP service configured without server (V1Z-A)

| | |
|---|---|
| ID | `DIAG-HYG-004` |
| rule_version | 1 |
| area | `services_ntp` |
| severity | **Medium** |
| signal | Hard |
| title | NTP service configured without server |
| recommendation | Add at least one NTP server or peer; without a peer the device cannot synchronise time. |
| finding_key | `DIAG-HYG-004:services_ntp:services[{i}]:server_list_empty` |

Triggers when an NTP `ServiceModel` exists with an empty `servers`
list. Clean when every NTP service has at least one server.
**Skipped with `InsufficientData`** when no NTP service exists at
all — DIAG-HYG-001 owns the absence case; DIAG-HYG-004 covers the
"configured but unusable" case. Skipped with `AreaNotInScope` when
the parser declared `services_ntp` out-of-scope.

**NTP server-list parity (verified before V1Z-A):** all four parsers
populate `ServiceModel.servers` from `ntp server` (and equivalent)
lines. PK during V1Z-A surfaced one divergence: Junos `NtpAccum.build`
previously returned `None` when `servers` was empty, so a Junos config
carrying only `set system services ntp source-address …` emitted no
NTP service at all. V1Z-A aligned Junos with NX-OS / EOS — the
`NtpAccum` now emits when either `servers` is non-empty OR
`source_interface` is set — so DIAG-HYG-004 fires consistently across
all four parsers.

Validator fixture:
`src-tauri/tests/fixtures/validator/diag-hyg-004-ntp-no-server/`.

---

## Pack-level rules

These apply to all DIAG-HYG rules regardless of rule_version:

- **rule_version bump policy:** If a rule's `evaluate()` changes
  output on any existing fixture (finding_key, severity, evidence),
  bump that rule's `rule_version` AND `RULE_PACK_VERSION`. Never one
  without the other.
- **Removal policy:** Rules are never removed. A rule whose condition
  can no longer be checked (e.g., parser no longer emits the required
  field) is retired to `Skipped(InsufficientData)` by adding a parser
  check before the main evaluate logic. The `rule_id` remains in the
  registry.
- **Vendor neutrality:** DIAG-HYG rules read `ServiceKind` and
  `parse_confidence.warnings` only. No `platform_id` branching in
  any evaluator.
- **No model mutation:** Rules take `&DeviceModel`. The validator
  never writes to `DeviceModel.findings`.
