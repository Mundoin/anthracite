//! V1P Validator determinism gate.
//!
//! For every committed validator fixture: serialise the validation
//! report 10× → assert byte-identical. Round-trip serde →
//! byte-stable. Detect any `finding_key` collision in the produced
//! reports.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::{
    network_model::PlatformRef,
    parsers::parse_device_config,
    validator::{
        validate_device, DetectionSource, SelectionMode, ValidationReport,
        ValidatorContext,
    },
};

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("validator")
}

fn fixture_names() -> Vec<String> {
    // Manifest list is short and stable — embed inline to keep this
    // test file independent of `validator_corpus.rs` helpers.
    vec![
        "clean-baseline".to_string(),
        "mgmt-hyg-001-default-community".to_string(),
        "mgmt-hyg-002-snmp-communities".to_string(),
        "mgmt-hyg-003-no-ssh".to_string(),
    ]
}

fn parse_for_fixture(name: &str) -> ValidationReport {
    let dir = fixtures_root().join(name);
    let config = fs::read_to_string(dir.join("config.cfg"))
        .expect("read fixture config.cfg");
    let pref = PlatformRef {
        platform_id: Some("cisco-iosxe".to_string()),
        vendor: None,
        os_family: None,
        os_version_raw: None,
        os_version_normalized: None,
        detection_confidence: None,
    };
    let model = parse_device_config(pref, &config).expect("parse");
    let ctx = ValidatorContext {
        platform_id: Some("cisco-iosxe".to_string()),
        parser_id: Some("cisco-iosxe".to_string()),
        parser_version: Some("3".to_string()),
        selection_mode: SelectionMode::ManualOverride,
        detection_confidence: None,
        detection_source: Some(DetectionSource::ManualOverride),
        source_context: None,
    };
    validate_device(&model, &ctx)
}

#[test]
fn ten_runs_per_fixture_byte_identical() {
    for name in fixture_names() {
        let first = serde_json::to_string(&parse_for_fixture(&name)).unwrap();
        for i in 1..10 {
            let snap = serde_json::to_string(&parse_for_fixture(&name)).unwrap();
            assert_eq!(
                snap, first,
                "fixture '{name}' run #{i} drifted from run 0"
            );
        }
    }
}

#[test]
fn serde_round_trip_is_byte_stable() {
    for name in fixture_names() {
        let report = parse_for_fixture(&name);
        let s1 = serde_json::to_string(&report).unwrap();
        let back: ValidationReport = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&back).unwrap();
        assert_eq!(s1, s2, "fixture '{name}' serde round-trip not byte-stable");
    }
}

#[test]
fn no_finding_key_collision_in_any_fixture() {
    for name in fixture_names() {
        let report = parse_for_fixture(&name);
        let mut seen: BTreeSet<String> = BTreeSet::new();
        for f in &report.findings {
            assert!(
                seen.insert(f.finding_key.clone()),
                "fixture '{name}' has duplicate finding_key: {}",
                f.finding_key
            );
        }
    }
}
