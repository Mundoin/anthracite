# Archive Intake Contract (V1O-B)

Status: **Locked at V1O-B.** This document binds the operator-facing
INTAKE archive surface to the Rust archive intake engine. Any change
below requires its own revision stage and an
`ARCHIVE_INTAKE_VERSION` bump.

Pair docs:
- [`INTAKE_SURFACE_CONTRACT.md`](./INTAKE_SURFACE_CONTRACT.md) — operator
  surface, single-config + multi-config + archive flows.
- [`CONFIG_SPLITTER_CONTRACT.md`](./CONFIG_SPLITTER_CONTRACT.md) — the
  splitter the archive engine feeds into.
- [`ENGINE_PIPELINE_CONTRACT.md`](./ENGINE_PIPELINE_CONTRACT.md) — full
  pipeline ordering.
- [`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md)
  — layering rules.

---

## Scope

V1O-B is a **bounded adapter stage**. It adds a deterministic Rust
archive intake engine that takes raw archive bytes, returns extracted
text entries with source provenance, and routes those entries into the
existing V1O-A splitter and V1O single-config flow without redesigning
either.

V1O-B is intentionally narrow:

- decode-only — no parsing, model population, projection, archive
  creation, or persistence
- three container formats — `.zip`, `.tar`, `.tar.gz` (and `.tgz` as a
  filename alias for tar.gz)
- no nested archive recursion (warning only)
- no symlink resolution (warning only, entry skipped)
- no password-protected archives
- no streaming UI for large archives

---

## Engine boundary

The archive intake engine:

- **Owns:** container-format decoding (zip / tar / tar.gz), byte-based
  archive kind detection, per-entry enumeration, path sanitisation,
  text-likely heuristic, UTF-8 strict decoding, safety caps,
  deterministic `entry_id` assignment, typed warning emission.
- **Does NOT own:** config parsing, vendor detection, model
  population, receipt projection, slice discovery, persistence,
  archive creation, password handling, nested-archive recursion.

The engine runs BEFORE the V1O-A splitter. The frontend orchestrates:

```
archive bytes (frontend)
  ↓
archive_intake(bytes, kind_hint)            ← V1O-B
  ↓ (per Extracted entry)
split_config_batch(entry.raw_text)          ← V1O-A
  ↓ (per slice)
detect_config_platform(slice.raw_text)      ← V1J
  ↓ (operator confirms or manually overrides)
parse_device_config(platform_ref, slice.raw_text)  ← V1K / V1M / V1N
  ↓
project_device_receipt(device_model)        ← V1L
```

The engine is an **adapter**, not a pipeline. It does not call the
splitter from Rust. The frontend tags each resulting `ConfigSlice`
with an `ArchiveEntryRef` and flattens slices across entries into a
single batch summary view.

---

## Container-format dependency exception

Three third-party crates land with V1O-B:

```toml
zip    = { version = "0.6", default-features = false, features = ["deflate"] }
tar    = { version = "0.4", default-features = false }
flate2 = { version = "1.0", default-features = false, features = ["rust_backend"] }
```

These are **container-format decoders for externally specified
formats**. They are not parsers, models, or language definitions.

The motor-room rule
([`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md))
prohibits third-party parser / model crates because vendor config
languages must be modelled in-house against the V1H Vendor Registry
and parsed deterministically against the V1I Canonical Network Model.
Container-format decoding is a different category:

- `zip`, `tar`, and `gzip` are public, frozen specifications.
- The decoded output is *bytes*, not domain semantics. Domain semantics
  remain the parsers' job.
- The decoder cannot leak vendor-specific assumptions into the
  pipeline. It returns `Vec<u8>` per entry; everything after that runs
  through the same V1O-A → V1J → V1K / V1M / V1N → V1L chain a paste
  would.

No additional container-format dependencies are accepted without a
new architecture proposal. Specifically out of scope: `.7z`, `.rar`,
`.bz2`, `.xz`, password-protected archives, multi-volume archives.

---

## Tauri command

```rust
#[tauri::command]
pub fn archive_intake(
    bytes: Vec<u8>,
    kind_hint: ArchiveKind,
) -> Result<ArchiveIntakeResult, String>
```

### `Err` shape — reserved

`Err` is reserved for cases where no extraction is possible at all:

- empty bytes
- bytes shorter than the minimum header size for any supported kind
- unrecognised header (no zip / tar / gzip magic detected)
- internal decoder panic caught at the boundary

All other conditions return `Ok` with the appropriate warnings and
per-entry statuses:

- kind mismatch (supplied vs detected) → `KindMismatch` warning, the
  detected kind drives extraction
