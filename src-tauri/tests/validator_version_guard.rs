//! V1P Validator version guard.
//!
//! Three-way parity check:
//!   1. `engines::validator::VALIDATOR_VERSION` constant
//!   2. `tests/fixtures/validator/_manifest.toml::validator_version`
//!   3. on-disk fixture directories listed in the manifest
//!
//! Intentionally separate from the parser / splitter / archive
//! intake version guards. Each engine evolves independently.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::validator::{RULE_PACK_VERSION, VALIDATOR_VERSION};

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("validator")
}

fn manifest_text() -> String {
    fs::read_to_string(fixtures_root().join("_manifest.toml"))
        .expect("read validator manifest")
}

fn parse_uint_field(text: &str, key: &str) -> u32 {
    for raw in text.lines() {
        let line = raw.trim();
        if let Some(rest) = line.strip_prefix(key) {
            let value = rest
                .trim_start_matches(|c: char| c.is_whitespace() || c == '=')
                .trim();
            return value
                .parse::<u32>()
                .unwrap_or_else(|e| panic!("manifest {key} not u32: '{value}' ({e})"));
        }
    }
    panic!("manifest missing {key}");
}

fn parse_fixtures_list(text: &str) -> BTreeSet<String> {
    let mut out: BTreeSet<String> = BTreeSet::new();
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
                    out.insert(name.to_string());
                }
            }
        }
    }
    out
}

#[test]
fn rust_constant_matches_manifest_validator_version() {
    let v = parse_uint_field(&manifest_text(), "validator_version");
    assert_eq!(
        VALIDATOR_VERSION, v,
        "VALIDATOR_VERSION constant and manifest disagree — bump together"
    );
}

#[test]
fn rust_constant_matches_manifest_rule_pack_version() {
    let v = parse_uint_field(&manifest_text(), "rule_pack_version");
    assert_eq!(
        RULE_PACK_VERSION, v,
        "RULE_PACK_VERSION constant and manifest disagree — bump together"
    );
}

#[test]
fn every_manifest_fixture_exists_on_disk() {
    let names = parse_fixtures_list(&manifest_text());
    assert!(!names.is_empty(), "manifest fixtures list parsed empty");
    let root = fixtures_root();
    for name in &names {
        let dir = root.join(name);
        assert!(
            dir.is_dir(),
            "manifest lists '{name}' but {dir:?} does not exist"
        );
        assert!(
            dir.join("config.cfg").is_file(),
            "fixture '{name}' missing config.cfg"
        );
        assert!(
            dir.join("platform.toml").is_file(),
            "fixture '{name}' missing platform.toml"
        );
        assert!(
            dir.join("expected_report.json").is_file(),
            "fixture '{name}' missing expected_report.json"
        );
    }
}

#[test]
fn no_orphan_fixture_directories_on_disk() {
    let names = parse_fixtures_list(&manifest_text());
    let on_disk: BTreeSet<String> = fs::read_dir(fixtures_root())
        .expect("read validator fixtures root")
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    let orphans: Vec<_> = on_disk.difference(&names).collect();
    assert!(
        orphans.is_empty(),
        "orphan validator fixture directories not in manifest: {orphans:?}"
    );
}

#[test]
fn versions_are_currently_one() {
    // V1P lands at validator/rule-pack version 1. Any future bump
    // must update this test alongside the constants + manifest.
    assert_eq!(VALIDATOR_VERSION, 1);
    assert_eq!(RULE_PACK_VERSION, 1);
}
