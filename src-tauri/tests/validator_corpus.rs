//! V1P Validator corpus harness.
//!
//! Two roles:
//!
//!   1. **Regeneration helper** (`regenerate_validator_corpus`,
//!      `#[ignore]`) — for each fixture in `_manifest.toml`, parses
//!      `config.cfg` with the platform-targeted parser, runs the
//!      validator with the platform.toml-derived context, and writes
//!      the resulting `ValidationReport` to `expected_report.json`.
//!      Run with `cargo test --test validator_corpus -- --ignored
//!      regenerate_validator_corpus --nocapture`.
//!
//!   2. **Frozen corpus assertion** (`every_fixture_validates_to_expected`)
//!      — the actual gate. For every committed fixture, asserts the
//!      validator's output is byte-equal to the committed
//!      `expected_report.json` after canonical pretty-print.
//!
//! Companion to `validator_determinism.rs`,
//! `validator_version_guard.rs`,
//! `validator_existing_fixtures_smoke.rs`, and
//! `validator_does_not_mutate_device_model.rs`.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::{
    network_model::PlatformRef,
    parsers::parse_device_config,
    validator::{
        validate_device, DetectionSource, SelectionMode, SourceContext, SourceKind,
        ValidationReport, ValidatorContext,
    },
};

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("validator")
}

fn manifest_path() -> PathBuf {
    fixtures_root().join("_manifest.toml")
}

fn fixture_names() -> Vec<String> {
    let text = fs::read_to_string(manifest_path()).expect("read validator manifest");
    parse_fixture_list(&text)
}

fn parse_fixture_list(text: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut in_list = false;
    for raw in text.lines() {
        let line = raw.trim();
        if line.starts_with("fixtures") {
            in_list = true;
            continue;
        }
        if !in_list {
            continue;
        }
        if line.starts_with(']') {
            break;
        }
        if let Some(stripped) = line.strip_prefix('"') {
            if let Some(name) = stripped.split('"').next() {
                if !name.is_empty() {
                    out.push(name.to_string());
                }
            }
        }
    }
    out
}

#[derive(Debug)]
struct PlatformToml {
    platform_id: String,
    parser_id: Option<String>,
    parser_version: Option<String>,
    selection_mode: SelectionMode,
}

fn read_platform_toml(path: &PathBuf) -> PlatformToml {
    let text = fs::read_to_string(path)
        .unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
    let mut platform_id: Option<String> = None;
    let mut parser_id: Option<String> = None;
    let mut parser_version: Option<String> = None;
    let mut selection_mode = SelectionMode::ManualOverride;
    for raw in text.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let (key, value) = match line.split_once('=') {
            Some(kv) => kv,
            None => continue,
        };
        let key = key.trim();
        let value = value.trim().trim_matches('"');
        match key {
            "platform_id" => platform_id = Some(value.to_string()),
            "parser_id" => parser_id = Some(value.to_string()),
            "parser_version" => parser_version = Some(value.to_string()),
            "selection_mode" => {
                selection_mode = match value {
                    "from_detection" => SelectionMode::FromDetection,
                    _ => SelectionMode::ManualOverride,
                };
            }
            _ => {}
        }
    }
    PlatformToml {
        platform_id: platform_id.expect("platform.toml missing platform_id"),
        parser_id,
        parser_version,
        selection_mode,
    }
}

fn run_fixture(name: &str) -> (ValidationReport, ValidatorContext) {
    let dir = fixtures_root().join(name);
    let config_path = dir.join("config.cfg");
    let platform_path = dir.join("platform.toml");
    let config_text = fs::read_to_string(&config_path)
        .unwrap_or_else(|e| panic!("read {}: {e}", config_path.display()));
    let pt = read_platform_toml(&platform_path);

    let pref = PlatformRef {
        platform_id: Some(pt.platform_id.clone()),
        vendor: None,
        os_family: None,
        os_version_raw: None,
        os_version_normalized: None,
        detection_confidence: None,
    };

    let model = parse_device_config(pref, &config_text)
        .unwrap_or_else(|e| panic!("parse {}: {e}", config_path.display()));

    let ctx = ValidatorContext {
        platform_id: Some(pt.platform_id),
        parser_id: pt.parser_id,
        parser_version: pt.parser_version,
        selection_mode: pt.selection_mode,
        detection_confidence: None,
        detection_source: Some(DetectionSource::ManualOverride),
        source_context: Some(SourceContext {
            kind: Some(SourceKind::File),
            label: Some(format!("validator-fixture/{name}/config.cfg")),
            archive_name: None,
            slice_id: None,
        }),
    };

    let report = validate_device(&model, &ctx);
    (report, ctx)
}

fn canonical_json(report: &ValidationReport) -> String {
    serde_json::to_string_pretty(report).expect("serialise report")
}

#[test]
#[ignore]
fn regenerate_validator_corpus() {
    for name in fixture_names() {
        let (report, _ctx) = run_fixture(&name);
        let mut json = canonical_json(&report);
        json.push('\n');
        let dest = fixtures_root().join(&name).join("expected_report.json");
        fs::write(&dest, json).expect("write expected_report.json");
        eprintln!(
            "regenerated {name}: {} findings, {} clean, {} skipped",
            report.findings.len(),
            report.clean_rules.len(),
            report.skipped_rules.len(),
        );
    }
}

#[test]
fn every_fixture_validates_to_expected() {
    for name in fixture_names() {
        let (actual, _ctx) = run_fixture(&name);
        let expected_path =
            fixtures_root().join(&name).join("expected_report.json");
        let expected_text = fs::read_to_string(&expected_path).unwrap_or_else(|e| {
            panic!(
                "missing expected_report.json at {}: {e}\n\
                 run `cargo test --test validator_corpus -- --ignored regenerate_validator_corpus --nocapture`",
                expected_path.display()
            )
        });
        let expected: ValidationReport =
            serde_json::from_str(&expected_text).unwrap_or_else(|e| {
                panic!(
                    "expected_report.json at {} is not valid: {e}",
                    expected_path.display()
                )
            });
        let canon_actual = canonical_json(&actual);
        let canon_expected = canonical_json(&expected);
        assert_eq!(
            canon_actual.trim(),
            canon_expected.trim(),
            "validator fixture '{name}' drifted from committed expected_report.json"
        );
    }
}

#[test]
fn manifest_matches_on_disk_directories() {
    let manifest_set: BTreeSet<String> = fixture_names().into_iter().collect();
    let on_disk: BTreeSet<String> = fs::read_dir(fixtures_root())
        .expect("read validator fixtures root")
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    assert_eq!(
        manifest_set, on_disk,
        "_manifest.toml fixtures list and on-disk validator fixture directories disagree"
    );
}
