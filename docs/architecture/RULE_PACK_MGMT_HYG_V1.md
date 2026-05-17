# Rule Pack — MGMT-HYG v1

> **Pack version update:** As of V1Z-A, `rule_pack_version` is **3**.
> V1U bumped to 2 (DIAG-HYG-001..003 in
> [`RULE_PACK_DIAG_HYG_V1.md`](./RULE_PACK_DIAG_HYG_V1.md)). V1Z-A
> bumps to 3 by landing MGMT-HYG-004 (Telnet enabled) — every parser
> now emits `ServiceKind::Telnet` — and DIAG-HYG-004 (NTP service
> without server).

Status: **Locked at V1P; extended at V1Z-A.** The first rule pack
shipped by the Validator Engine. Four rules; MGMT-HYG-004 lands at
V1Z-A now that Telnet emission is uniform across cisco-iosxe,
cisco-nxos, juniper-junos, and arista-eos.

Pair docs:
- [`VALIDATOR_ENGINE_CONTRACT.md`](./VALIDATOR_ENGINE_CONTRACT.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)

`rule_pack_version`: **1**
`validator_version`: **1**

---

## MGMT-HYG-001 — Default or well-known SNMP community present

| | |
|---|---|
| ID | `MGMT-HYG-001` |
| rule_version | 1 |
| area | `services_snmp` |
| severity | **High** |
| signal | Hard |
| title | Default or well-known SNMP community present |

**What it flags:** any `ServiceModel { kind: Snmp }` (non-trap)
that carries a community in the locked default list
(case-insensitive):

```
public, private, cisco, admin
```

**Model paths read:**
- `device.services[i].kind`
- `device.services[i].notes` → parsed via `service_notes::extract_service_facts`
- `device.parse_confidence.warnings` (for `not_in_scope:services_snmp`)

**Skip path:** when the parser declared `services_snmp`
out-of-scope, the rule returns
`RuleOutcome::Skipped(SkipReason::AreaNotInScope)`.

**Multiple defaults:** if a single Snmp service lists more than
one default community (e.g. `communities=public,private`), the
rule emits one finding per match, each with a distinct
`finding_key`.

**finding_key:**
```
MGMT-HYG-001:services_snmp:services[{i}]:community={lowercased_community}
```

**Recommendation:**
> Replace default community with a strong unique value.

**Fixture:**
`src-tauri/tests/fixtures/validator/mgmt-hyg-001-default-community/`
— cisco-iosxe config with `snmp-server community public RO`.

---

## MGMT-HYG-002 — SNMP community-based access configured

| | |
|---|---|
| ID | `MGMT-HYG-002` |
| rule_version | 1 |
| area | `services_snmp` |
| severity | **Medium** |
| signal | Hard |
| title | SNMP community-based access configured |

**What it flags:** any `ServiceModel { kind: Snmp }` (non-trap)
with one or more communities present. Emits **one** finding per
device, not one per community.

**Honest wording (binding):** today no parser populates
`ServiceModel.authentication_mode` for SNMPv3. Community
presence is the only deterministic signal of v1/v2c-style
access. The recommendation reflects the migration target but
the evaluator is **"any SNMP communities present"**, not
"SNMPv3 is absent". Refinement comes when v3 detection is
added; the rule's `rule_version` and `RULE_PACK_VERSION` will
bump together at that point.

This rule will fire on most real-world configs. That is correct.
V1P does not pretend to know more about SNMPv3 than the parsers
emit.

**Model paths read:**
- `device.services[i].kind`
- `device.services[i].notes` → parsed via `service_notes`
- `device.parse_confidence.warnings`

**Skip path:** `not_in_scope:services_snmp`.

**finding_key (constant per device):**
```
MGMT-HYG-002:services_snmp:configured
```

**Recommendation:**
> Migrate to SNMPv3 with strong authentication and privacy.

**Fixture:**
`src-tauri/tests/fixtures/validator/mgmt-hyg-002-snmp-communities/`
— cisco-iosxe config with `snmp-server community CompanyX-RO RO`
(NOT a default community → MGMT-HYG-001 is Clean,
MGMT-HYG-002 fires).

---

## MGMT-HYG-003 — SSH service not configured

| | |
|---|---|
| ID | `MGMT-HYG-003` |
| rule_version | 1 |
| area | `services_ssh` |
| severity | **Medium** |
| signal | Hard |
| title | SSH service not configured |

**What it flags:** no `ServiceModel { kind: Ssh }` exists on the
device.

**Model paths read:**
- `device.services[i].kind`
- `device.parse_confidence.warnings`

**Skip path:** `not_in_scope:services_ssh`.

**Clean path:** any Ssh service record present.

**Trigger:** no Ssh service present (and area in scope).

**finding_key (constant):**
```
MGMT-HYG-003:services_ssh:absent
```

**Recommendation:**
> Enable SSH for secure management access.

**Fixture:**
`src-tauri/tests/fixtures/validator/mgmt-hyg-003-no-ssh/` —
cisco-iosxe config with hostname but no `ip ssh` lines.

---

## Clean-baseline fixture

`src-tauri/tests/fixtures/validator/clean-baseline/` — cisco-iosxe
config with SSH enabled (`ip ssh version 2`) and no SNMP, no
Telnet. Expected report: **0 findings**, all three rules in
`clean_rules`.

---

## MGMT-HYG-004 — Telnet service enabled (V1Z-A)

| | |
|---|---|
| ID | `MGMT-HYG-004` |
| rule_version | 1 |
| area | `services_telnet` |
| severity | **High** |
| signal | Hard |
| title | Telnet service enabled |
| recommendation | Disable Telnet; enforce SSH-only management access. |
| finding_key | `MGMT-HYG-004:services_telnet:services[{i}]:enabled` |

Triggers when at least one `ServiceModel` with
`kind == ServiceKind::Telnet` is present on the model. Clean when
no Telnet service exists. Skipped when the parser declared
`services_telnet` out-of-scope.

V1Z-A wired Telnet emission across all four parsers:

- **cisco-iosxe** — `line vty …` block with `transport input` listing
  `telnet` or `all`.
- **cisco-nxos** — `feature telnet` (cleared by `no feature telnet`).
- **juniper-junos** — `set system services telnet` (and the
  brace-form equivalent — both converge through the same path
  dispatch).
- **arista-eos** — top-level `management telnet` block.

Severity is fixed at High; V1Z-A cannot prove reachability or ACL
exposure, but Telnet is plaintext management access. The
recommendation is unconditional: disable Telnet, enforce SSH-only.

Validator fixture:
`src-tauri/tests/fixtures/validator/mgmt-hyg-004-telnet-enabled/`.

---

## Pack-level rules

- V1P shipped MGMT-HYG-001..003 at `rule_pack_version: 1`.
  V1U added DIAG-HYG-001..003, bumping to `2`. V1Z-A lands
  MGMT-HYG-004 + DIAG-HYG-004, bumping to `3`.
- Every rule's `rule_version` is currently **1**.
- Adding a new rule bumps `RULE_PACK_VERSION` only.
- Changing any rule's evaluator behavior bumps that rule's
  `rule_version` AND `RULE_PACK_VERSION` together.
- Removing a rule requires a stage that documents the removal
  rationale and updates the version guard.
