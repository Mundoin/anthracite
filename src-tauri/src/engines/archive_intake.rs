//! Archive Intake Engine — V1O-B.
//!
//! Deterministic decoder for operator-supplied archives (zip, tar,
//! tar.gz). Takes raw bytes plus an operator-supplied kind hint,
//! independently validates the kind by inspecting the leading bytes,
//! walks the archive in scan order, sanitises entry paths, decodes
//! text-likely entries strictly as UTF-8, and emits a structured
//! `ArchiveIntakeResult` with per-entry status and typed warnings.
//!
//! Engine boundary (per `ARCHIVE_INTAKE_CONTRACT.md`):
//!
//!   - Owns:    archive kind detection (by header bytes), entry
//!              enumeration, path sanitisation, UTF-8 decoding,
//!              safety caps, deterministic entry-id assignment,
//!              typed warning emission.
//!   - Does NOT own: config parsing, vendor detection, model
//!                   population, receipt projection, slice
//!                   discovery, persistence, archive creation.
//!
//! Doctrine: deterministic, no LLM, no randomness, no timestamps,
//! no filesystem writes. Same bytes in → byte-identical output. Cap
//! violations degrade gracefully into typed warnings; never panic.

use std::io::Read;

use serde::{Deserialize, Serialize};

// =====================================================================
// Versioning + caps
// =====================================================================

/// Archive intake contract version. Mirrors
/// `src-tauri/tests/fixtures/archives/_manifest.toml::archive_intake_version`.
/// Bump whenever the engine could produce a different
/// `ArchiveIntakeResult` for any existing fixture. See
/// `docs/architecture/ARCHIVE_INTAKE_CONTRACT.md` for bump policy.
pub const ARCHIVE_INTAKE_VERSION: u32 = 1;

/// Total uncompressed bytes allowed per archive (200 MB). Inputs that
/// would exceed this are stopped at the cap; remaining entries are
/// skipped with no further enumeration.
pub const MAX_TOTAL_UNCOMPRESSED_BYTES: u64 = 200 * 1024 * 1024;

/// Maximum uncompressed bytes per individual entry (10 MB). Entries
/// above this cap are skipped with `SkippedOversize` and an
/// `OversizeArchive` warning.
pub const MAX_ENTRY_BYTES: u64 = 10 * 1024 * 1024;

/// Maximum number of entries an archive may contain (1024). Entries
/// beyond this are not enumerated; a `TooManyEntries` warning is
/// emitted with the pre-truncation count.
pub const MAX_ENTRIES: u64 = 1024;

/// Maximum allowed uncompressed/compressed ratio per entry (100×).
/// Entries above this ratio are skipped with `SkippedOversize` and a
/// `CompressionRatioExceeded` warning. Defeats trivial zip-bomb shapes.
pub const MAX_COMPRESSION_RATIO: u64 = 100;

/// Maximum path depth (component count) accepted for an entry (16).
/// Deeper paths are truncated to the first 16 components for display;
/// a `DeepPathTruncated` warning records the original depth.
pub const MAX_PATH_DEPTH: u64 = 16;

/// Extensions treated as text-likely. All other extensions yield
/// `SkippedNonText`. Files with no extension are accepted (operator
/// backup tools sometimes emit names like `core-switch-01`).
const TEXT_LIKELY_EXTENSIONS: &[&str] = &[
    "cfg", "conf", "config", "txt", "show", "run", "startup",
];

/// Extensions that look like nested archives. The engine never
/// recurses; a `NestedArchiveDetected` warning records them. Entries
/// of these kinds will fail UTF-8 decode and end up as
/// `SkippedDecodeError`, which is the intended honest surface.
const NESTED_ARCHIVE_EXTENSIONS: &[&str] = &["zip", "tar", "gz", "tgz", "tar.gz"];

