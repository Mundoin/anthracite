# Validator Engine Contract (V1P)

Status: **Locked at V1P.** This document binds the Validator Engine
to its inputs (a parsed `DeviceModel` + a `ValidatorContext`) and
its output (a `ValidationReport`). Any change below requires its
own revision stage and a `VALIDATOR_VERSION` and/or
`RULE_PACK_VERSION` bump.

Pair docs:
- [`RULE_PACK_MGMT_HYG_V1.md`](./RULE_PACK_MGMT_HYG_V1.md) — the
  first rule pack shipped with V1P.
- [`INTAKE_SURFACE_CONTRACT.md`](./INTAKE_SURFACE_CONTRACT.md) —
  the operator surface (FindingsPanel overlay).
- [`ENGINE_PIPELINE_CONTRACT.md`](./ENGINE_PIPELINE_CONTRACT.md) —
  pipeline ordering.
- [`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md)
  — layering rules.
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md) —
  the `DeviceModel` consumed by the validator + the C′ lock.
- [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md) — the
  per-engine version pattern V1P mirrors.

---

## Scope

V1P is the **first stage that answers "what is wrong with this
config?"** It ships:

- a Validator Engine that consumes a `DeviceModel` plus a
  `ValidatorContext`,
- a single rule pack — **MGMT-HYG v1** — with three rules
  (`MGMT-HYG-001`, `MGMT-HYG-002`, `MGMT-HYG-003`),
- a typed Tauri command (`validate_device_model`) and TS API
  wrapper (`validateDeviceModel`),
- a `FindingsPanel` rendered ABOVE `ReceiptDisplay` in the
  single-device intake and drilled-in slice views.

V1P is intentionally narrow:

- **device-local absolute rules only.** No baseline / expected
  state, no rank, no suppression, no visibility policy.
- **deterministic.** No timestamps. No RNG. No HashMap in output
  paths. Same inputs → byte-identical `ValidationReport` JSON.
- **vendor-neutral by construction.** Every rule reads
  `DeviceModel` via the canonical schema; no vendor-aware rules
  in V1P.
- **zero new Rust dependencies.** No hash crate; `finding_key`
  is explicit ASCII.
- **MGMT-HYG-004 (Telnet enabled) is deferred.** No current
  parser emits `ServiceKind::Telnet`; adding the rule would
  require parser edits, which the V1P prompt forbade. Tracked
  as a follow-up stage.

---

## Engine boundary

The Validator Engine:

- **Owns:** rule trait + registration, deterministic ordering,
  `finding_key` collision detection, severity vocabulary, the
  service-notes extractor (Path A — reverses parser-emitted
  notes into structured facts).
- **Does NOT own:** parsing, model population, vendor detection,
  topology synthesis, receipt projection, slice discovery,
  suppression / visibility policy, persistence, export, Cortex.

The flow (binding):

```
DeviceModel (from V1K / V1M / V1N parsers)
  ↓
ValidatorContext (frontend-supplied)
  ↓
validate_device_model(model, context)         ← V1P
  ↓
ValidationReport
  ↓
FindingsPanel (rendered ABOVE ReceiptDisplay)
```

The validator is a **sibling** of the receipt projection, not a
successor. Both consume `DeviceModel` and emit a render-ready
projection; neither edits the other's truth.

---

## C′ lock — DeviceModel.findings is reserved

`DeviceModel.findings` is reserved for future **parser-emitted**
findings. The validator MUST NOT:

- mutate `DeviceModel` (the type signature `&DeviceModel` already
  enforces this at compile time);
- read from `DeviceModel.findings`;
- write to `DeviceModel.findings`.

Validator findings live ONLY in `ValidationReport.findings`.

Enforced by
`src-tauri/tests/validator_does_not_mutate_device_model.rs`,
which walks every committed parser fixture and asserts:

1. `serde_json::to_string(&model)` is byte-identical before and
   after `validate_device(&model, &ctx)`.
2. `model.findings.len() == 0` both before and after.

Adding a parser-emitted finding stream is a separate, deliberate
stage. Even when that stage lands, validator findings remain in
`ValidationReport` — the two streams have different lifecycles
(parser findings are part of parse truth; validator findings are
a sibling projection that can re-run when the rule pack bumps).

See
[`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md) §"C′
— DeviceModel.findings reservation".

