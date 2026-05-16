# CONFIG_SPLITTER_CONTRACT

The typed surface the V1O-A Config Splitter Engine exposes through
the Tauri command boundary, and the determinism / honesty contract
the splitter binds itself to.

Bound by V1O-A
([`../../obsidian/stages/V1O-A-multi-device-intake.md`](../../obsidian/stages/V1O-A-multi-device-intake.md)).

## Engine boundary

The splitter:

- **Owns:** boundary detection (explicit + heuristic), slice
  identifier assignment, splitter warnings, per-slice confidence,
  hard caps (lines scanned, slices produced).
- **Does NOT own:** parsing, vendor detection, model population,
  topology, validation, findings, archive extraction, persistence.

The splitter runs BEFORE the V1J detection engine and produces slices
that the V1J / V1K / V1L pipeline consumes on a per-slice basis.

## Tauri command

```rust
#[tauri::command]
pub fn split_config_batch(config_text: String) -> ConfigBatchSplitResult
```

## TypeScript wrapper

```typescript
export async function splitConfigBatch(
  configText: string,
): Promise<ConfigBatchSplitResult>
```

## Wire shape

```rust
pub struct ConfigBatchSplitResult {
    pub slices: Vec<ConfigSlice>,
    pub method: SplitMethod,
    pub warnings: Vec<BatchWarning>,
    pub total_line_count: u64,
    pub scanned_line_count: u64,
    pub splitter_version: String,
}

pub struct ConfigSlice {
    pub slice_id: String,     // "slice-0", "slice-1", ... (scan order)
    pub line_start: u64,      // 1-based
    pub line_end: u64,        // 1-based, inclusive
    pub raw_text: String,     // exact slice body, trailing newline preserved
    pub confidence: f32,      // 0.0–1.0
    pub hint: SliceHint,
}

pub enum SplitMethod {
    ExplicitSeparator { pattern: String },
    Heuristic,
    SingleConfig,
    NoSplitPossible,
}

pub enum SliceHint {
    None,
    HostnamePresent { hostname: String },
    VendorHeaderDetected { header: String },  // reserved for future use
}

pub enum BatchWarning {
    EmptyInput,
    WhitespaceOnly,
    InputTruncated { scanned: u64, total: u64 },
    NoSplitPossible,
    NoSeparatorsFound,
    AmbiguousBoundary { near_line: u64 },
    EmptySliceProduced { slice_id: String },
    LowConfidenceSplit { slice_id: String },
    UnusuallyLargeBatch { device_count: u64 },
}
```

All variants use `#[serde(tag = "kind", rename_all = "snake_case")]`,
mirroring V1J's `DetectionWarning`. The TypeScript surface
(`src/types/configBatch.ts`) is the verbatim mirror.

## Contract

- **Composable, not chained.** The splitter does not call detection,
  parsing, or projection. Callers pass each slice's `raw_text` to
  the existing per-device pipeline (V1J → V1K → V1L) as they see fit.
- **Empty / whitespace-only input.** Returns `Ok` (the command never
  returns `Err` for ordinary input conditions) with no slices,
  `SplitMethod::NoSplitPossible`, and an `EmptyInput` or
  `WhitespaceOnly` warning.
- **No panic.** Any input — malformed, truncated, binary-looking,
  near the line cap — degrades gracefully into warnings and a (possibly
  empty) slice list. Never a panic.
- **No filesystem access. No network. No randomness. No timestamps.**

## Recognised explicit-separator vocabulary

Three patterns, case-insensitive on the keyword, whitespace-tolerant
on inner padding:

1. **`### device: <hostname> ###`** (`pattern_label = "hash-device"`)
   - Hash count ≥ 3 on both sides; the keyword `device` is matched
     case-insensitively; the trailing colon is optional; hostname
     is captured and used as the slice hint.

2. **`! ===== <hostname> =====`** (`pattern_label = "banner-equals"`)
   - Leading `!` optional; equals run ≥ 3 on both sides; hostname
     captured when present.

3. **`# hostname: <hostname>`** (`pattern_label = "script-hostname"`)
   - The keyword `hostname` is case-insensitive; colon optional;
     hostname is required.

Any other separator forms are NOT in scope for V1O-A. A request for
additional separator vocabulary is a future-stage change with its
own bump.

When ANY explicit separator matches in the input, the splitter uses
ExplicitSeparator method exclusively and does not run heuristics.

## Heuristic boundary signals

The heuristic pass runs only when Pass 1 (explicit separators)
found nothing.

A second-or-later hostname-style line is treated as a boundary
candidate. Recognised hostname signals:

- `hostname <name>` (Cisco IOS / IOS-XE / Arista EOS)
- `set system host-name <name>` (Juniper Junos set style)
- `host-name <name>;` (Juniper Junos brace style, inside `system { … }`)
- `sysname <name>` (Huawei VRP)

Boundary confidence is scored from the predecessor context:

| Signal | Confidence |
|---|---|
| A config-end marker (`end`, `}`, `commit`, `!Command:`, `## Last commit`, `## Last changed`) was the most recent strong marker within 6 non-blank lines | **0.7** |
| Previous line was blank (no strong end marker within the window) | **0.4** |
| Back-to-back hostname lines with no break | **0.3** |