// =====================================================================
// Wire types
// =====================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ArchiveKind {
    Zip,
    Tar,
    TarGz,
    /// Set only when header detection fails entirely. Callers never
    /// supply this as a hint.
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ArchiveWarning {
    EmptyArchive,
    CorruptArchive { detail: String },
    OversizeArchive { limit_bytes: u64, actual_bytes: u64 },
    TooManyEntries { limit: u64, actual: u64 },
    CompressionRatioExceeded { entry_id: String, ratio: u64 },
    DeepPathTruncated { entry_id: String, original_depth: u64 },
    EntryDecodeFailed { entry_id: String },
    SymlinkIgnored { entry_path: String },
    PathTraversalRejected { entry_path: String },
    NestedArchiveDetected { entry_path: String },
    ZeroTextEntries,
    KindMismatch { supplied: ArchiveKind, detected: ArchiveKind },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct ArchiveEntry {
    pub entry_id: String,
    pub entry_index: u64,
    pub path: String,
    pub raw_path: Option<String>,
    pub size_bytes_compressed: u64,
    pub size_bytes_uncompressed: u64,
    pub status: ArchiveEntryStatus,
    pub raw_text: Option<String>,
    pub decode_warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
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

// =====================================================================
// Engine entry point
// =====================================================================

/// Decode the supplied archive bytes into a structured
/// `ArchiveIntakeResult`. `Err` is reserved for cases where no
/// extraction is possible at all (empty bytes, unrecognised header,
/// decoder panic caught at boundary). Ordinary conditions — corrupt
/// archive, kind mismatch, oversize, decode failures — return `Ok`
/// with the appropriate warnings and per-entry statuses.
pub fn archive_intake(
    bytes: &[u8],
    kind_hint: ArchiveKind,
) -> Result<ArchiveIntakeResult, String> {
    if bytes.is_empty() {
        return Err("archive bytes empty".to_string());
    }
    if bytes.len() < 4 {
        return Err("archive bytes shorter than minimum header size".to_string());
    }

    let archive_kind_detected = detect_archive_kind(bytes);
    if matches!(archive_kind_detected, ArchiveKind::Unknown) {
        return Err("archive header does not match any supported format".to_string());
    }

    let mut warnings: Vec<ArchiveWarning> = Vec::new();
    if kind_hint != archive_kind_detected {
        warnings.push(ArchiveWarning::KindMismatch {
            supplied: kind_hint.clone(),
            detected: archive_kind_detected.clone(),
        });
    }

    let total_compressed_size = bytes.len() as u64;

    let extraction = match archive_kind_detected {
        ArchiveKind::Zip => extract_zip(bytes),
        ArchiveKind::Tar => extract_tar(bytes),
        ArchiveKind::TarGz => extract_tar_gz(bytes),
        ArchiveKind::Unknown => unreachable!("Unknown filtered above"),
    };

    let mut entries = extraction.entries;
    warnings.extend(extraction.warnings);

    // Determinism: sort by entry_index in case any decoder iterates
    // out of order. Reassign deterministic entry_ids afterwards.
    entries.sort_by_key(|e| e.entry_index);
    for (i, entry) in entries.iter_mut().enumerate() {
        entry.entry_index = i as u64;
        entry.entry_id = format!("entry-{i}");
    }

    // Total uncompressed across all (extracted) entries.
    let total_uncompressed_size: u64 = entries.iter().map(|e| e.size_bytes_uncompressed).sum();

    // Hard cap on entry count.
    if entries.len() as u64 > MAX_ENTRIES {
        let actual = entries.len() as u64;
        entries.truncate(MAX_ENTRIES as usize);
        warnings.push(ArchiveWarning::TooManyEntries {
            limit: MAX_ENTRIES,
            actual,
        });
    }

    // Total uncompressed cap: if extracted bytes already exceed cap,
    // warn (skipping retroactively isn't useful — the extractor stops
    // as it goes; this is a defence-in-depth signal).
    if total_uncompressed_size > MAX_TOTAL_UNCOMPRESSED_BYTES {
        warnings.push(ArchiveWarning::OversizeArchive {
            limit_bytes: MAX_TOTAL_UNCOMPRESSED_BYTES,
            actual_bytes: total_uncompressed_size,
        });
    }

    let entry_count = entries.len() as u64;
    let extracted_count = entries
        .iter()
        .filter(|e| matches!(e.status, ArchiveEntryStatus::Extracted))
        .count() as u64;
    let skipped_count = entry_count - extracted_count;

    if entry_count == 0 {
        warnings.push(ArchiveWarning::EmptyArchive);
    } else if extracted_count == 0 {
        warnings.push(ArchiveWarning::ZeroTextEntries);
    }

    Ok(ArchiveIntakeResult {
        archive_kind_supplied: kind_hint,
        archive_kind_detected,
        entries,
        warnings,
        total_uncompressed_size,
        total_compressed_size,
        entry_count,
        extracted_count,
        skipped_count,
        archive_intake_version: ARCHIVE_INTAKE_VERSION.to_string(),
    })
}

// =====================================================================
// Header detection
// =====================================================================

/// Inspect the leading bytes and classify the archive kind. Order
/// matters: gzip magic is checked before raw tar because a .tar.gz
/// would otherwise be misclassified.
fn detect_archive_kind(bytes: &[u8]) -> ArchiveKind {
    // gzip magic: 0x1f 0x8b
    if bytes.len() >= 2 && bytes[0] == 0x1f && bytes[1] == 0x8b {
        return ArchiveKind::TarGz;
    }
    // zip magic: PK\x03\x04 (local file header) or PK\x05\x06 (empty)
    if bytes.len() >= 4
        && bytes[0] == 0x50
        && bytes[1] == 0x4b
        && (bytes[2] == 0x03 || bytes[2] == 0x05)
        && (bytes[3] == 0x04 || bytes[3] == 0x06)
    {
        return ArchiveKind::Zip;
    }
    // tar ustar magic at offset 257, length 5 ("ustar")
    if bytes.len() >= 262 && &bytes[257..262] == b"ustar" {
        return ArchiveKind::Tar;
    }
    ArchiveKind::Unknown
}

// =====================================================================
// Extraction
// =====================================================================

struct ExtractionOutput {
    entries: Vec<ArchiveEntry>,
    warnings: Vec<ArchiveWarning>,
}

fn extract_zip(bytes: &[u8]) -> ExtractionOutput {
    let mut entries: Vec<ArchiveEntry> = Vec::new();
    let mut warnings: Vec<ArchiveWarning> = Vec::new();

    let cursor = std::io::Cursor::new(bytes);
    let mut archive = match zip::ZipArchive::new(cursor) {
        Ok(a) => a,
        Err(e) => {
            warnings.push(ArchiveWarning::CorruptArchive {
                detail: format!("zip open failed: {e}"),
            });
            return ExtractionOutput { entries, warnings };
        }
    };

    let entry_count = archive.len();

    // Soft early cap: if the archive declares more entries than the
    // hard limit, we still walk them so totals are reported honestly,
    // but the eventual truncation in the caller will trim to MAX_ENTRIES.

    let mut total_uncompressed: u64 = 0;

    for index in 0..entry_count {
        let mut file = match archive.by_index(index) {
            Ok(f) => f,
            Err(e) => {
                warnings.push(ArchiveWarning::CorruptArchive {
                    detail: format!("zip entry {index} unreadable: {e}"),
                });
                continue;
            }
        };

        let raw_path_string = file.name().to_string();
        let path_kind = classify_path(&raw_path_string);
        let compressed = file.compressed_size();
        let uncompressed = file.size();

        // Synthetic entry_id; sort + renumber happens in caller.
        let provisional_id = format!("entry-{index}");
        let entry_index = index as u64;

        match path_kind {
            PathKind::Traversal => {
                warnings.push(ArchiveWarning::PathTraversalRejected {
                    entry_path: raw_path_string.clone(),
                });
                entries.push(make_skipped_entry(
                    provisional_id,
                    entry_index,
                    sanitise_display_path(&raw_path_string),
                    Some(raw_path_string),
                    compressed,
                    uncompressed,
                    ArchiveEntryStatus::SkippedPathTraversal,
                ));
                continue;
            }
            PathKind::Nul => {
                warnings.push(ArchiveWarning::EntryDecodeFailed {
                    entry_id: provisional_id.clone(),
                });
                entries.push(make_skipped_entry(
                    provisional_id,
                    entry_index,
                    "<invalid-path>".to_string(),
                    Some(raw_path_string),
                    compressed,
                    uncompressed,
                    ArchiveEntryStatus::SkippedDecodeError,
                ));
                continue;
            }
            PathKind::Ok => {}
        }

        // Directory check: zip uses trailing `/`.
        if file.is_dir() || raw_path_string.ends_with('/') || raw_path_string.ends_with('\\') {
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                sanitise_display_path(&raw_path_string),
                if raw_path_string != sanitise_display_path(&raw_path_string) {
                    Some(raw_path_string)
                } else {
                    None
                },
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedDirectory,
            ));
            continue;
        }

        // Path depth check.
        let (display_path, depth_warning) = enforce_path_depth(&raw_path_string, &provisional_id);
        if let Some(w) = depth_warning {
            warnings.push(w);
        }

        // Compression-ratio bomb defence.
        if compressed > 0 && uncompressed / compressed.max(1) > MAX_COMPRESSION_RATIO {
            warnings.push(ArchiveWarning::CompressionRatioExceeded {
                entry_id: provisional_id.clone(),
                ratio: uncompressed / compressed.max(1),
            });
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedOversize,
            ));
            continue;
        }

        // Per-entry size cap.
        if uncompressed > MAX_ENTRY_BYTES {
            warnings.push(ArchiveWarning::OversizeArchive {
                limit_bytes: MAX_ENTRY_BYTES,
                actual_bytes: uncompressed,
            });
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedOversize,
            ));
            continue;
        }

        // Total uncompressed budget check (defence-in-depth; primary
        // cap is reported at the caller too).
        if total_uncompressed.saturating_add(uncompressed) > MAX_TOTAL_UNCOMPRESSED_BYTES {
            warnings.push(ArchiveWarning::OversizeArchive {
                limit_bytes: MAX_TOTAL_UNCOMPRESSED_BYTES,
                actual_bytes: total_uncompressed.saturating_add(uncompressed),
            });
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedOversize,
            ));
            continue;
        }

        // Empty file.
        if uncompressed == 0 {
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedEmpty,
            ));
            continue;
        }

        // Nested-archive surface warning (not extracted as archive).
        if has_nested_archive_extension(&display_path) {
            warnings.push(ArchiveWarning::NestedArchiveDetected {
                entry_path: display_path.clone(),
            });
        }

        // Text-likely heuristic. Non-text → skip without reading bytes.
        if !is_text_likely(&display_path) {
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedNonText,
            ));
            continue;
        }

        // Read + UTF-8 decode.
        let mut buf: Vec<u8> = Vec::with_capacity(uncompressed as usize);
        if let Err(e) = file.read_to_end(&mut buf) {
            warnings.push(ArchiveWarning::CorruptArchive {
                detail: format!("entry {index} read error: {e}"),
            });
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedDecodeError,
            ));
            continue;
        }
        match String::from_utf8(buf) {
            Ok(text) => {
                total_uncompressed = total_uncompressed.saturating_add(uncompressed);
                entries.push(ArchiveEntry {
                    entry_id: provisional_id,
                    entry_index,
                    path: display_path.clone(),
                    raw_path: preserve_raw_path(&raw_path_string),
                    size_bytes_compressed: compressed,
                    size_bytes_uncompressed: uncompressed,
                    status: ArchiveEntryStatus::Extracted,
                    raw_text: Some(text),
                    decode_warning: None,
                });
            }
            Err(e) => {
                warnings.push(ArchiveWarning::EntryDecodeFailed {
                    entry_id: provisional_id.clone(),
                });
                entries.push(ArchiveEntry {
                    entry_id: provisional_id,
                    entry_index,
                    path: display_path,
                    raw_path: preserve_raw_path(&raw_path_string),
                    size_bytes_compressed: compressed,
                    size_bytes_uncompressed: uncompressed,
                    status: ArchiveEntryStatus::SkippedDecodeError,
                    raw_text: None,
                    decode_warning: Some(format!("invalid utf-8 at byte {}", e.utf8_error().valid_up_to())),
                });
            }
        }
    }

    ExtractionOutput { entries, warnings }
}