- corrupt archive (valid header, body unreadable) → `CorruptArchive`
  warning, partial entries surfaced when possible
- oversize entry / oversize archive → `OversizeArchive` warning,
  affected entries skipped
- compression bomb → `CompressionRatioExceeded` warning, affected
  entry skipped
- symlink in tar → `SymlinkIgnored` warning, entry skipped
- path traversal → `PathTraversalRejected` warning, entry skipped
- decode failure (non-UTF-8 entry body) → `EntryDecodeFailed` warning,
  entry surfaced with `SkippedDecodeError` status
- nested archive → `NestedArchiveDetected` warning, no recursion;
  entry surfaces as `SkippedNonText` (since `.zip` / `.tar` are not
  in the text-likely extension list)

The `corrupt-archive` boundary specifically: a header valid enough to
pass detection but a body that the decoder rejects up-front returns
`Ok` with `CorruptArchive`. A header shorter than the minimum size
returns `Err`. This split keeps the operator's view honest — once we
have ANY structured information about the archive, we surface it.

---

## TypeScript wrapper

```ts
export async function archiveIntake(
  bytes: Uint8Array,
  kindHint: ArchiveKind,
): Promise<ArchiveIntakeResult>;
```

The wrapper passes the `Uint8Array` directly to Tauri's `invoke`.
Tauri 2.x marshals it through the raw IPC body; the Rust command
receives it as `Vec<u8>` unmangled. The byte-transport gate (Task 0
of the V1O-B prompt) verifies this contract at command + unit-test
level; a runtime roundtrip in `pnpm tauri dev` is the recommended
sanity check before any V1O-B release.

`archiveKindFromFilename` maps a filename basename to a kind hint by
extension (`.zip` → `Zip`, `.tar` → `Tar`, `.tar.gz` / `.tgz` →
`TarGz`). Unknown extensions return `null` so the caller can refuse
without round-tripping.

---

## Wire shape (mirrored exactly in `src/types/archiveIntake.ts`)

```rust
pub enum ArchiveKind {
    Zip,
    Tar,
    TarGz,
    Unknown,   // only present when header detection fails entirely
}

pub enum ArchiveEntryStatus {
    Extracted,
    SkippedDirectory,
    SkippedNonText,
    SkippedOversize,
    SkippedDecodeError,
    SkippedSymlink,
    SkippedPathTraversal,
    SkippedEmpty,
}

pub enum ArchiveWarning {
    EmptyArchive,
    CorruptArchive { detail },
    OversizeArchive { limit_bytes, actual_bytes },
    TooManyEntries { limit, actual },
    CompressionRatioExceeded { entry_id, ratio },
    DeepPathTruncated { entry_id, original_depth },
    EntryDecodeFailed { entry_id },
    SymlinkIgnored { entry_path },
    PathTraversalRejected { entry_path },
    NestedArchiveDetected { entry_path },
    ZeroTextEntries,
    KindMismatch { supplied, detected },
}

pub struct ArchiveEntry {
    pub entry_id: String,         // deterministic: "entry-0", "entry-1", ...
    pub entry_index: u64,         // scan-order index
    pub path: String,             // sanitised display path
    pub raw_path: Option<String>, // original, present only when sanitisation changed it
    pub size_bytes_compressed: u64,
    pub size_bytes_uncompressed: u64,
    pub status: ArchiveEntryStatus,
    pub raw_text: Option<String>, // present only when status == Extracted
    pub decode_warning: Option<String>,
}

pub struct ArchiveIntakeResult {
    pub archive_kind_supplied: ArchiveKind,
    pub archive_kind_detected: ArchiveKind,
    pub entries: Vec<ArchiveEntry>,
    pub warnings: Vec<ArchiveWarning>,
    pub total_uncompressed_size: u64,
    pub total_compressed_size: u64,
    pub entry_count: u64,
    pub extracted_count: u64,
    pub skipped_count: u64,
    pub archive_intake_version: String,
}
```

Tagged unions use `#[serde(tag = "kind", rename_all = "snake_case")]`,
mirroring V1J's `DetectionWarning` and V1O-A's `BatchWarning`. The
TypeScript surface in `src/types/archiveIntake.ts` is the verbatim
mirror.

`ArchiveEntryRef` is a **TypeScript-only** type (not on the Rust
wire). It wraps splitter output with provenance: `{ entry_id,
entry_path, archive_name }`. The frontend layers it onto every
`ConfigSlice` produced by splitting an archive entry's text.

---

## Archive kind detection (header-based)