---

## Tauri command

```rust
#[tauri::command]
pub fn validate_device_model(
    device_model: DeviceModel,
    context: ValidatorContext,
) -> Result<ValidationReport, String>
```

### Return shape

Mirrors V1O-A / V1O-B discipline:

- `Ok(ValidationReport)` for **all** ordinary outcomes — empty
  device, fully-clean device, mix of triggered + clean + skipped.
- `Err(String)` reserved for future panic-catching boundaries.
  The engine is infallible; this variant exists for parity with
  neighbouring commands.

---

## TypeScript wrapper

```ts
export async function validateDeviceModel(
  deviceModel: DeviceModel,
  context: ValidatorContext,
): Promise<ValidationReport>;
```

`src/types/validator.ts` is the verbatim mirror of
`engines/validator/types.rs`. Every field is `readonly`; vectors
are `ReadonlyArray<T>`.

---

## Wire shape

```rust
pub enum Severity { Info, Low, Medium, High, Critical }
pub enum SignalCategory { Hard, Derived, Heuristic }
pub enum SelectionMode { FromDetection, ManualOverride }
pub enum DetectionSource {
    BestMatch, Tied, Fallback, ManualOverride, NotApplicable,
}
pub enum SourceKind { Paste, File, ArchiveEntry, Slice }
pub enum EvidenceKind { ModelPath, ServiceNoteFact, UnknownLineRef }
pub enum SkipReason { AreaNotInScope, AreaAbsent, InsufficientData }

pub struct SourceContext {
    pub kind: Option<SourceKind>,
    pub label: Option<String>,
    pub archive_name: Option<String>,
    pub slice_id: Option<String>,
}

pub struct ValidatorContext {
    pub platform_id: Option<String>,
    pub parser_id: Option<String>,
    pub parser_version: Option<String>,
    pub selection_mode: SelectionMode,
    pub detection_confidence: Option<f32>,
    pub detection_source: Option<DetectionSource>,
    pub source_context: Option<SourceContext>,
}

pub struct Evidence {
    pub kind: EvidenceKind,
    pub model_path: Option<String>,
    pub line_start: Option<u64>,
    pub line_end: Option<u64>,
    pub raw_excerpt: Option<String>,
    pub note: Option<String>,
}

pub struct SkippedRule {
    pub rule_id: String,
    pub reason: SkipReason,
    pub area: Option<String>,
}

pub struct Finding {
    pub finding_key: String,
    pub rule_id: String,
    pub rule_version: u32,
    pub severity: Severity,
    pub signal: SignalCategory,
    pub title: String,
    pub evidence: Vec<Evidence>,
    pub affected_area: String,
    pub recommendation: Option<String>,
}

pub struct ValidationReport {
    pub validator_version: u32,
    pub rule_pack_version: u32,
    pub context: ValidatorContext,
    pub findings: Vec<Finding>,
    pub clean_rules: Vec<String>,
    pub skipped_rules: Vec<SkippedRule>,
}
```

Tagged unions use `#[serde(rename_all = "snake_case")]`; struct
fields use `#[serde(rename_all = "snake_case")]`. The TS surface
mirrors snake_case for parity with the rest of the wire.

V1P explicitly defers two axes: **confidence** (no per-finding
confidence score yet) and **visibility / suppression** (no
acknowledge / dismiss / mute). When V1Q or later introduces them,
they will be additive: bump `VALIDATOR_VERSION` and add fields.

---

## Rule trait + registration

```rust
pub trait Rule: Send + Sync {
    fn id(&self) -> &'static str;
    fn rule_version(&self) -> u32;
    fn area(&self) -> &'static str;
    fn default_severity(&self) -> Severity;
    fn signal(&self) -> SignalCategory;
    fn title(&self) -> &'static str;
    fn recommendation(&self) -> Option<&'static str>;
    fn evaluate(&self, model: &DeviceModel, ctx: &ValidatorContext) -> RuleOutcome;
}

pub enum RuleOutcome {
    Clean,
    Skipped(SkipReason),
    Triggered(Vec<Finding>),
}
```

