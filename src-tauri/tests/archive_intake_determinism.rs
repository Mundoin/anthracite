//! V1O-B Archive Intake determinism gate.
//!
//! Locks the engine to the V1O-A splitter / V1J detection / V1K
//! parser invariant: same bytes in → byte-identical
//! `ArchiveIntakeResult` JSON across arbitrarily many runs, and the
//! result round-trips through serde without drift.

use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::archive_intake::{
    archive_intake, ArchiveIntakeResult, ArchiveKind,
};

fn load_zip_multiple_configs() -> Vec<u8> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("archives")
        .join("zip-multiple-configs")
        .join("archive.zip");
    fs::read(&path).unwrap_or_else(|e| {
        panic!(
            "missing zip-multiple-configs fixture at {}: {e}\n\
             run `cargo test --test archive_intake_corpus -- --ignored regenerate_fixtures --nocapture`",
            path.display()
        )
    })
}

#[test]
fn ten_consecutive_runs_yield_byte_identical_json() {
    let bytes = load_zip_multiple_configs();
    let mut snapshots: Vec<String> = Vec::with_capacity(10);
    for _ in 0..10 {
        let result = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
        snapshots.push(serde_json::to_string(&result).expect("serialise"));
    }
    let first = &snapshots[0];
    for (i, snap) in snapshots.iter().enumerate() {
        assert_eq!(
            snap, first,
            "run #{i} drifted from run 0 — engine is non-deterministic"
        );
    }
}

#[test]
fn serde_round_trip_is_byte_stable() {
    let bytes = load_zip_multiple_configs();
    let result = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
    let s1 = serde_json::to_string(&result).expect("serialise 1");
    let back: ArchiveIntakeResult = serde_json::from_str(&s1).expect("deserialise");
    let s2 = serde_json::to_string(&back).expect("serialise 2");
    assert_eq!(s1, s2, "serde round-trip is not byte-stable");
}

#[test]
fn entry_ids_are_scan_order_and_stable() {
    let bytes = load_zip_multiple_configs();
    let a = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
    let b = archive_intake(&bytes, ArchiveKind::Zip).expect("archive_intake ok");
    assert_eq!(a.entries.len(), b.entries.len());
    for (i, (ea, eb)) in a.entries.iter().zip(b.entries.iter()).enumerate() {
        assert_eq!(ea.entry_id, format!("entry-{i}"));
        assert_eq!(ea.entry_id, eb.entry_id);
        assert_eq!(ea.entry_index, i as u64);
        assert_eq!(ea.path, eb.path);
    }
}