The engine accepts a kind hint from the caller but **independently
verifies the kind by inspecting the leading bytes**:

| Format | Magic | Position |
|---|---|---|
| zip   | `PK\x03\x04` (local file header) or `PK\x05\x06` (empty central directory) | offset 0 |
| tar.gz | `0x1f 0x8b`        | offset 0 |
| tar    | `ustar`            | offset 257 |

Order of detection: gzip → zip → tar. gzip is checked first because a
.tar.gz starts with gzip magic; checking tar first would misclassify.

When the supplied `kind_hint` disagrees with the header, the engine
emits `KindMismatch { supplied, detected }` and proceeds with the
**detected** kind. The UI surfaces this in the inventory panel header.

When the header matches no supported format, the engine returns `Err`.

---

## Safety caps

Hard caps declared as `pub const` in `engines/archive_intake.rs`:

| Constant | Value | Behaviour at cap |
|---|---|---|
| `MAX_TOTAL_UNCOMPRESSED_BYTES` | 200 MiB | `OversizeArchive` warning; subsequent entries refused |
| `MAX_ENTRY_BYTES` | 10 MiB | `OversizeArchive` warning; entry skipped |
| `MAX_ENTRIES` | 1024 | `TooManyEntries` warning; tail truncated |
| `MAX_COMPRESSION_RATIO` | 100× | `CompressionRatioExceeded` warning; entry skipped |
| `MAX_PATH_DEPTH` | 16 segments | `DeepPathTruncated` warning; path truncated for display |

No panic, ever. Cap violations always degrade gracefully into typed
warnings and skipped entries. Determinism survives caps — same
oversize input always reports the same caps.

---

## Path sanitisation

Every entry path is sanitised before display or use:

- leading `/` and `\` stripped
- `..` components rejected → entry status `SkippedPathTraversal`
- NUL bytes rejected → entry status `SkippedDecodeError`
- paths exceeding `MAX_PATH_DEPTH` truncated → `DeepPathTruncated`
  warning
- backslashes normalised to forward slashes for display only; the
  original raw path is preserved on the entry as `raw_path` when it
  differs

V1O-B does not write to disk. Traversal rejection here is a UI honesty
measure, not a filesystem-security measure — clean paths render
honestly. The engine never resolves or follows any path.

---

## Symlinks

Tar archives may contain symlinks. The engine never follows, resolves,
or extracts them. Each symlink emits `SymlinkIgnored { entry_path }`
and the entry surfaces with `SkippedSymlink` status.

---

## UTF-8 strict decoding

Extracted text decodes strictly as UTF-8 — no Latin-1 fallback. A
decode failure emits `EntryDecodeFailed { entry_id }`; the entry
surfaces with `SkippedDecodeError` status and a `decode_warning`
string that names the failing byte offset.

This mirrors V1O's file-open UTF-8 policy. Same contract on the
operator's screen: invalid UTF-8 means honest refusal, never silent
mojibake.

---

## Text-likely heuristic

Entries are decoded only when their extension is in the text-likely
list. Other extensions skip without reading bytes.

Accepted extensions (declared as a `&[&str]` constant):

```
cfg  conf  config  txt  show  run  startup
```

Files with **no extension** are also accepted — operator backup tools
sometimes emit names like `core-switch-01` with no extension. The
trade-off is permissiveness here vs forcing operators to rename
files; the V1O honesty rules apply per-entry, so a non-text
extensionless file will surface as `SkippedDecodeError` once the
decoder rejects the bytes.

Extensions in the `NESTED_ARCHIVE_EXTENSIONS` list (`.zip`, `.tar`,
`.gz`, `.tgz`, `.tar.gz`) emit `NestedArchiveDetected` warnings even
when they would otherwise have skipped. The engine never recurses
into a nested archive.

---

## Source provenance

Every `ArchiveEntry` carries an `entry_id` (`entry-{i}`, scan order),
`entry_index`, and sanitised `path`. The frontend tags every
`ConfigSlice` produced by splitting that entry's content with an
`ArchiveEntryRef { entry_id, entry_path, archive_name }`.

Provenance flows:

```
archive entry → splitter slice → device card → receipt header annotation
```

Per-slice cards in the batch summary render an `ArchiveSourceBadge`
("from `<entry_path>`"). The drilled-in slice header repeats the
badge. The provenance map keys on the frontend's namespaced slice id
(`<entry_id>/<slice_id>`) so per-entry splitter outputs don't collide.

---

## Determinism

- Same bytes in → byte-identical `ArchiveIntakeResult` JSON across
  arbitrarily many runs.
- `entry_id` is `entry-{i}` where `i` is the scan-order index, 0-based.
  Stable across runs of the same input.
- The decoder's iteration order is captured into a `Vec<ArchiveEntry>`
  which the engine then sorts by `entry_index` and renumbers; if any
  upstream decoder changes iteration order, the public output stays
  stable.
- No `HashMap` in output paths. No timestamps. No randomness.
- Serde round-trip is byte-stable
  (`archive_intake_determinism::serde_round_trip_is_byte_stable`).

---

## `ARCHIVE_INTAKE_VERSION`

```rust
pub const ARCHIVE_INTAKE_VERSION: u32 = 1;
```

Monotonic `u32`, declared in `src-tauri/src/engines/archive_intake.rs`.
Mirrors the per-parser version pattern in
[`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md) and the splitter
version pattern in
[`CONFIG_SPLITTER_CONTRACT.md`](./CONFIG_SPLITTER_CONTRACT.md).