Rules are zero-sized unit structs. Registration is a const slice
of `&'static dyn Rule` returned by `registered_rules()` — no
`once_cell`, no `Lazy`, no per-call allocation.

The engine iterates rules in registration order, then applies
the binding ordering rule to the merged `findings` vector
(§"Deterministic ordering" below).

### area scoping

`Rule::area()` returns a stable area string. V1P uses:

- `services_snmp` for MGMT-HYG-001 / MGMT-HYG-002
- `services_ssh` for MGMT-HYG-003

When a parser declares an area out-of-scope via
`DeviceModel.parse_confidence.warnings == ["not_in_scope:{area}", ...]`,
the rule's `evaluate()` returns
`RuleOutcome::Skipped(SkipReason::AreaNotInScope)` and the rule
lands in `skipped_rules` (not `clean_rules`, not `findings`).
This keeps validator output honest about what the parser knew
versus what was declared out of scope.

---

## Service-notes extractor contract (Path A)

The current parsers (V1K / V1M / V1N) pack SNMP and SSH metadata
into a deterministic `key=value;key=value` string on
`ServiceModel.notes`. The validator's
`service_notes::extract_service_facts(&ServiceModel)` reverses
this encoding into a structured `ServiceFacts`:

```rust
pub struct ServiceFacts {
    pub communities: Vec<String>,        // doc-order from communities=
    pub role: Option<ServiceRole>,       // Agent (Cisco role=agent) | TrapHosts
    pub location: Option<String>,        // location=
    pub contact: Option<String>,         // contact=
    pub idle_timeout_seconds: Option<u32>,
    pub ssh_version: Option<String>,
    pub raw_unparsed: Vec<(String, String)>,  // anything not recognized
}
```

Encoding rules the extractor depends on (re-verified against
parser source on 2026-05-17 — see commit history of
`parsers/cisco_iosxe/services.rs`,
`parsers/juniper_junos/services.rs`,
`parsers/arista_eos/services.rs`):

- pair separator: `;`
- key-value separator: `=` (split on **first** `=` only — value
  may contain `=`)
- `communities=` value: comma-separated; preserve doc order; do
  not dedup (parsers already dedup)
- `role=agent` (Cisco) marks community/metadata records
- `role=trap_hosts` (Cisco) OR `kind=trap_hosts` (Junos / EOS)
  marks trap-hosts records
- whitespace inside values is preserved verbatim
- any unrecognized pair pushes to `raw_unparsed` — nothing is
  silently dropped

### Firewall: pinned-strings test

`src-tauri/tests/service_notes_extractor_pinned.rs` pins the
extractor against verbatim strings copied from existing parser
fixtures' `expected.json`. The test file lists the source path
and line number for every pinned string. If a parser ever
changes its notes-encoding shape, the parser fixtures change
too, and this test surfaces the drift loudly — far away from
the rule pack so the failure mode is debuggable.

This couples the validator to parser-emitted notes encoding by
construction. The decoupling — first-class fields on
`ServiceModel` for communities / location / contact / SSH
version — is a future stage and would require either bumping
`PARSER_VERSION` (on the parsers that change their output) or
adding new fields with defaults (additive bump).

---

## finding_key format

`finding_key` is the deterministic identity of a finding. It is
ASCII, explicit, and constructed by the rule. Format convention
(non-binding suggestion, observed across MGMT-HYG-001..003):

```
{RULE_ID}:{area}:{path_or_subject}
```

Examples:

- `MGMT-HYG-001:services_snmp:services[0]:community=public`
- `MGMT-HYG-002:services_snmp:configured`
- `MGMT-HYG-003:services_ssh:absent`

### Collision detection

A `finding_key` collision within a single report is a
**rule-author bug**. The engine detects it after merge:

- In **debug builds** (`cfg(debug_assertions)`): the engine
  panics with the colliding key list.
