//! Nokia SR OS fixture corpus harness.
//!
//! Walks every fixture listed in `tests/fixtures/nokia-sros/_manifest.toml`
//! and asserts model + serialised-JSON stability against each fixture's
//! committed `expected.json`. Also asserts the manifest is a complete
//! and exclusive description of the on-disk corpus.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::network_model::{DeviceModel, PlatformRef};
use anthracite_lib::engines::parsers;

const FIXTURE_ROOT: &str = "tests/fixtures/nokia-sros";
const MANIFEST_FILE: &str = "_manifest.toml";

#[derive(Debug)]
struct Manifest {
    parser_version: u32,
    fixtures: Vec<String>,
}

fn manifest_path() -> PathBuf {
    PathBuf::from(FIXTURE_ROOT).join(MANIFEST_FILE)
}

fn read_manifest() -> Manifest {
    let raw = fs::read_to_string(manifest_path()).expect("read _manifest.toml");
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
            parser_version = Some(val.parse().expect("parser_version must be a u32"));
        } else if l.starts_with("fixtures") {
            if l.ends_with('[') {
                in_list = true;
            } else if let Some(idx) = l.find('[') {
                let inner = &l[idx + 1..];
                let inner = inner.trim_end_matches(']');
                for part in inner.split(',') {
                    if let Some(name) = extract_quoted(part.trim()) {
                        fixtures.push(name);
                    }
                }
            }
        }
    }
    Manifest {
        parser_version: parser_version.expect("parser_version missing from manifest"),
        fixtures,
    }
}

fn extract_quoted(s: &str) -> Option<String> {
    let s = s.trim().trim_end_matches(',').trim();
    let bytes = s.as_bytes();
    if bytes.len() < 2 {
        return None;
    }
    let first = bytes[0];
    let last = bytes[bytes.len() - 1];
    if (first == b'"' && last == b'"') || (first == b'\'' && last == b'\'') {
        Some(s[1..s.len() - 1].to_string())
    } else {
        None
    }
}

fn nokia_platform_ref() -> PlatformRef {
    PlatformRef {
        platform_id: Some("nokia-sros".to_string()),
        vendor: Some("Nokia".to_string()),
        os_family: Some("SR OS".to_string()),
        os_version_raw: None,
        os_version_normalized: None,
        detection_confidence: Some(0.9),
    }
}

fn fixture_dir(name: &str) -> PathBuf {
    PathBuf::from(FIXTURE_ROOT).join(name)
}

fn read_config(name: &str) -> String {
    let p = fixture_dir(name).join("config.cfg");
    fs::read_to_string(&p).unwrap_or_else(|e| panic!("read {}: {e}", p.display()))
}

fn pretty(m: &DeviceModel) -> String {
    let mut s = serde_json::to_string_pretty(m).expect("serialise DeviceModel");
    s.push('\n');
    s
}

fn read_expected(name: &str) -> String {
    let p = fixture_dir(name).join("expected.json");
    fs::read_to_string(&p)
        .unwrap_or_else(|e| panic!("read {}: {e}", p.display()))
        .replace("\r\n", "\n")
}

fn write_expected(name: &str, content: &str) {
    let p = fixture_dir(name).join("expected.json");
    fs::write(&p, content).expect("write expected.json");
}

fn parse_fixture(name: &str) -> DeviceModel {
    let cfg = read_config(name);
    parsers::parse_device_config(nokia_platform_ref(), &cfg).expect("parse_device_config Ok")
}

#[test]
fn manifest_parser_version_matches_source() {
    let m = read_manifest();
    assert_eq!(
        m.parser_version,
        anthracite_lib::engines::parsers::nokia_sros::PARSER_VERSION,
        "manifest parser_version must equal nokia_sros::PARSER_VERSION"
    );
}

#[test]
fn manifest_lists_every_on_disk_fixture_and_no_orphans() {
    let m = read_manifest();
    let listed: BTreeSet<String> = m.fixtures.iter().cloned().collect();
    let mut on_disk: BTreeSet<String> = BTreeSet::new();
    for entry in fs::read_dir(FIXTURE_ROOT).expect("read fixture root") {
        let entry = entry.expect("dir entry");
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            on_disk.insert(entry.file_name().to_string_lossy().into_owned());
        }
    }
    let missing: Vec<&String> = on_disk.difference(&listed).collect();
    let extra: Vec<&String> = listed.difference(&on_disk).collect();
    assert!(missing.is_empty(), "missing from manifest: {missing:?}");
    assert!(extra.is_empty(), "orphan in manifest: {extra:?}");
}

#[test]
fn every_listed_fixture_has_config_and_expected_files() {
    let m = read_manifest();
    let updating = std::env::var("ANTHRACITE_UPDATE_FIXTURES").is_ok();
    for name in &m.fixtures {
        let d = fixture_dir(name);
        assert!(d.join("config.cfg").exists(), "fixture {name}: missing config.cfg");
        if !updating {
            assert!(
                d.join("expected.json").exists(),
                "fixture {name}: missing expected.json — run `ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test nokia_sros_fixture_corpus` to bootstrap"
            );
        }
    }
}

#[test]
fn every_fixture_parses_to_committed_expected_json() {
    let m = read_manifest();
    let updating = std::env::var("ANTHRACITE_UPDATE_FIXTURES").is_ok();
    for name in &m.fixtures {
        let model = parse_fixture(name);
        let produced = pretty(&model);
        if updating {
            write_expected(name, &produced);
        } else {
            let expected = read_expected(name);
            assert_eq!(produced, expected, "fixture {name}: expected.json drifted from parser output");
        }

        let rerendered = pretty(&parse_fixture(name));
        assert_eq!(produced, rerendered, "fixture {name}: parser output changed across two consecutive parses");
    }
}

