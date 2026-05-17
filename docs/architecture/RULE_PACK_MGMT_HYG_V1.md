# Rule Pack — MGMT-HYG v1

Status: **Locked at V1P.** The first rule pack shipped by the
Validator Engine. Three rules; one is intentionally honest about
a current parser limitation. MGMT-HYG-004 (Telnet enabled) is
deferred to a follow-up stage — see §"Deferred" below.

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

## Deferred

### MGMT-HYG-004 — Telnet service enabled

**Status:** deferred (not in V1P). Discovery: no current parser
(V1K cisco-iosxe, V1M juniper-junos, V1N arista-eos) emits
`ServiceKind::Telnet`. Adding the rule today would either:

- require a parser edit to emit `ServiceKind::Telnet` (forbidden
  by the V1P prompt §4 HALT files), or
- ship a rule that can never fire (dishonest UX).

V1P narrowed to three rules per the prompt's §6.5 fallback
clause. MGMT-HYG-004 lands in a follow-up stage that bumps the
relevant parser to emit Telnet, then adds the rule with
`rule_version: 1` and bumps `RULE_PACK_VERSION` to 2.

Planned shape:

```
ID:                MGMT-HYG-004
area:              services_telnet  (validator-emitted; not a
                                     parser in_scope area)
severity:          High
signal:            Hard
title:             Telnet service enabled
recommendation:    Disable Telnet. Use SSH for management access.
finding_key:       MGMT-HYG-004:services_telnet:services[{i}]
```

---

## Pack-level rules

- Every rule version is currently **1**. Pack version is **1**.
- Adding a new rule to v1 is **not** a patch — it bumps
  `RULE_PACK_VERSION` to 2.
- Changing any rule's evaluator behavior bumps that rule's
  `rule_version` AND `RULE_PACK_VERSION` together.
- Removing a rule requires a stage that documents the removal
  rationale and updates the version guard.
