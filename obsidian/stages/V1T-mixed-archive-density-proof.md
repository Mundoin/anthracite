# V1T — Mixed Archive Corpus + BatchRun Density Proof

**Status:** complete
**Depends on:** V1S (save-to-file), V1R (export), V1Q (BatchRun workspace), V1P (validator)

---

## Purpose

Stress the existing INTAKE → archive decode → splitter → detect → parse → receipt → validate → BatchRun summary → export/save loop with a larger realistic mixed archive before adding sort/filter UI.

V1T answers:

1. Can Anthracite handle a larger mixed archive cleanly?
2. Do BatchRun summary, findings, provenance, drill-down, copy export, and save export still behave correctly at higher device count?
3. Does the current UI remain usable enough, or does V1U need sort/filter/density controls?
4. Do JSON/Markdown exports stay deterministic, compact, and raw-config-safe at larger scale?

---

## Corpus Composition

**Archive:** `src-tauri/tests/fixtures/corpora/v1t-mixed-24/archive.zip`
**Corpus manifest:** `src-tauri/tests/fixtures/corpora/v1t-mixed-24/manifest.json`

24 devices across 3 vendors, mixed directory layout inside the zip:

| Vendor | Entry paths | Count |
|---|---|---|
| Cisco IOS-XE | flat root (`cisco-*.cfg`, `cisco-sw*.cfg`) | 8 |
| Juniper Junos | `junos/` subdirectory (`.conf`) | 8 |
| Arista EOS | `arista/` subdirectory (`.cfg`) | 8 |

### Finding distribution

| Class | Devices | Notes |
|---|---|---|
| None (clean) | 10 | SSH v2, NTP, no public SNMP |
| One finding | 7 | Public SNMP community |
| Multiple findings | 5 | SNMP + telnet, or SNMP + SNMP |
| Partial / ambiguous | 2 | Near-empty config; missing hostname |

### Synthetic hygiene guarantees

- No real credentials, secrets, SNMP communities, TACACS/RADIUS keys
- No public IPs; documentation range 192.0.2.0/24 (RFC 5737) used for loopbacks
- No real hostnames — all use `cisco-rNN`, `junos-*`, `arista-*` patterns
- No customer data or real site topology

---

## What Changed

### New fixture corpus

- `src-tauri/tests/fixtures/corpora/v1t-mixed-24/archive.zip` — committed binary (24 configs, 3 vendors, flat + nested layout)
- `src-tauri/tests/fixtures/corpora/v1t-mixed-24/manifest.json` — per-device documentation (vendor, hostname, expected detection, finding class, stress notes)

**Why `corpora/` not `archives/`:**
The archive protocol fixtures in `tests/fixtures/archives/` use a hardcoded FIXTURES const in `archive_intake_corpus.rs` and require inline config bodies for the regen helper. V1T is a density corpus — 24 configs at mixed depth — wrong size and pattern for that test harness. A separate `corpora/` directory avoids the bidirectional manifest check while keeping the corpus clearly scoped.

### New Rust tests (6 tests)

`src-tauri/tests/archive_intake_v1t.rs`

| Test | What it proves |
|---|---|
| `extracts_all_24_configs` | extracted_count==24, entry_count==24, skipped_count==0, no warnings |
| `all_entries_have_extracted_status` | every entry status == Extracted |
| `all_entries_have_raw_text` | every extracted entry has non-empty raw_text |
| `entry_paths_cover_all_three_vendors` | cisco-, junos/, arista/ all present |
| `mixed_directory_layout_preserved` | 8 flat, 16 nested |
| `is_deterministic_across_two_runs` | entry order and counts stable |

### New TypeScript tests (16 tests)

`src/modes/intake/export/__tests__/batchRunExport.density.test.ts`

24-device mock corpus (matching the v1t-mixed-24 manifest distribution).

JSON export suite (11 tests):
- 24 devices present in export
- export_version==1, kind=="batch_run_export"
- Summary counts survive projection (total 24, parsed 24, failed 0, with_findings 14, clean 10)
- Byte-for-byte deterministic across two runs
- No raw config excerpts (raw_excerpt sentinel strings absent)
- No timestamp/run-id fields
- No Assessment vocabulary
- No device_model emitted per device
- All 3 vendor archive paths represented in device provenance
- Mixed directory layout (8 flat, 16 nested) preserved in provenance
- validation_report.findings is array for complete devices

