//! V1O-A end-to-end integration harness.
//!
//! Proves that the splitter's output is genuinely compatible with the
//! existing per-device pipeline (detection → parse → receipt). Uses the
//! `mixed-cisco-junos-eos` fixture: three vendors in one paste, no
//! explicit separators.
//!
//! Honest scope: this is an integration smoke, not a behavioural lock.
//! Per-vendor parser correctness is locked by each parser's own
//! fixture corpus. This test only proves the splitter hands off
//! sensible slices to the existing engines.

use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::{
    config_detection, config_splitter, network_model::PlatformRef, parsers, receipt,
};

const FIXTURE: &str = "tests/fixtures/config-batches/mixed-cisco-junos-eos/config.cfg";

fn read_fixture() -> String {
    fs::read_to_string(PathBuf::from(FIXTURE))
        .unwrap_or_else(|e| panic!("read fixture {FIXTURE}: {e}"))
}

#[test]
fn split_then_detect_per_slice_recognises_three_vendors() {
    let cfg = read_fixture();
    let batch = config_splitter::split_config_batch(&cfg);
    assert!(
        batch.slices.len() >= 3,
        "expected at least 3 slices from mixed three-vendor input, got {} ({:?})",
        batch.slices.len(),
        batch.method
    );

    let mut vendors: Vec<String> = Vec::new();
    for slice in &batch.slices {
        let det = config_detection::detect_config_platform(&slice.raw_text);
        if let Some(best) = det.best_match {
            if let Some(v) = best.vendor {
                vendors.push(v);
            }
        }
    }
    // We expect cisco, juniper and arista to each show up at least once.
    let lowered: Vec<String> = vendors.iter().map(|v| v.to_lowercase()).collect();
    assert!(
        lowered.iter().any(|v| v.contains("cisco")),
        "no cisco vendor detected across slices; got {vendors:?}"
    );
    assert!(
        lowered.iter().any(|v| v.contains("juniper")),
        "no juniper vendor detected across slices; got {vendors:?}"
    );
    assert!(
        lowered.iter().any(|v| v.contains("arista")),
        "no arista vendor detected across slices; got {vendors:?}"
    );
}

#[test]
fn split_then_detect_parse_project_each_slice() {
    let cfg = read_fixture();
    let batch = config_splitter::split_config_batch(&cfg);
    assert!(!batch.slices.is_empty(), "no slices produced");

    let mut parsed_at_least_one = false;
    for slice in &batch.slices {
        let det = config_detection::detect_config_platform(&slice.raw_text);
        // If detection yields a known platform, run parse + project.
        let best = match det.best_match {
            Some(b) => b,
            None => continue,
        };
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
        let receipt = receipt::project_receipt(&device);
        assert!(
            receipt.parser_version.is_some(),
            "slice {}: receipt missing parser_version",
            slice.slice_id
        );
        // The parser_version field is the contract surface — any non-empty
        // string proves a parser ran end-to-end on this slice.
        parsed_at_least_one = true;
    }
    assert!(
        parsed_at_least_one,
        "no slice survived the full detect → parse → project chain"
    );
}
