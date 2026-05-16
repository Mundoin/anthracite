//! V1O-B end-to-end integration harness.
//!
//! Proves the archive intake engine is a clean adapter into the
//! existing V1O-A → V1J → V1K → V1L pipeline. Walks the
//! `zip-multiple-configs` fixture (cisco / junos / eos one-config-per
//! -entry), splits each entry, detects, parses, projects, and
//! asserts the three resulting receipts carry distinct hostnames
//! plus the expected vendor distribution.
//!
//! Honest scope: not a behavioural lock on per-vendor parser output
//! (that's owned by each parser's fixture corpus). This test only
//! locks the V1O-B adapter contract: archive → splitter → existing
//! pipeline produces a coherent receipt per entry.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::{
    archive_intake::{self, ArchiveEntryStatus, ArchiveKind},
    config_detection, config_splitter, network_model::PlatformRef, parsers, receipt,
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
fn archive_to_receipt_chain_yields_three_distinct_hostnames() {
    let bytes = load_zip_multiple_configs();
    let intake = archive_intake::archive_intake(&bytes, ArchiveKind::Zip)
        .expect("archive_intake ok");

    let extracted: Vec<_> = intake
        .entries
        .iter()
        .filter(|e| matches!(e.status, ArchiveEntryStatus::Extracted))
        .collect();
    assert_eq!(
        extracted.len(),
        3,
        "expected 3 extracted entries, got {}",
        extracted.len()
    );

    let mut hostnames: BTreeSet<String> = BTreeSet::new();
    let mut vendors: BTreeSet<String> = BTreeSet::new();

    for entry in extracted {
        let raw_text = entry
            .raw_text
            .as_deref()
            .expect("extracted entry has raw_text");

        // V1O-B adapter contract: each entry's raw_text flows through
        // the existing splitter exactly the same way a paste would.
        let batch = config_splitter::split_config_batch(raw_text);
        assert!(
            !batch.slices.is_empty(),
            "splitter returned 0 slices for entry {}",
            entry.entry_id
        );

        for slice in &batch.slices {
            let det = config_detection::detect_config_platform(&slice.raw_text);
            let best = match det.best_match {
                Some(b) => b,
                None => continue,
            };
            if let Some(v) = best.vendor.clone() {
                vendors.insert(v.to_ascii_lowercase());
            }
            let pref = PlatformRef {
                platform_id: best.platform_id.clone(),
                vendor: best.vendor.clone(),
                os_family: best.os_family.clone(),
                os_version_raw: None,
                os_version_normalized: None,
                detection_confidence: best.detection_confidence,
            };
            let device = match parsers::parse_device_config(pref, &slice.raw_text) {
                Ok(d) => d,
                Err(_) => continue,
            };
            let view = receipt::project_receipt(&device);
            // Receipt header annotations: hostname must travel through
            // parser→receipt projection on every supported platform.
            // We accept either a Some hostname or — defensively — an
            // empty Some, but log a clearer assertion message if the
            // contract drifts.
            if let Some(host) = view.hostname.clone() {
                hostnames.insert(host);
            }
            assert!(
                view.parser_version.is_some(),
                "receipt for slice {} missing parser_version",
                slice.slice_id
            );
        }
    }

    assert!(
        hostnames.contains("r1"),
        "expected hostname r1 in {hostnames:?}"
    );
    assert!(
        hostnames.contains("r2"),
        "expected hostname r2 in {hostnames:?}"
    );
    assert!(
        hostnames.contains("r3"),
        "expected hostname r3 in {hostnames:?}"
    );
    assert!(
        vendors.iter().any(|v| v.contains("cisco")),
        "expected a cisco vendor across slices, got {vendors:?}"
    );
    assert!(
        vendors.iter().any(|v| v.contains("juniper")),
        "expected a juniper vendor across slices, got {vendors:?}"
    );
    assert!(
        vendors.iter().any(|v| v.contains("arista")),
        "expected an arista vendor across slices, got {vendors:?}"
    );
}

#[test]
fn single_entry_archive_routes_through_v1o_single_config_shape() {
    // V1O regression-lock complement (Rust side): a single-entry
    // archive containing a single config splits to exactly one slice
    // with `SplitMethod::SingleConfig`, which the UI uses as its
    // signal to render the V1O single-config flow with no batch
    // chrome. Locked at the engine layer here so any drift fails CI
    // before it can hit the UI test.
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("archives")
        .join("zip-single-config")
        .join("archive.zip");
    let bytes = fs::read(&path).expect("read zip-single-config archive");
    let intake = archive_intake::archive_intake(&bytes, ArchiveKind::Zip)
        .expect("archive_intake ok");
    assert_eq!(intake.extracted_count, 1);
    let entry = intake
        .entries
        .iter()
        .find(|e| matches!(e.status, ArchiveEntryStatus::Extracted))
        .expect("one extracted entry");
    let batch = config_splitter::split_config_batch(
        entry.raw_text.as_deref().expect("extracted has text"),
    );
    assert_eq!(batch.slices.len(), 1);
    assert!(
        matches!(
            batch.method,
            config_splitter::SplitMethod::SingleConfig
        ),
        "expected SplitMethod::SingleConfig for the single-config archive, got {:?}",
        batch.method
    );
}