fn extract_tar(bytes: &[u8]) -> ExtractionOutput {
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = tar::Archive::new(cursor);
    walk_tar_entries(&mut archive)
}

fn extract_tar_gz(bytes: &[u8]) -> ExtractionOutput {
    let cursor = std::io::Cursor::new(bytes);
    let decoder = flate2::read::GzDecoder::new(cursor);
    let mut archive = tar::Archive::new(decoder);
    walk_tar_entries(&mut archive)
}

fn walk_tar_entries<R: Read>(archive: &mut tar::Archive<R>) -> ExtractionOutput {
    let mut entries: Vec<ArchiveEntry> = Vec::new();
    let mut warnings: Vec<ArchiveWarning> = Vec::new();
    let mut total_uncompressed: u64 = 0;

    let iter = match archive.entries() {
        Ok(it) => it,
        Err(e) => {
            warnings.push(ArchiveWarning::CorruptArchive {
                detail: format!("tar open failed: {e}"),
            });
            return ExtractionOutput { entries, warnings };
        }
    };

    for (index, entry_result) in iter.enumerate() {
        let mut entry = match entry_result {
            Ok(e) => e,
            Err(e) => {
                warnings.push(ArchiveWarning::CorruptArchive {
                    detail: format!("tar entry {index} unreadable: {e}"),
                });
                continue;
            }
        };

        let provisional_id = format!("entry-{index}");
        let entry_index = index as u64;
        let header = entry.header();
        let entry_type = header.entry_type();
        let uncompressed = header.size().unwrap_or(0);
        let compressed = uncompressed; // tar has no per-entry compression
        let raw_path_string = match entry.path() {
            Ok(p) => p.to_string_lossy().into_owned(),
            Err(e) => {
                warnings.push(ArchiveWarning::EntryDecodeFailed {
                    entry_id: provisional_id.clone(),
                });
                entries.push(make_skipped_entry(
                    provisional_id,
                    entry_index,
                    "<invalid-path>".to_string(),
                    Some(format!("<decode-error: {e}>")),
                    compressed,
                    uncompressed,
                    ArchiveEntryStatus::SkippedDecodeError,
                ));
                continue;
            }
        };

        let path_kind = classify_path(&raw_path_string);

        // Symlink check first — even if the symlink target is benign,
        // we ignore them as a policy (R8). Tar represents them via
        // entry_type Symlink or Link.
        if entry_type.is_symlink() || entry_type.is_hard_link() {
            warnings.push(ArchiveWarning::SymlinkIgnored {
                entry_path: raw_path_string.clone(),
            });
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                sanitise_display_path(&raw_path_string),
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedSymlink,
            ));
            continue;
        }

        match path_kind {
            PathKind::Traversal => {
                warnings.push(ArchiveWarning::PathTraversalRejected {
                    entry_path: raw_path_string.clone(),
                });
                entries.push(make_skipped_entry(
                    provisional_id,
                    entry_index,
                    sanitise_display_path(&raw_path_string),
                    Some(raw_path_string),
                    compressed,
                    uncompressed,
                    ArchiveEntryStatus::SkippedPathTraversal,
                ));
                continue;
            }
            PathKind::Nul => {
                warnings.push(ArchiveWarning::EntryDecodeFailed {
                    entry_id: provisional_id.clone(),
                });
                entries.push(make_skipped_entry(
                    provisional_id,
                    entry_index,
                    "<invalid-path>".to_string(),
                    Some(raw_path_string),
                    compressed,
                    uncompressed,
                    ArchiveEntryStatus::SkippedDecodeError,
                ));
                continue;
            }
            PathKind::Ok => {}
        }

        if entry_type.is_dir() || raw_path_string.ends_with('/') {
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                sanitise_display_path(&raw_path_string),
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedDirectory,
            ));
            continue;
        }

        let (display_path, depth_warning) = enforce_path_depth(&raw_path_string, &provisional_id);
        if let Some(w) = depth_warning {
            warnings.push(w);
        }

        if uncompressed > MAX_ENTRY_BYTES {
            warnings.push(ArchiveWarning::OversizeArchive {
                limit_bytes: MAX_ENTRY_BYTES,
                actual_bytes: uncompressed,
            });
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedOversize,
            ));
            continue;
        }

        if total_uncompressed.saturating_add(uncompressed) > MAX_TOTAL_UNCOMPRESSED_BYTES {
            warnings.push(ArchiveWarning::OversizeArchive {
                limit_bytes: MAX_TOTAL_UNCOMPRESSED_BYTES,
                actual_bytes: total_uncompressed.saturating_add(uncompressed),
            });
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedOversize,
            ));
            continue;
        }

        if uncompressed == 0 {
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedEmpty,
            ));
            continue;
        }

        if has_nested_archive_extension(&display_path) {
            warnings.push(ArchiveWarning::NestedArchiveDetected {
                entry_path: display_path.clone(),
            });
        }

        if !is_text_likely(&display_path) {
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedNonText,
            ));
            continue;
        }

        let mut buf: Vec<u8> = Vec::with_capacity(uncompressed as usize);
        if let Err(e) = entry.read_to_end(&mut buf) {
            warnings.push(ArchiveWarning::CorruptArchive {
                detail: format!("tar entry {index} read error: {e}"),
            });
            entries.push(make_skipped_entry(
                provisional_id,
                entry_index,
                display_path,
                preserve_raw_path(&raw_path_string),
                compressed,
                uncompressed,
                ArchiveEntryStatus::SkippedDecodeError,
            ));
            continue;
        }
        match String::from_utf8(buf) {
            Ok(text) => {
                total_uncompressed = total_uncompressed.saturating_add(uncompressed);
                entries.push(ArchiveEntry {
                    entry_id: provisional_id,
                    entry_index,
                    path: display_path.clone(),
                    raw_path: preserve_raw_path(&raw_path_string),
                    size_bytes_compressed: compressed,
                    size_bytes_uncompressed: uncompressed,
                    status: ArchiveEntryStatus::Extracted,
                    raw_text: Some(text),
                    decode_warning: None,
                });
            }
            Err(e) => {
                warnings.push(ArchiveWarning::EntryDecodeFailed {
                    entry_id: provisional_id.clone(),
                });
                entries.push(ArchiveEntry {
                    entry_id: provisional_id,
                    entry_index,
                    path: display_path,
                    raw_path: preserve_raw_path(&raw_path_string),
                    size_bytes_compressed: compressed,
                    size_bytes_uncompressed: uncompressed,
                    status: ArchiveEntryStatus::SkippedDecodeError,
                    raw_text: None,
                    decode_warning: Some(format!(
                        "invalid utf-8 at byte {}",
                        e.utf8_error().valid_up_to()
                    )),
                });
            }
        }
    }

    ExtractionOutput { entries, warnings }
}