Slices with confidence ≤ 0.5 emit a `LowConfidenceSplit` warning;
boundaries with confidence < 0.6 emit an `AmbiguousBoundary` warning
naming the nearby line.

## Confidence semantics

- `1.0` — explicit separator, or single-config pass-through.
- `0.7` — strong heuristic (recent end marker).
- `0.4` — weak heuristic (blank-line break only).
- `0.3` — very weak heuristic (back-to-back hostnames).

The UI is required (per V1O honesty rule #2) to render low confidence
prominently. The `LowConfidenceSplit` warning carries the slice id
so the UI can highlight the relevant card.

## Warning vocabulary (full)

| Variant | When emitted |
|---|---|
| `EmptyInput` | Input string is empty. No slices. |
| `WhitespaceOnly` | Input is non-empty but contains no non-whitespace. |
| `InputTruncated` | Input exceeds `MAX_LINES_SCANNED` (100 000); the first 100 000 lines were scanned. |
| `NoSplitPossible` | Reserved — pre-emptive signal for future explicit-only modes. Not emitted in V1O-A's three-pass algorithm. |
| `NoSeparatorsFound` | Reserved — same as above. |
| `AmbiguousBoundary` | A heuristic boundary has confidence < 0.6. |
| `EmptySliceProduced` | An explicit-separator slice has empty body. |
| `LowConfidenceSplit` | A slice has confidence ≤ 0.5. |
| `UnusuallyLargeBatch` | More than `MAX_SLICES` (256) slices were detected; the result is truncated to the cap. |

## Determinism

- Same bytes in → byte-identical `ConfigBatchSplitResult` JSON across
  arbitrarily many runs.
- `slice_id` is `"slice-{i}"` where `i` is the scan-order index,
  0-based. Stable across runs of the same input.
- No `HashMap`. Internal aggregation uses ordered iteration only.
- No timestamps. No random numbers. No thread-local state.
- Serde round-trip is byte-stable
  (`config_splitter_determinism::serde_round_trip_is_byte_identical`).

## Hard caps

| Cap | Value | Behaviour at cap |
|---|---|---|
| `MAX_LINES_SCANNED` | 100 000 | Excess lines silently dropped; `InputTruncated` warning emitted. |
| `MAX_SLICES` | 256 | Excess slices truncated; `UnusuallyLargeBatch{device_count}` warning carries the pre-truncation count. |

## SPLITTER_VERSION

```rust
pub const SPLITTER_VERSION: u32 = 1;
```

Monotonic `u32`, declared in
`src-tauri/src/engines/config_splitter.rs`. Mirrors the per-parser
version pattern documented in
[`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md).

### Bump policy

**Patch-equivalent — no bump required:**

- Internal refactor that preserves output bytes.
- Comment changes.
- Test-only changes.
- Performance changes that preserve output bytes.

**Bump required:**

- Any change that could produce different `ConfigBatchSplitResult` JSON
  for any existing committed fixture.
- New warning variant added (the JSON shape changes).
- Explicit-separator vocabulary extended.
- Heuristic confidence scoring changes.
- Cap values changed.

### CI enforcement

Three artefacts must agree on the splitter's version at all times:

1. The Rust source constant `config_splitter::SPLITTER_VERSION`.
2. The fixture manifest at
   `src-tauri/tests/fixtures/config-batches/_manifest.toml`, field
   `splitter_version`.
3. The on-disk fixture corpus (every directory listed in the manifest
   must exist; every directory on disk must appear in the manifest).

The integration test `tests/config_splitter_version_guard.rs`
enforces (1)↔(2) and (2)↔(3). The corpus harness
`tests/config_splitter_corpus.rs` additionally enforces that every
fixture's committed `expected.json` matches what the current splitter
produces; any diff fails CI.

This guard is intentionally separate from the parser version guard;
the splitter and the parsers evolve independently.

## What the splitter does NOT do

- No parsing.
- No detection (V1J still owns that, per slice, on the UI side).
- No vendor registry lookup.
- No `DeviceModel` population beyond the slice text.
- No archive extraction (zip/tar/gz).
- No filesystem I/O.
- No cross-slice analysis (no aggregate facts, no relationships).
- No persistence.
- No re-merging of slices.
- No client-side splitter computation in TypeScript (the UI is a
  consumer; it does not re-split).

## Relationship to V1J detection

The pipeline is:

```
config text (paste / file)
  ↓
split_config_batch                           ← V1O-A
  ↓ (per slice)
detect_config_platform(slice.raw_text)       ← V1J
  ↓ (operator confirms or manually overrides)
parse_device_config(platform_ref, slice.raw_text)  ← V1K/M/N
  ↓
project_device_receipt(device_model)         ← V1L
```

V1O's INTAKE surface drives this flow per
[`INTAKE_SURFACE_CONTRACT.md`](./INTAKE_SURFACE_CONTRACT.md) — see
its "Batch mode" section for the V1O-A overlay.

## Cross-references

- [`INTAKE_SURFACE_CONTRACT.md`](./INTAKE_SURFACE_CONTRACT.md)
- [`PARSER_COMMAND_CONTRACT.md`](./PARSER_COMMAND_CONTRACT.md)
- [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md)
- [`ENGINE_PIPELINE_CONTRACT.md`](./ENGINE_PIPELINE_CONTRACT.md)
- [`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md)
