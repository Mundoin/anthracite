# Rule Pack — DIAG-HYG v1

Status: **Locked at V1U.** Second rule pack shipped by the Validator
Engine. Three vendor-neutral diagnostic hygiene rules targeting
services that every managed network device should configure.
DIAG-HYG-004 (NTP-without-server) is deferred — see §"Deferred".

Pair docs:
- [`VALIDATOR_ENGINE_CONTRACT.md`](./VALIDATOR_ENGINE_CONTRACT.md)
- [`RULE_PACK_MGMT_HYG_V1.md`](./RULE_PACK_MGMT_HYG_V1.md) — first pack (MGMT-HYG)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)

`rule_pack_version`: **2** (shared with MGMT-HYG; the pack version is
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

## Deferred

### DIAG-HYG-004 — NTP server list not populated

**Planned shape:** Triggered when `services_ntp` is in scope and an
NTP service is present but the `servers` list is empty (i.e., the
`ntp` stanza exists but no peer/server address is configured).

**Reason for deferral:** NTP notes encoding parity is not pinned across
all four parsers. The V1P service-notes extractor was authored against
SNMP and SSH note strings; NTP server-list encoding via `servers` vec
(not notes string) requires verification that all four parsers (IOS-XE,
Junos, EOS, NX-OS) emit a non-empty `servers` vec when an NTP server
is configured and an empty vec when only the `ntp` keyword appears with
no server address. Until NX-OS's `services.rs` (V1U-B) lands and the
four-parser canonical consistency test covers NTP server lists, the
rule risks false positives.

**Gating stage:** V1V or later — when `cisco_nxos::services::NtpAccum`
is stable and the cross-vendor invariant test covers NTP server lists
across all four parsers. Only then is DIAG-HYG-004 safe to author.

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
