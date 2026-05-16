//! V1K fixture / determinism / negative tests for the cisco-iosxe parser.
//!
//! Fixture files live in `tests/fixtures/cisco-iosxe/<name>/`:
//!   - `config.cfg`  — raw IOS-XE config under test
//!   - `expected.json` — canonical pretty-printed `DeviceModel` JSON
//!
//! Seed `expected.json` by running:
//!     ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test cisco_iosxe_fixtures
//! Hand-review the captured JSON before committing.

use std::fs;
use std::path::{Path, PathBuf};

use anthracite_lib::engines::network_model::{DeviceModel, PlatformRef};
use anthracite_lib::engines::parsers;

const FIXTURE_ROOT: &str = "tests/fixtures/cisco-iosxe";

fn iosxe_platform_ref() -> PlatformRef {
    PlatformRef {
        platform_id: Some("cisco-iosxe".to_string()),
        vendor: Some("Cisco".to_string()),
        os_family: Some("IOS / IOS XE".to_string()),
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
    fs::read_to_string(&p)
        .unwrap_or_else(|e| panic!("read {}: {e}", p.display()))
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
    parsers::parse_device_config(iosxe_platform_ref(), &cfg)
        .expect("parse_device_config Ok")
}

fn assert_fixture_byte_equal(name: &str) {
    let model = parse_fixture(name);
    let produced = pretty(&model);
    if std::env::var("ANTHRACITE_UPDATE_FIXTURES").is_ok() {
        write_expected(name, &produced);
        return;
    }
    let expected = read_expected(name);
    if produced != expected {
        // Help debugging by surfacing both first-diff lines.
        let prod_lines: Vec<&str> = produced.lines().collect();
        let exp_lines: Vec<&str> = expected.lines().collect();
        let first_diff = prod_lines
            .iter()
            .zip(exp_lines.iter())
            .enumerate()
            .find(|(_, (a, b))| a != b)
            .map(|(i, (a, b))| format!("line {}:\n  produced: {a}\n  expected: {b}", i + 1))
            .unwrap_or_else(|| {
                format!(
                    "produced={} lines, expected={} lines",
                    prod_lines.len(),
                    exp_lines.len()
                )
            });
        panic!("fixture {name} mismatch.\n{first_diff}\n--- produced ---\n{produced}\n--- expected ---\n{expected}");
    }
}

// =====================================================================
// Fixture byte-equal gates
// =====================================================================

#[test]
fn small_fixture_byte_equal() {
    assert_fixture_byte_equal("small");
}

#[test]
fn near_empty_fixture_byte_equal() {
    assert_fixture_byte_equal("near-empty");
}

#[test]
fn truncated_fixture_byte_equal() {
    assert_fixture_byte_equal("truncated");
}

// =====================================================================
// Determinism (proposal §5.3)
// =====================================================================

#[test]
fn small_parses_byte_identically_across_ten_runs() {
    let cfg = read_config("small");
    let pref = iosxe_platform_ref();
    let first = pretty(
        &parsers::parse_device_config(pref.clone(), &cfg).expect("first parse"),
    );
    for i in 1..10 {
        let nth = pretty(
            &parsers::parse_device_config(pref.clone(), &cfg)
                .expect("nth parse"),
        );
        assert_eq!(first, nth, "run {i} differs from run 0");
    }
}

#[test]
fn small_round_trips_through_serde() {
    let cfg = read_config("small");
    let pref = iosxe_platform_ref();
    let model = parsers::parse_device_config(pref, &cfg).expect("parse");
    let s1 = serde_json::to_string(&model).unwrap();
    let back: DeviceModel = serde_json::from_str(&s1).unwrap();
    let s2 = serde_json::to_string(&back).unwrap();
    assert_eq!(s1, s2, "round-trip serialisation diverged");
}

// =====================================================================
// Negative (proposal §5.4)
// =====================================================================

#[test]
fn empty_input_returns_empty_shell_with_warning() {
    let m = parsers::parse_device_config(iosxe_platform_ref(), "").expect("ok");
    assert!(m
        .parse_confidence
        .warnings
        .contains(&"empty_input".to_string()));
    assert_eq!(m.parse_confidence.score, Some(0.0));
    assert!(m.interfaces.is_empty());
}

#[test]
fn whitespace_only_input_returns_empty_shell_with_warning() {
    let m = parsers::parse_device_config(iosxe_platform_ref(), "   \n\n\t\n")
        .expect("ok");
    assert!(m
        .parse_confidence
        .warnings
        .contains(&"empty_input".to_string()));
}

#[test]
fn wrong_platform_ref_returns_err() {
    let mut pref = iosxe_platform_ref();
    pref.platform_id = Some("unknown-vendor-xyz".to_string());
    let r = parsers::parse_device_config(pref, "hostname x\n");
    assert_eq!(
        r.unwrap_err(),
        "unsupported platform: unknown-vendor-xyz"
    );
}

#[test]
fn junos_config_with_iosxe_pref_runs_and_degrades() {
    let junos = "set system host-name pe\nset interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/30\nset protocols ospf area 0.0.0.0 interface ge-0/0/0\n";
    let m = parsers::parse_device_config(iosxe_platform_ref(), junos)
        .expect("ok");
    assert!(
        m.unknown_lines.len() >= 3,
        "junos under iosxe should densely populate unknown_lines, got {}",
        m.unknown_lines.len()
    );
    assert!(m.parse_confidence.score.unwrap_or(1.0) < 0.5);
}

#[test]
fn single_garbage_line_no_panic() {
    let m = parsers::parse_device_config(iosxe_platform_ref(), "wibble wobble\n")
        .expect("ok");
    assert_eq!(m.unknown_lines.len(), 1);
}

// =====================================================================
// Registry integrity (proposal §5)
// =====================================================================

#[test]
fn cisco_iosxe_resolves_through_vendor_registry() {
    let p = anthracite_lib::engines::vendor_registry::get_platform("cisco-iosxe")
        .expect("cisco-iosxe must resolve");
    assert_eq!(p.id, "cisco-iosxe");
    assert_eq!(p.vendor, "Cisco");
}

// Suppress unused-import lint when `Path` is not referenced.
#[allow(dead_code)]
fn _path_marker() -> &'static Path {
    Path::new(".")
}
