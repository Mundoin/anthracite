//! V1O-B Archive Intake safety-cap test suite.
//!
//! Nine adversarial scenarios constructed in-test using the zip / tar
//! / flate2 crates. Each case asserts that the engine surfaces the
//! correct typed warning and per-entry status without panicking and
//! without unbounded resource use.
//!
//! These scenarios are deliberately NOT committed as binary fixtures:
//!   - compression bombs are non-trivial to commit safely
//!   - the construction code IS the contract under test
//!
//! Maps to V1O-B prompt §FIXTURE SCOPE items 5–13.

use std::io::Write;

use anthracite_lib::engines::archive_intake::{
    archive_intake, ArchiveEntryStatus, ArchiveKind, ArchiveWarning,
    MAX_ENTRIES, MAX_ENTRY_BYTES,
};

// =====================================================================
// Helpers
// =====================================================================

fn fixed_zip_options() -> zip::write::FileOptions {
    zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644)
        .last_modified_time(
            zip::DateTime::from_date_and_time(2020, 1, 1, 0, 0, 0)
                .expect("fixed zip datetime"),
        )
}

fn fixed_stored_zip_options() -> zip::write::FileOptions {
    // "Stored" (no compression) — useful when we want compressed
    // size == uncompressed size so a separate oversize cap fires.
    zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o644)
        .last_modified_time(
            zip::DateTime::from_date_and_time(2020, 1, 1, 0, 0, 0)
                .expect("fixed zip datetime"),
        )
}

fn build_zip<F>(populate: F) -> Vec<u8>
where
    F: FnOnce(&mut zip::ZipWriter<std::io::Cursor<Vec<u8>>>),
{
    let cursor = std::io::Cursor::new(Vec::<u8>::new());
    let mut writer = zip::ZipWriter::new(cursor);
    populate(&mut writer);
    writer.finish().expect("zip finish").into_inner()
}

fn build_tar<F>(populate: F) -> Vec<u8>
where
    F: FnOnce(&mut tar::Builder<&mut Vec<u8>>),
{
    let mut out: Vec<u8> = Vec::new();
    {
        let mut builder = tar::Builder::new(&mut out);
        populate(&mut builder);
        builder.finish().expect("tar finish");
    }
    out
}

// =====================================================================
// Scenario 5 — compression bomb (ratio > MAX_COMPRESSION_RATIO)
// =====================================================================

#[test]
fn compression_bomb_skipped_with_ratio_warning() {
    // 1 MiB of zeros compresses to a few hundred bytes via deflate —
    // ratio well above 100×.
    let payload = vec![0u8; 1024 * 1024];
    let bytes = build_zip(|w| {
        w.start_file("bomb.cfg", fixed_zip_options())
            .expect("start_file");
        w.write_all(&payload).expect("write payload");
    });
    let result = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
    assert_eq!(result.entries.len(), 1);
    assert!(
        matches!(result.entries[0].status, ArchiveEntryStatus::SkippedOversize),
        "expected SkippedOversize, got {:?}",
        result.entries[0].status
    );
    assert!(
        result
            .warnings
            .iter()
            .any(|w| matches!(w, ArchiveWarning::CompressionRatioExceeded { .. })),
        "expected CompressionRatioExceeded warning, got {:?}",
        result.warnings
    );
}

// =====================================================================
// Scenario 6 — single oversize entry (> MAX_ENTRY_BYTES)
// =====================================================================

#[test]
fn oversize_entry_skipped_with_oversize_warning() {
    // (MAX_ENTRY_BYTES + 1) of varying bytes, stored uncompressed so
    // the ratio cap doesn't fire first. Use non-zero bytes so deflate
    // can't trivially crush them either — Stored is the cleaner
    // guarantee.
    let payload: Vec<u8> = (0..(MAX_ENTRY_BYTES + 1)).map(|n| (n % 251) as u8).collect();
    let bytes = build_zip(|w| {
        w.start_file("huge.cfg", fixed_stored_zip_options())
            .expect("start_file");
        w.write_all(&payload).expect("write payload");
    });
    let result = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
    assert_eq!(result.entries.len(), 1);
    assert!(matches!(
        result.entries[0].status,
        ArchiveEntryStatus::SkippedOversize
    ));
    assert!(
        result
            .warnings
            .iter()
            .any(|w| matches!(w, ArchiveWarning::OversizeArchive { .. })),
        "expected OversizeArchive warning, got {:?}",
        result.warnings
    );
}

