//! V1N arista-eos fixture corpus harness.
//!
//! Walks every fixture listed in
//! `tests/fixtures/arista-eos/_manifest.toml` and asserts model +
//! serialised-JSON stability against each fixture's committed
//! `expected.json`. Also asserts manifest ↔ on-disk consistency and
//! that the receipt projection round-trips over an EOS `DeviceModel`.
//!
//! Seed / re-capture every fixture's `expected.json` by running:
//!     ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test arista_eos_fixture_corpus
//! Hand-review the captured JSON before committing.

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::network_model::{DeviceModel, PlatformRef};
use anthracite_lib::engines::parsers;

const FIXTURE_ROOT: &str = "tests/fixtures/arista-eos";
const MANIFEST_FILE: &str = "_manifest.toml";

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
            parser_version = Some(val.parse().expect("parser_version u32"));
        } else if l.starts_with("fixtures") && l.ends_with('[') {
            in_list = true;
        }
    }
    Manifest {
        parser_version: parser_version.expect("parser_version missing"),
        fixtures,
    }
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

fn eos_platform_ref() -> PlatformRef {
    PlatformRef {
        platform_id: Some("arista-eos".to_string()),
        vendor: Some("Arista".to_string()),
        os_family: Some("EOS".to_string()),
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
    parsers::parse_device_config(eos_platform_ref(), &cfg)
        .expect("parse_device_config Ok")
}

// =====================================================================
// Manifest <-> on-disk consistency
// =====================================================================

#[test]
fn manifest_parser_version_matches_source() {
    let m = read_manifest();
    assert_eq!(
        m.parser_version,
        anthracite_lib::engines::parsers::arista_eos::PARSER_VERSION,
        "manifest parser_version must equal arista_eos::PARSER_VERSION"
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
        assert!(
            d.join("config.cfg").exists(),
            "fixture {name}: missing config.cfg"
        );
        if !updating {
            assert!(
                d.join("expected.json").exists(),
                "fixture {name}: missing expected.json — run `ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test arista_eos_fixture_corpus` to bootstrap"
            );
        }
    }
}

// =====================================================================
// Byte-equal walk
// =====================================================================

#[test]
fn every_fixture_parses_to_committed_expected_json() {
    let m = read_manifest();
    let updating = std::env::var("ANTHRACITE_UPDATE_FIXTURES").is_ok();
    let mut mismatches: Vec<String> = Vec::new();
    for name in &m.fixtures {
        let model = parse_fixture(name);
        let produced = pretty(&model);
        if updating {
            write_expected(name, &produced);
            continue;
        }
        let expected = read_expected(name);
        if produced != expected {
            let prod_lines: Vec<&str> = produced.lines().collect();
            let exp_lines: Vec<&str> = expected.lines().collect();
            let first_diff = prod_lines
                .iter()
                .zip(exp_lines.iter())
                .enumerate()
                .find(|(_, (a, b))| a != b)
                .map(|(i, (a, b))| format!("line {}: produced={a:?} expected={b:?}", i + 1))
                .unwrap_or_else(|| {
                    format!(
                        "produced={} lines, expected={} lines",
                        prod_lines.len(),
                        exp_lines.len()
                    )
                });
            mismatches.push(format!("{name}: {first_diff}"));
        }
    }
    assert!(
        mismatches.is_empty(),
        "EOS fixture corpus mismatches:\n  {}",
        mismatches.join("\n  ")
    );
}

#[test]
fn every_fixture_is_byte_stable_across_ten_parses() {
    let m = read_manifest();
    for name in &m.fixtures {
        let cfg = read_config(name);
        let pref = eos_platform_ref();
        let first =
            pretty(&parsers::parse_device_config(pref.clone(), &cfg).expect("first parse"));
        for i in 1..10 {
            let nth =
                pretty(&parsers::parse_device_config(pref.clone(), &cfg).expect("nth parse"));
            assert_eq!(first, nth, "fixture {name}: run {i} differs from run 0");
        }
    }
}

#[test]
fn every_fixture_round_trips_through_serde() {
    let m = read_manifest();
    for name in &m.fixtures {
        let model = parse_fixture(name);
        let s1 = serde_json::to_string(&model).expect("ser 1");
        let back: DeviceModel = serde_json::from_str(&s1).expect("deser");
        let s2 = serde_json::to_string(&back).expect("ser 2");
        assert_eq!(s1, s2, "fixture {name}: serde round-trip diverged");
    }
}

#[test]
fn evidence_metadata_carries_current_parser_version() {
    let m = read_manifest();
    let expected = m.parser_version.to_string();
    for name in &m.fixtures {
        let model = parse_fixture(name);
        let pv = model.evidence.parser_version.clone().unwrap_or_default();
        assert_eq!(pv, expected, "fixture {name}: parser_version mismatch");
    }
}

#[test]
fn receipt_projection_round_trips_over_eos_model() {
    use anthracite_lib::engines::receipt::{project_receipt, ReceiptView};
    let model = parse_fixture("small");
    let r1 = project_receipt(&model);
    let r2 = project_receipt(&model);
    assert_eq!(r1, r2, "receipt projection must be deterministic");
    let j = serde_json::to_string(&r1).expect("serialise receipt");
    let back: ReceiptView = serde_json::from_str(&j).expect("deserialise receipt");
    assert_eq!(r1, back, "receipt serde round-trip diverged");
    assert_eq!(r1.platform_id.as_deref(), Some("arista-eos"));
}
