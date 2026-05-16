//! V1L / V1M / V1N parser-version guard.
//!
//! Per-parser focused gates that fire CI red whenever a parser's
//! source `PARSER_VERSION`, its fixture manifest, and the on-disk
//! fixture set drift apart. Intentionally separate from the corpus
//! harnesses so the failure surface speaks to "did the contract
//! drift?" rather than "did one fixture's output drift?".
//!
//! Covers all three Anthracite parsers as of V1N:
//!   - cisco-iosxe   (V1K + V1L bump to v2)
//!   - juniper-junos (V1M v1)
//!   - arista-eos    (V1N v1)
//!
//! ## What this guards (per parser)
//!
//! - `_manifest.toml::parser_version` == `<parser>::PARSER_VERSION`
//! - every directory under the parser's fixture root is listed in the
//!   manifest, and every name in the manifest exists on disk
//! - every listed fixture has a `config.cfg`
//!
//! ## Honest limitation
//!
//! This guard CANNOT tell you whether a parser change *should* have
//! required a `PARSER_VERSION` bump. It only enforces that the three
//! version-bearing artefacts (source constant, manifest, fixture list)
//! agree with each other. Human review is still the authority on
//! whether a behavioural change warranted a version bump in the first
//! place. See `docs/architecture/PARSER_VERSIONING.md` for the full
//! bump policy and the meaning of this limitation.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

const CISCO_FIXTURE_ROOT: &str = "tests/fixtures/cisco-iosxe";
const JUNOS_FIXTURE_ROOT: &str = "tests/fixtures/juniper-junos";
const EOS_FIXTURE_ROOT: &str = "tests/fixtures/arista-eos";
const MANIFEST_FILE: &str = "_manifest.toml";

fn manifest_path(root: &str) -> PathBuf {
    PathBuf::from(root).join(MANIFEST_FILE)
}

fn read_manifest_version_and_fixtures(root: &str) -> (u32, Vec<String>) {
    let raw = fs::read_to_string(manifest_path(root))
        .unwrap_or_else(|e| panic!("read {root}/_manifest.toml: {e}"));
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

fn assert_on_disk_matches_manifest(root: &str, listed: &[String]) {
    let listed: BTreeSet<String> = listed.iter().cloned().collect();
    let mut on_disk: BTreeSet<String> = BTreeSet::new();
    for entry in fs::read_dir(root).expect("read fixture root") {
        let entry = entry.expect("dir entry");
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            on_disk.insert(entry.file_name().to_string_lossy().into_owned());
        }
    }
    let missing: Vec<&String> = on_disk.difference(&listed).collect();
    let extra: Vec<&String> = listed.difference(&on_disk).collect();
    assert!(
        missing.is_empty(),
        "DRIFT in {root}: fixture dirs on disk but not in manifest: {missing:?}"
    );
    assert!(
        extra.is_empty(),
        "DRIFT in {root}: manifest names fixtures that do not exist on disk: {extra:?}"
    );
}

fn assert_every_fixture_has_config(root: &str, listed: &[String]) {
    for name in listed {
        let cfg = PathBuf::from(root).join(name).join("config.cfg");
        assert!(
            cfg.exists(),
            "{root}: fixture {name}: missing config.cfg at {}",
            cfg.display()
        );
    }
}

// =====================================================================
// cisco-iosxe
// =====================================================================

#[test]
fn cisco_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(CISCO_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::cisco_iosxe::PARSER_VERSION,
        "DRIFT: cisco manifest parser_version != cisco_iosxe::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn cisco_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(CISCO_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(CISCO_FIXTURE_ROOT, &listed);
}

#[test]
fn cisco_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(CISCO_FIXTURE_ROOT);
    assert_every_fixture_has_config(CISCO_FIXTURE_ROOT, &listed);
}

// =====================================================================
// juniper-junos
// =====================================================================

#[test]
fn junos_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(JUNOS_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::juniper_junos::PARSER_VERSION,
        "DRIFT: junos manifest parser_version != juniper_junos::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn junos_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(JUNOS_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(JUNOS_FIXTURE_ROOT, &listed);
}

#[test]
fn junos_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(JUNOS_FIXTURE_ROOT);
    assert_every_fixture_has_config(JUNOS_FIXTURE_ROOT, &listed);
}

// =====================================================================
// arista-eos
// =====================================================================

#[test]
fn eos_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(EOS_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::arista_eos::PARSER_VERSION,
        "DRIFT: eos manifest parser_version != arista_eos::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn eos_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(EOS_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(EOS_FIXTURE_ROOT, &listed);
}

#[test]
fn eos_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(EOS_FIXTURE_ROOT);
    assert_every_fixture_has_config(EOS_FIXTURE_ROOT, &listed);
}