Markdown export suite (5 tests):
- All 24 device section headings rendered
- No raw config excerpts
- No Assessment vocabulary
- Deterministic across two runs
- All 3 vendor names present

---

## What Was Not Changed

- Archive intake engine (`archive_intake.rs`) — no modification
- Splitter engine — no modification
- Parser engines (Cisco, Juniper, Arista) — no modification
- Validator engine and rule packs — no modification
- BatchRun export schema — export_version still 1, kind still "batch_run_export"
- V1S save bridge — no modification
- UI — no sort, filter, pagination, virtualisation added
- Parser fixture corpora — no new parser fixtures added
- Archive protocol fixtures (`tests/fixtures/archives/`) — unchanged

---

## Export / Save Protections

All V1R/V1S contracts verified to hold at 24-device scale:

- `export_version: 1` ✓
- `kind: "batch_run_export"` ✓
- No `raw_text` / raw config content in export ✓
- No timestamps, `exported_at`, `created_at`, `run_id`, `uuid` ✓
- No Assessment vocabulary (`assessment_run`, `AssessmentRun`, `assessment_report`) ✓
- Provenance (`source_provenance`) present per device ✓
- `device_model` not emitted per device ✓
- Findings in `validation_report.findings` — `raw_excerpt` stripped ✓
- JSON stringify is byte-for-byte deterministic ✓
- Markdown render is byte-for-byte deterministic ✓

---

## Validation Results

```
pnpm typecheck   → ok (0 errors)
pnpm test        → 221 passed, 0 failed (29 test files)
pnpm build       → ok (83 modules, 0 errors)

cargo check      → Finished dev (0 errors)
cargo test --lib → 282 passed, 0 failed
cargo test --tests → all suites ok, incl. archive_intake_v1t (6/6)
```

---

## Density Observations for V1U

These are observations from working with the 24-device mixed corpus at the existing UI scale. V1U should implement sort/filter/search based on these, not imagination.

### Per-row scanning pain

At 24 rows in the BatchRun workspace, the table remains navigable for a single session. The rows are long enough that scanning all of them to find findings-bearing devices requires visual effort. This becomes acute at 40+ devices.

**V1U signal:** severity sort (with_findings first, or H/M/L/clean grouping) would eliminate most of the scanning burden.

### Vendor identification

The three vendor platforms (cisco, juniper, arista) are visually distinct in the existing receipt strip only if you drill in. At batch table level, there is no vendor column/badge. Mixed archives expose this gap clearly.

**V1U signal:** a vendor chip or badge at row level would allow quick vendor-scoped scanning without drill-in.

### Finding count readability

The RunSummaryStrip shows aggregate H/M/L counts but individual row findings are only visible in the Findings column chip (count). At 24 rows with 14 findings-bearing devices, identifying which rows have High findings requires reading every chip.

**V1U signal:** sorting by severity or showing a severity mini-bar per row would eliminate this.

### Hostname search

14 devices have findings. Finding a specific hostname in a 24-row batch requires visual scan. At 50+ devices this becomes genuinely painful.

**V1U signal:** a hostname/filter-text input above the batch table would be the smallest useful intervention.

### Export / save at scale

Save JSON and Save Markdown both worked correctly in the V1T corpus at 24 devices. JSON size is manageable (~40KB for full 24-device export). Markdown is long (human-readable summary per device) but correct. No regression.

**V1U signal:** no immediate pagination/virtualisation needed for export at 24 devices. At 100+ devices, JSON size and Markdown length would warrant investigation.

### Recommendation for V1U

Minimum V1U scope to address the density pain discovered:
1. Sort by severity (H → M → L → clean) in the batch table
2. Vendor chip/badge at row level
3. Hostname filter/search input above the table

Virtualisation, pagination, and infinite scroll are not yet warranted at 24 devices.

---

## AO Retro

Saved at: `.agents/learnings/2026-05-17-quick-v1t-mixed-archive-density-proof.md`

---

## Next Stage

**V1U** — sort/filter/search controls for the BatchRun workspace, driven by the density observations above.
