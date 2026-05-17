//! V1P C′ runtime enforcement.
//!
//! `DeviceModel.findings` is reserved for parser-emitted findings.
//! The validator MUST NOT mutate `DeviceModel`, MUST NOT read from
//! `DeviceModel.findings`, and MUST NOT write to it. The type
//! signature `&DeviceModel` already guarantees no mutation at
//! compile time; this test exists as a runtime + future-proofing
//! lock against every committed parser fixture.
//!
//! See `docs/architecture/CANONICAL_NETWORK_MODEL.md` C′ section
//! and `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md` §"C′ lock".

use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::{
    network_model::PlatformRef,
    parsers::parse_device_config,
    validator::{
        validate_device, DetectionSource, SelectionMode, ValidatorContext,
    },
};

fn vendor_dirs() -> &'static [(&'static str, &'static str)] {
    &[
        ("cisco-iosxe", "cisco-iosxe"),
        ("juniper-junos", "juniper-junos"),
        ("arista-eos", "arista-eos"),
    ]
}

fn parser_fixtures_root(vendor_dir: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(vendor_dir)
}

#[test]
fn validator_does_not_mutate_device_model_or_touch_findings() {
    let ctx = ValidatorContext {
        platform_id: None,
        parser_id: None,
        parser_version: None,
        selection_mode: SelectionMode::ManualOverride,
        detection_confidence: None,
        detection_source: Some(DetectionSource::ManualOverride),
        source_context: None,
    };

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

            // Belt: findings unchanged across validator call.
            let snapshot_before =
                serde_json::to_string(&model).expect("serialise model before");
            let findings_count_before = model.findings.len();
            let _report = validate_device(&model, &ctx);
            let snapshot_after =
                serde_json::to_string(&model).expect("serialise model after");
            assert_eq!(
                snapshot_before, snapshot_after,
                "validator mutated DeviceModel for fixture {vendor_dir}/{name}"
            );
            // Braces: DeviceModel.findings is empty before AND after
            // (parsers don't currently emit V1I FindingModel; V1P
            // validator must never write here).
            assert_eq!(findings_count_before, 0);
            assert_eq!(model.findings.len(), 0);
        }
    }
    assert!(walked > 0, "no parser fixtures walked");
}
