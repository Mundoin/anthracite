//! V1P Validator smoke test against EVERY committed parser fixture.
//!
//! For every fixture under
//! `tests/fixtures/{cisco-iosxe,juniper-junos,arista-eos}/`:
//!   - Parse with the matching parser.
//!   - Run validate_device with a minimal manual-override context.
//!   - Assert no panic, serde round-trip byte-stable, ordering
//!     contract honoured, no finding_key collision, and that a
//!     second run produces byte-identical output.
//!
//! This is a SMOKE gate, not a golden snapshot. Specific report
//! contents are not asserted; the goal is to prove the validator
//! is safe to run against the full parser corpus.

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

fn parser_fixtures_root(vendor_dir: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(vendor_dir)
}

fn vendor_dirs() -> &'static [(&'static str, &'static str)] {
    &[
        ("cisco-iosxe", "cisco-iosxe"),
        ("juniper-junos", "juniper-junos"),
        ("arista-eos", "arista-eos"),
    ]
}

fn ctx_for(platform_id: &str) -> ValidatorContext {
    ValidatorContext {
        platform_id: Some(platform_id.to_string()),
        parser_id: Some(platform_id.to_string()),
        parser_version: None,
        selection_mode: SelectionMode::ManualOverride,
        detection_confidence: None,
        detection_source: Some(DetectionSource::ManualOverride),
        source_context: None,
    }
}

fn assert_findings_ordered(report: &ValidationReport, fixture: &str) {
    for pair in report.findings.windows(2) {
        let a = &pair[0];
        let b = &pair[1];
        // severity DESC: b should not be higher than a.
        assert!(
            a.severity >= b.severity,
            "fixture {fixture}: findings not severity-sorted ({:?} before {:?})",
            a.severity,
            b.severity
        );
        if a.severity == b.severity {
            assert!(
                a.rule_id <= b.rule_id,
                "fixture {fixture}: equal-severity findings not rule_id-sorted"
            );
            if a.rule_id == b.rule_id {
                assert!(
                    a.finding_key <= b.finding_key,
                    "fixture {fixture}: equal-rule findings not finding_key-sorted"
                );
            }
        }
    }
    for pair in report.clean_rules.windows(2) {
        assert!(
            pair[0] <= pair[1],
            "fixture {fixture}: clean_rules not sorted"
        );
    }
    for pair in report.skipped_rules.windows(2) {
        assert!(
            pair[0].rule_id <= pair[1].rule_id,
            "fixture {fixture}: skipped_rules not rule_id-sorted"
        );
    }
}

#[test]
fn every_parser_fixture_validates_without_panic_or_drift() {
    let mut walked = 0usize;
    for (vendor_dir, platform_id) in vendor_dirs() {
        let root = parser_fixtures_root(vendor_dir);
        if !root.is_dir() {
            continue;
        }
        for entry in fs::read_dir(&root).expect("read vendor root") {
            let entry = entry.expect("dir entry");
            if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                continue;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            let config_path = entry.path().join("config.cfg");
            if !config_path.is_file() {
                continue;
            }
            walked += 1;

            let config = fs::read_to_string(&config_path)
                .unwrap_or_else(|e| panic!("read {}: {e}", config_path.display()));
            let pref = PlatformRef {
                platform_id: Some(platform_id.to_string()),
                vendor: None,
                os_family: None,
                os_version_raw: None,
                os_version_normalized: None,
                detection_confidence: None,
            };
            let model = parse_device_config(pref, &config)
                .unwrap_or_else(|e| panic!("parse {}: {e}", config_path.display()));
            let ctx = ctx_for(platform_id);

            let r1 = validate_device(&model, &ctx);
            let r2 = validate_device(&model, &ctx);
            let s1 = serde_json::to_string(&r1).expect("serialise r1");
            let s2 = serde_json::to_string(&r2).expect("serialise r2");
            assert_eq!(
                s1, s2,
                "fixture {vendor_dir}/{name}: repeated validation not byte-identical"
            );

            // serde round-trip byte-stable
            let back: ValidationReport =
                serde_json::from_str(&s1).expect("deserialise");
            let s3 = serde_json::to_string(&back).expect("re-serialise");
            assert_eq!(
                s1, s3,
                "fixture {vendor_dir}/{name}: serde round-trip not byte-stable"
            );

            assert_findings_ordered(&r1, &format!("{vendor_dir}/{name}"));

            // finding_key uniqueness
            let mut seen: BTreeSet<String> = BTreeSet::new();
            for f in &r1.findings {
                assert!(
                    seen.insert(f.finding_key.clone()),
                    "fixture {vendor_dir}/{name}: duplicate finding_key {}",
                    f.finding_key
                );
            }
        }
    }
    assert!(walked > 0, "no parser fixtures walked");
}
