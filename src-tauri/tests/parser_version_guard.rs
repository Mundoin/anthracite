//! V1L parser-version guard.
//!
//! This is a small, focused gate that fires CI red whenever the
//! cisco-iosxe parser_version, the fixture manifest, and the on-disk
//! fixture set drift apart from each other. It is intentionally separate
//! from the full corpus harness (`cisco_iosxe_fixture_corpus.rs`) so that
//! a single failure surface speaks to "did the contract drift?" rather
//! than "did one fixture's output drift?".
//!
//! ## What this guards
//!
//! - `_manifest.toml::parser_version` == `cisco_iosxe::PARSER_VERSION`
//! - every directory under `tests/fixtures/cisco-iosxe/` is listed in
//!   the manifest, and every name in the manifest exists on disk
//! - every listed fixture has a `config.cfg`
//!
//! ## Honest limitation
//!
//! This guard CANNOT tell you whether a parser change *should* have
//! required a `PARSER_VERSION` bump. It only enforces that the three
//! version-bearing artefacts (source constant, manifest, fixture list)
//! agree with each other. Human review is still the authority on whether
//! a behavioural change warranted a version bump in the first place.
//! See `docs/architecture/PARSER_VERSIONING.md` for the full bump
//! policy and the meaning of this limitation.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

const FIXTURE_ROOT: &str = "tests/fixtures/cisco-iosxe";
const MANIFEST_FILE: &str = "_manifest.toml";

fn manifest_path() -> PathBuf {
    PathBuf::from(FIXTURE_ROOT).join(MANIFEST_FILE)
}

fn read_manifest_version_and_fixtures() -> (u32, Vec<String>) {
    let raw = fs::read_to_string(manifest_path())
        .expect("read _manifest.toml");
    let mut parser_version: Option<u32> = None;
    let mut fixtures: Vec<String> = Vec::new();
    let mut in_list = false;
    for line in raw.lines() {
        let l = line.trim();
        if l.is_empty() || l.starts_with('#') {
            continue;
        }
        if in_list {
            if l.starts_with(']') {
                in_list = false;
                continue;
            }
            if let Some(name) = extract_quoted(l) {
                fixtures.push(name);
            }
            continue;
        }
        if let Some(rest) = l.strip_prefix("parser_version") {
            let val = rest.trim().trim_start_matches('=').trim();
            parser_version = Some(val.parse().expect("parser_version u32"));
        } else if l.starts_with("fixtures") && l.ends_with('[') {
            in_list = true;
        }
    }
    (
        parser_version.expect("parser_version missing"),
        fixtures,
    )
}

fn extract_quoted(s: &str) -> Option<String> {
    let s = s.trim().trim_end_matches(',').trim();
    let bytes = s.as_bytes();
    if bytes.len() < 2 {
        return None;
    }
    if bytes[0] == b'"' && bytes[bytes.len() - 1] == b'"' {
        Some(s[1..s.len() - 1].to_string())
    } else {
        None
    }
}

#[test]
fn manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures();
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::cisco_iosxe::PARSER_VERSION,
        "DRIFT: manifest parser_version != cisco_iosxe::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures();
    let listed: BTreeSet<String> = listed.into_iter().collect();
    let mut on_disk: BTreeSet<String> = BTreeSet::new();
    for entry in fs::read_dir(FIXTURE_ROOT).expect("read fixture root") {
        let entry = entry.expect("dir entry");
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            on_disk.insert(entry.file_name().to_string_lossy().into_owned());
        }
    }
    let missing: Vec<&String> = on_disk.difference(&listed).collect();
    let extra: Vec<&String> = listed.difference(&on_disk).collect();
    assert!(
        missing.is_empty(),
        "DRIFT: fixture dirs on disk but not in manifest: {missing:?}"
    );
    assert!(
        extra.is_empty(),
        "DRIFT: manifest names fixtures that do not exist on disk: {extra:?}"
    );
}

#[test]
fn every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures();
    for name in &listed {
        let cfg = PathBuf::from(FIXTURE_ROOT).join(name).join("config.cfg");
        assert!(
            cfg.exists(),
            "fixture {name}: missing config.cfg at {}",
            cfg.display()
        );
    }
}