// =====================================================================
// Scenario 7 — path traversal (../../etc/passwd)
// =====================================================================

#[test]
fn path_traversal_skipped_with_rejected_warning() {
    let bytes = build_zip(|w| {
        w.start_file("../../etc/passwd", fixed_zip_options())
            .expect("start_file");
        w.write_all(b"root:x:0:0:root:/root:/bin/bash\n")
            .expect("write");
    });
    let result = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
    assert_eq!(result.entries.len(), 1);
    assert!(matches!(
        result.entries[0].status,
        ArchiveEntryStatus::SkippedPathTraversal
    ));
    assert!(
        result
            .warnings
            .iter()
            .any(|w| matches!(w, ArchiveWarning::PathTraversalRejected { .. })),
        "expected PathTraversalRejected, got {:?}",
        result.warnings
    );
}

// =====================================================================
// Scenario 8 — symlink in tar
// =====================================================================

#[test]
fn symlink_in_tar_ignored_with_symlink_warning() {
    let bytes = build_tar(|builder| {
        let mut header = tar::Header::new_gnu();
        header.set_path("link-to-cfg").expect("set_path");
        header
            .set_link_name("/etc/network/config")
            .expect("set_link_name");
        header.set_size(0);
        header.set_mode(0o777);
        header.set_uid(0);
        header.set_gid(0);
        header.set_mtime(0);
        header.set_entry_type(tar::EntryType::Symlink);
        header.set_cksum();
        builder.append(&header, std::io::empty()).expect("append");
    });
    let result = archive_intake(&bytes, ArchiveKind::Tar).expect("archive_intake ok");
    assert_eq!(result.entries.len(), 1);
    assert!(matches!(
        result.entries[0].status,
        ArchiveEntryStatus::SkippedSymlink
    ));
    assert!(
        result
            .warnings
            .iter()
            .any(|w| matches!(w, ArchiveWarning::SymlinkIgnored { .. })),
        "expected SymlinkIgnored, got {:?}",
        result.warnings
    );
}

// =====================================================================
// Scenario 9 — too many entries (> MAX_ENTRIES)
// =====================================================================

#[test]
fn too_many_entries_truncated_with_warning() {
    let bytes = build_zip(|w| {
        for i in 0..=MAX_ENTRIES {
            // Small body per entry so total uncompressed stays small.
            let name = format!("file{i}.cfg");
            w.start_file(name, fixed_zip_options())
                .expect("start_file");
            w.write_all(b"hostname x\n").expect("write");
        }
    });
    let result = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
    assert_eq!(result.entry_count, MAX_ENTRIES);
    assert!(
        result
            .warnings
            .iter()
            .any(|w| matches!(w, ArchiveWarning::TooManyEntries { actual, .. } if *actual == MAX_ENTRIES + 1)),
        "expected TooManyEntries with actual={}, got {:?}",
        MAX_ENTRIES + 1,
        result.warnings
    );
}

// =====================================================================
// Scenario 10 — nested archive (zip inside zip)
// =====================================================================