// =====================================================================
// Path + text heuristics
// =====================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PathKind {
    Ok,
    Traversal,
    Nul,
}

/// Inspect a raw path string and decide whether it can survive
/// sanitisation. Traversal segments and NUL bytes are unconditional
/// rejections; absolute paths are accepted (the leading slash gets
/// stripped at display time).
fn classify_path(raw: &str) -> PathKind {
    if raw.contains('\0') {
        return PathKind::Nul;
    }
    for segment in raw.split(['/', '\\']) {
        if segment == ".." {
            return PathKind::Traversal;
        }
    }
    PathKind::Ok
}

/// Normalise a raw path for display. Strips leading separators,
/// collapses backslashes to forward slashes, drops `.` segments.
/// The original raw path is preserved in `ArchiveEntry::raw_path`
/// when it differs.
fn sanitise_display_path(raw: &str) -> String {
    let normalised: String = raw.replace('\\', "/");
    let trimmed = normalised.trim_start_matches('/');
    let segments: Vec<&str> = trimmed
        .split('/')
        .filter(|s| !s.is_empty() && *s != ".")
        .collect();
    segments.join("/")
}

/// Truncate a path that exceeds `MAX_PATH_DEPTH` and surface a
/// `DeepPathTruncated` warning. Returns the display path and the
/// optional warning.
fn enforce_path_depth(
    raw: &str,
    provisional_id: &str,
) -> (String, Option<ArchiveWarning>) {
    let display = sanitise_display_path(raw);
    let segments: Vec<&str> = display.split('/').collect();
    let depth = segments.len() as u64;
    if depth > MAX_PATH_DEPTH {
        let truncated = segments
            .into_iter()
            .take(MAX_PATH_DEPTH as usize)
            .collect::<Vec<_>>()
            .join("/");
        (
            truncated,
            Some(ArchiveWarning::DeepPathTruncated {
                entry_id: provisional_id.to_string(),
                original_depth: depth,
            }),
        )
    } else {
        (display, None)
    }
}