### Bump policy

**Patch-equivalent — no bump required:**

- Internal refactor that preserves output bytes.
- Comment changes, test-only changes.
- Performance changes that preserve output bytes.

**Bump required:**

- Any change that could produce different `ArchiveIntakeResult` JSON
  for any committed fixture.
- New warning variant added (the JSON shape changes).
- Cap values changed.
- Text-likely or nested-archive extension list changed.
- Header detection ordering or magic bytes changed.

### CI enforcement

Three artefacts must agree at all times:

1. The Rust constant `archive_intake::ARCHIVE_INTAKE_VERSION`.
2. `src-tauri/tests/fixtures/archives/_manifest.toml::archive_intake_version`.
3. The on-disk fixture directories listed in the manifest.

The integration test `tests/archive_intake_version_guard.rs` enforces
all three. The corpus harness `tests/archive_intake_corpus.rs`
additionally enforces byte-equality of `archive_intake` output against
every committed `expected.json`; any drift fails CI.

The guard is intentionally separate from `parser_version_guard.rs`
and `config_splitter_version_guard.rs`. Each engine evolves
independently.

---

## Byte-transport verification gate (Task 0)

Before V1O-B's real engine logic, the prompt mandates a byte-transport
verification gate that confirms a frontend `Uint8Array` survives the
invoke boundary intact as a Rust `Vec<u8>`.

V1O-B verifies this at two levels:

1. **Rust unit tests** on `commands::archive_intake::compute_echo` +
   `archive_intake_echo_bytes` (6 cases including empty, exact-16,
   high-bit bytes, and the `#[tauri::command]` wrapper). These prove
   the command function accepts `Vec<u8>` and the underlying hex
   fingerprint is byte-exact.
2. **Documented Tauri 2.x contract**: `Uint8Array` arguments to a
   `#[tauri::command]` taking `Vec<u8>` are marshalled via the raw
   binary IPC body, not JSON-encoded. The byte content is unmangled.

A temporary `archive_intake_echo_bytes` command stays in the codebase
across V1O-B implementation and is **removed before the final report**
once the gate is documented as passed. Any runtime regression in
Tauri's bytes path would manifest as a localised fix in
`src/api/archiveIntake.ts` (e.g. an explicit Array.from coercion);
the rest of the engine is unaffected.

---

## What V1O-B does NOT do

- no archive creation, editing, or export
- no archive tree browser, no per-entry selection checkboxes
- no password prompt or password-protected archive support
- no nested archive recursion (warning only)
- no multi-volume archive support
- no `.7z`, `.rar`, `.bz2`, `.xz` support
- no drag-and-drop archive open (file picker only)
- no "remember recent archives"
- no archive persistence, no save / export of extracted entries
- no archive comparison
- no search / filter across entries
- no edit of entry paths before processing
- no filesystem writes
- no streaming UI for large archives
- no parallel extraction
- no parser, splitter, model, or receipt changes
- no fourth parser, no validator engine
- no findings generation, no routing protocol parsing, no L4 work
- no topology synthesis, no live device access
- no Python sidecar

A feature request that cannot be honoured without violating these
exclusions is parked with reason in the V1O-B stage note.

---

## Cross-references

- [`INTAKE_SURFACE_CONTRACT.md`](./INTAKE_SURFACE_CONTRACT.md)
- [`CONFIG_SPLITTER_CONTRACT.md`](./CONFIG_SPLITTER_CONTRACT.md)
- [`PARSER_COMMAND_CONTRACT.md`](./PARSER_COMMAND_CONTRACT.md)
- [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md)
- [`ENGINE_PIPELINE_CONTRACT.md`](./ENGINE_PIPELINE_CONTRACT.md)
- [`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