#[test]
fn nested_archive_warning_emitted_inner_not_recursed() {
    // Build an inner valid zip with one config.
    let inner = build_zip(|w| {
        w.start_file("inner.cfg", fixed_zip_options())
            .expect("start_file");
        w.write_all(b"hostname inner\n").expect("write");
    });
    // Wrap it as a single entry in an outer zip. Use Stored so the
    // inner zip's bytes survive unmodified (and crucially, won't
    // decode as UTF-8).
    let outer = build_zip(|w| {
        w.start_file("payload.zip", fixed_stored_zip_options())
            .expect("start_file");
        w.write_all(&inner).expect("write inner");
    });
    let result = archive_intake(&outer, ArchiveKind::Zip).expect("archive_intake ok");
    assert_eq!(result.entries.len(), 1);
    // .zip extension is in the nested-archive list and NOT in the
    // text-likely list, so the entry is SkippedNonText. The
    // NestedArchiveDetected warning still fires.
    assert!(matches!(
        result.entries[0].status,
        ArchiveEntryStatus::SkippedNonText
    ));
    assert!(
        result
            .warnings
            .iter()
            .any(|w| matches!(w, ArchiveWarning::NestedArchiveDetected { .. })),
        "expected NestedArchiveDetected, got {:?}",
        result.warnings
    );
}

// =====================================================================
// Scenario 11 — corrupt archive
// =====================================================================

#[test]
fn corrupt_zip_returns_corrupt_warning_or_err() {
    // Valid local-file-header magic, then garbage.
    let mut bytes = vec![0x50u8, 0x4b, 0x03, 0x04];
    bytes.extend_from_slice(&[0xff; 64]);
    // Header is valid → engine proceeds → zip decoder errors out.
    // Behaviour contract (per ARCHIVE_INTAKE_CONTRACT.md): truncated
    // body but valid header returns Ok with CorruptArchive; truncated
    // header (below minimum bytes) returns Err. This input has a
    // valid header → Ok + CorruptArchive expected.
    match archive_intake(&bytes, ArchiveKind::Zip) {
        Ok(result) => {
            assert!(
                result
                    .warnings
                    .iter()
                    .any(|w| matches!(w, ArchiveWarning::CorruptArchive { .. })),
                "expected CorruptArchive warning in Ok path, got {:?}",
                result.warnings
            );
        }
        Err(e) => {
            // Tolerated alternative when the decoder rejects up-front.
            assert!(e.to_ascii_lowercase().contains("zip") || e.to_ascii_lowercase().contains("archive"),
                "unexpected Err shape: {e}");
        }
    }
}

#[test]
fn truncated_header_below_min_size_returns_err() {
    let bytes = vec![0x50u8]; // 1 byte, well below 4-byte minimum.
    assert!(archive_intake(&bytes, ArchiveKind::Zip).is_err());
}

// =====================================================================
// Scenario 12 — empty archive
// =====================================================================

#[test]
fn empty_zip_returns_zero_entries_and_empty_warning() {
    let bytes = build_zip(|_w| {
        // No entries.
    });
    let result = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
    assert_eq!(result.entry_count, 0);
    assert!(
        result
            .warnings
            .iter()
            .any(|w| matches!(w, ArchiveWarning::EmptyArchive)),
        "expected EmptyArchive, got {:?}",
        result.warnings
    );
}

// =====================================================================
// Scenario 13 — kind mismatch (zip bytes, tar hint)
// =====================================================================

#[test]
fn kind_mismatch_proceeds_with_detected_kind_and_warning() {
    let bytes = build_zip(|w| {
        w.start_file("r1.cfg", fixed_zip_options())
            .expect("start_file");
        w.write_all(b"hostname r1\nend\n").expect("write");
    });
    let result = archive_intake(&bytes, ArchiveKind::Tar).expect("archive_intake ok");
    assert_eq!(result.archive_kind_detected, ArchiveKind::Zip);
    assert_eq!(result.archive_kind_supplied, ArchiveKind::Tar);
    assert!(
        result
            .warnings
            .iter()
            .any(|w| matches!(
                w,
                ArchiveWarning::KindMismatch {
                    supplied: ArchiveKind::Tar,
                    detected: ArchiveKind::Zip
                }
            )),
        "expected KindMismatch{{supplied:Tar, detected:Zip}}, got {:?}",
        result.warnings
    );
    // Extraction proceeds with the detected kind.
    assert_eq!(result.entries.len(), 1);
    assert!(matches!(
        result.entries[0].status,
        ArchiveEntryStatus::Extracted
    ));
}