/// Preserve the original raw path on the entry only when sanitisation
/// changed something. Saves wire bytes for the common identical case.
fn preserve_raw_path(raw: &str) -> Option<String> {
    let display = sanitise_display_path(raw);
    if display == raw {
        None
    } else {
        Some(raw.to_string())
    }
}

fn is_text_likely(display_path: &str) -> bool {
    let lower = display_path.to_ascii_lowercase();
    let basename = lower
        .rsplit('/')
        .next()
        .unwrap_or(&lower);
    match basename.rsplit_once('.') {
        // No extension → accept (R10: operator backup tools sometimes
        // produce extensionless files).
        None => true,
        Some((_, ext)) if ext.is_empty() => true,
        Some((_, ext)) => TEXT_LIKELY_EXTENSIONS.contains(&ext),
    }
}

fn has_nested_archive_extension(display_path: &str) -> bool {
    let lower = display_path.to_ascii_lowercase();
    NESTED_ARCHIVE_EXTENSIONS.iter().any(|ext| {
        let dotted = format!(".{ext}");
        lower.ends_with(&dotted)
    })
}

#[allow(clippy::too_many_arguments)]
fn make_skipped_entry(
    entry_id: String,
    entry_index: u64,
    path: String,
    raw_path: Option<String>,
    compressed: u64,
    uncompressed: u64,
    status: ArchiveEntryStatus,
) -> ArchiveEntry {
    ArchiveEntry {
        entry_id,
        entry_index,
        path,
        raw_path,
        size_bytes_compressed: compressed,
        size_bytes_uncompressed: uncompressed,
        status,
        raw_text: None,
        decode_warning: None,
    }
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_bytes_returns_err() {
        let r = archive_intake(&[], ArchiveKind::Zip);
        assert!(r.is_err());
    }

    #[test]
    fn short_bytes_returns_err() {
        let r = archive_intake(&[0u8, 1, 2], ArchiveKind::Zip);
        assert!(r.is_err());
    }

    #[test]
    fn unknown_header_returns_err() {
        let bytes = vec![0xab, 0xcd, 0xef, 0x01, 0x02, 0x03];
        let r = archive_intake(&bytes, ArchiveKind::Zip);
        assert!(r.is_err());
    }

    #[test]
    fn detect_kind_zip_local_header() {
        let bytes = vec![0x50, 0x4b, 0x03, 0x04, 0x00, 0x00];
        assert_eq!(detect_archive_kind(&bytes), ArchiveKind::Zip);
    }

    #[test]
    fn detect_kind_zip_empty_archive_header() {
        let bytes = vec![0x50, 0x4b, 0x05, 0x06, 0x00, 0x00];
        assert_eq!(detect_archive_kind(&bytes), ArchiveKind::Zip);
    }

    #[test]
    fn detect_kind_gzip_magic() {
        let bytes = vec![0x1f, 0x8b, 0x08, 0x00];
        assert_eq!(detect_archive_kind(&bytes), ArchiveKind::TarGz);
    }

    #[test]
    fn detect_kind_tar_ustar_magic() {
        let mut bytes = vec![0u8; 512];
        bytes[257..262].copy_from_slice(b"ustar");
        assert_eq!(detect_archive_kind(&bytes), ArchiveKind::Tar);
    }

    #[test]
    fn classify_path_rejects_traversal() {
        assert_eq!(classify_path("../etc/passwd"), PathKind::Traversal);
        assert_eq!(classify_path("a/../b"), PathKind::Traversal);
        assert_eq!(classify_path("a\\..\\b"), PathKind::Traversal);
    }

    #[test]
    fn classify_path_rejects_nul() {
        assert_eq!(classify_path("foo\0bar"), PathKind::Nul);
    }

    #[test]
    fn classify_path_accepts_absolute_paths() {
        // Absolute paths are NOT traversal; they get the leading slash
        // stripped at display time.
        assert_eq!(classify_path("/etc/network/config"), PathKind::Ok);
    }

    #[test]
    fn sanitise_display_strips_leading_slashes_and_backslashes() {
        assert_eq!(sanitise_display_path("/foo/bar"), "foo/bar");
        assert_eq!(sanitise_display_path("\\foo\\bar"), "foo/bar");
        assert_eq!(sanitise_display_path("foo\\bar"), "foo/bar");
        assert_eq!(sanitise_display_path("./foo/./bar"), "foo/bar");
    }

    #[test]
    fn enforce_depth_truncates_deep_paths() {
        let deep: String = (0..20).map(|i| format!("d{i}")).collect::<Vec<_>>().join("/");
        let (display, warn) = enforce_path_depth(&deep, "entry-0");
        assert_eq!(display.split('/').count(), MAX_PATH_DEPTH as usize);
        assert!(matches!(
            warn,
            Some(ArchiveWarning::DeepPathTruncated { original_depth: 20, .. })
        ));
    }

    #[test]
    fn text_likely_accepts_known_extensions() {
        assert!(is_text_likely("device.cfg"));
        assert!(is_text_likely("device.conf"));
        assert!(is_text_likely("device.config"));
        assert!(is_text_likely("device.txt"));
        assert!(is_text_likely("show.run"));
        assert!(is_text_likely("startup-config.startup"));
    }

    #[test]
    fn text_likely_accepts_no_extension() {
        assert!(is_text_likely("core-switch-01"));
        assert!(is_text_likely("hostname"));
    }

    #[test]
    fn text_likely_rejects_binary_extensions() {
        assert!(!is_text_likely("device.png"));
        assert!(!is_text_likely("device.exe"));
        assert!(!is_text_likely("device.tar"));
    }

    #[test]
    fn nested_archive_extension_detected() {
        assert!(has_nested_archive_extension("inner.zip"));
        assert!(has_nested_archive_extension("inner.tar"));
        assert!(has_nested_archive_extension("inner.tgz"));
        assert!(has_nested_archive_extension("inner.tar.gz"));
        assert!(!has_nested_archive_extension("inner.cfg"));
    }
}