- In **release builds**: the engine appends a synthetic
  `VALIDATOR-INTERNAL-001` Finding describing the collision
  rather than dropping data, so the operator surface stays
  honest.

Asserted by
`validator_determinism::no_finding_key_collision_in_any_fixture`
and `validator_existing_fixtures_smoke`.

---

## Deterministic ordering

Findings sorted by (binding):

1. **severity DESC** (`Critical` > `High` > `Medium` > `Low` > `Info`)
2. **rule_id ASC**
3. **finding_key ASC**

`clean_rules`: sorted ASC.
`skipped_rules`: sorted by `rule_id` ASC.

Evidence within a Finding is **not sorted** by the engine — the
rule emits evidence in its natural order and is responsible for
its own determinism.

The smoke test
`validator_existing_fixtures_smoke::every_parser_fixture_validates_without_panic_or_drift`
walks every parser fixture and asserts ordering + repeat-run
byte-equality.

---

## Versioning

```rust
pub const VALIDATOR_VERSION: u32 = 1;
pub const RULE_PACK_VERSION: u32 = 1;
```

Plus per-rule `rule_version: u32` declared on each `Rule` impl
(currently 1 for MGMT-HYG-001..003).

### Bump policy

| Change | Bump |
|---|---|
| Internal refactor preserving output bytes | none |
| Comment / test-only changes | none |
| Rule's evaluator changes behavior on any fixture | rule's `rule_version` AND `RULE_PACK_VERSION` |
| Add a new rule to the pack | `RULE_PACK_VERSION` |
| Add a new field to any wire type | `VALIDATOR_VERSION` |
| Change ordering rule | `VALIDATOR_VERSION` |
| Change `finding_key` format | `VALIDATOR_VERSION` AND `RULE_PACK_VERSION` |

### CI enforcement

Three artefacts must agree at all times (enforced by
`tests/validator_version_guard.rs`):

1. `engines::validator::VALIDATOR_VERSION` Rust constant
2. `engines::validator::RULE_PACK_VERSION` Rust constant
3. `tests/fixtures/validator/_manifest.toml::{validator_version,
   rule_pack_version}`
4. on-disk fixture directories listed in `_manifest.toml::fixtures`

The corpus harness
`tests/validator_corpus.rs::every_fixture_validates_to_expected`
additionally enforces byte-equality of validator output against
every committed `expected_report.json`. Any drift fails CI.

This guard is intentionally separate from
`parser_version_guard.rs`, `config_splitter_version_guard.rs`,
and `archive_intake_version_guard.rs`. Each engine evolves
independently.

---

## Vendor-neutrality boundary

V1P ships **zero vendor-aware rules**. Every rule reads
`DeviceModel` via canonical fields and structural patterns; no
rule branches on `device.platform.vendor` or `os_family`.

Vendor-aware rules (e.g. "Cisco IOS-XE `ip ssh server` is
disabled when …") would belong to a future rule pack with its
own ID prefix (e.g. `CISCO-IOS-NN`). When added, they would
read `ctx.platform_id` and gate by platform.

---

## Non-goals (V1P)

- no expected-state baseline
- no diff against a previous parse
- no ranking engine
- no suppression / visibility / acknowledge / dismiss
- no severity escalation based on context
- no export (JSON / Markdown — receipt + findings export comes
  with V1O-C)
- no Cortex consumption
- no persistence / history of past reports
- no live-collection inputs
- no batch-level rollup (per V1O-A: `BatchSummaryView` does NOT
  render findings; drill into a slice to see its findings)
- no rule authoring UI
- no rule-pack hot-reload
- no per-rule severity override at runtime
- no new Rust dependencies
- no hash crates; finding_key is explicit ASCII

---

## Cross-references

- [`RULE_PACK_MGMT_HYG_V1.md`](./RULE_PACK_MGMT_HYG_V1.md)
- [`INTAKE_SURFACE_CONTRACT.md`](./INTAKE_SURFACE_CONTRACT.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
- [`ENGINE_PIPELINE_CONTRACT.md`](./ENGINE_PIPELINE_CONTRACT.md)
- [`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md)
- [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md)
