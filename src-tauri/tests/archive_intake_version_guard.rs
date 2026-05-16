//! V1O-B Archive Intake version guard.
//!
//! Enforces three-way agreement between:
//!
//!   1. the Rust constant `archive_intake::ARCHIVE_INTAKE_VERSION`,
//!   2. `src-tauri/tests/fixtures/archives/_manifest.toml::archive_intake_version`,
//!   3. the on-disk fixture directories.
//!
//! Intentionally separate from the parser version guard and the
//! splitter version guard — the archive intake engine evolves
//! independently and carries its own bump policy.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::archive_intake;

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("archives")
}

fn manifest_text() -> String {
    fs::read_to_string(fixtures_root().join("_manifest.toml"))
        .expect("read archives manifest")
}

fn parse_manifest_version(text: &str) -> u32 {
    for line in text.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("archive_intake_version") {
            let value = rest
                .trim_start_matches(|c: char| c.is_whitespace() || c == '=')
                .trim();
            return value.parse::<u32>().unwrap_or_else(|e| {
                panic!("manifest archive_intake_version is not u32: '{value}' ({e})")
            });
        }
    }
    panic!("manifest is missing archive_intake_version");
}

fn parse_manifest_fixtures(text: &str) -> BTreeSet<String> {
    text.lines()
        .filter_map(|l| {
            let trimmed = l.trim();
            if trimmed.starts_with('"') && trimmed.ends_with("\",") {
                Some(
                    trimmed
                        .trim_start_matches('"')
                        .trim_end_matches("\",")
                        .to_string(),
                )
            } else {
                None
            }
        })
        .collect()
}

#[test]
fn rust_constant_matches_manifest_version() {
    let manifest_version = parse_manifest_version(&manifest_text());
    assert_eq!(
        archive_intake::ARCHIVE_INTAKE_VERSION, manifest_version,
        "ARCHIVE_INTAKE_VERSION constant and manifest disagree — bump together",
    );
}

#[test]
fn every_manifest_fixture_exists_on_disk() {
    let names = parse_manifest_fixtures(&manifest_text());
    assert!(!names.is_empty(), "manifest fixtures list parsed empty");
    let root = fixtures_root();
    for name in &names {
        let dir = root.join(name);
        assert!(
            dir.is_dir(),
            "manifest lists '{name}' but {dir:?} does not exist on disk"
        );
    }
}

#[test]
fn no_orphan_fixture_directories_on_disk() {
    let names = parse_manifest_fixtures(&manifest_text());
    let on_disk: BTreeSet<String> = fs::read_dir(fixtures_root())
        .expect("read archives root")
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    let orphans: Vec<_> = on_disk.difference(&names).collect();
    assert!(
        orphans.is_empty(),
        "orphan fixture directories not in manifest: {orphans:?}"
    );
}

#[test]
fn archive_intake_version_is_currently_one() {
    // V1O-B lands at version 1. Any future bump must update this
    // test alongside the constant + manifest; the explicit assertion
    // forces the bump to be a deliberate three-line change.
    assert_eq!(archive_intake::ARCHIVE_INTAKE_VERSION, 1);
}
