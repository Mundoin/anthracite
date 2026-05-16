//! V1O-A splitter-version guard.
//!
//! Enforces that the splitter source constant, the splitter fixture
//! manifest, and the on-disk fixture set agree at all times.
//! Intentionally separate from `parser_version_guard.rs` so the
//! splitter and parser version concerns stay visibly distinct.
//!
//! ## What this guards
//!
//! - `_manifest.toml::splitter_version` == `config_splitter::SPLITTER_VERSION`
//! - every directory under the splitter fixture root is listed in the
//!   manifest, and every name in the manifest exists on disk
//! - every listed fixture has a `config.cfg`
//!
//! ## Honest limitation
//!
//! This guard CANNOT tell you whether a splitter change *should* have
//! required a `SPLITTER_VERSION` bump. It only enforces that the three
//! version-bearing artefacts (source constant, manifest, fixture list)
//! agree with each other. Human review is the authority on whether a
//! behavioural change warranted a version bump in the first place. See
//! `docs/architecture/CONFIG_SPLITTER_CONTRACT.md` for the bump policy.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

const FIXTURE_ROOT: &str = "tests/fixtures/config-batches";
const MANIFEST_FILE: &str = "_manifest.toml";

fn read_manifest_version_and_fixtures() -> (u32, Vec<String>) {
    let raw = fs::read_to_string(PathBuf::from(FIXTURE_ROOT).join(MANIFEST_FILE))
        .unwrap_or_else(|e| panic!("read {FIXTURE_ROOT}/{MANIFEST_FILE}: {e}"));
    let mut splitter_version: Option<u32> = None;
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
        if let Some(rest) = l.strip_prefix("splitter_version") {
            let val = rest.trim().trim_start_matches('=').trim();
            splitter_version = Some(val.parse().expect("splitter_version u32"));
        } else if l.starts_with("fixtures") && l.ends_with('[') {
            in_list = true;
        }
    }
    (
        splitter_version.expect("splitter_version missing"),
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
fn manifest_splitter_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures();
    assert_eq!(
        mv,
        anthracite_lib::engines::config_splitter::SPLITTER_VERSION,
        "DRIFT: splitter manifest splitter_version != config_splitter::SPLITTER_VERSION. \
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
        "DRIFT in {FIXTURE_ROOT}: fixture dirs on disk but not in manifest: {missing:?}"
    );
    assert!(
        extra.is_empty(),
        "DRIFT in {FIXTURE_ROOT}: manifest names fixtures that do not exist on disk: {extra:?}"
    );
}

#[test]
fn every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures();
    for name in &listed {
        let cfg = PathBuf::from(FIXTURE_ROOT).join(name).join("config.cfg");
        assert!(
            cfg.exists(),
            "{FIXTURE_ROOT}: fixture {name}: missing config.cfg at {}",
            cfg.display()
        );
    }
}
