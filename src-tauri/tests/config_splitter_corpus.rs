//! V1O-A config-splitter fixture corpus harness.
//!
//! Walks every fixture listed in
//! `tests/fixtures/config-batches/_manifest.toml` and asserts the
//! splitter's serialised output against each fixture's committed
//! `expected.json`. Also asserts that the manifest is a complete and
//! exclusive description of the on-disk corpus (no orphan dirs, no
//! missing entries).
//!
//! Seed / re-capture every fixture's `expected.json` by running:
//!     ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test config_splitter_corpus
//! Hand-review the captured JSON before committing.
//!
//! Honest limitation: this harness enforces that the manifest, the
//! splitter source, and the on-disk fixtures stay internally
//! consistent. It cannot tell you whether a splitter change *should*
//! have required a `SPLITTER_VERSION` bump; that is human review's job
//! (see `docs/architecture/CONFIG_SPLITTER_CONTRACT.md`).

use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::config_splitter::{self, ConfigBatchSplitResult};

const FIXTURE_ROOT: &str = "tests/fixtures/config-batches";
const MANIFEST_FILE: &str = "_manifest.toml";

#[derive(Debug)]
struct Manifest {
    splitter_version: u32,
    fixtures: Vec<String>,
}

fn manifest_path() -> PathBuf {
    PathBuf::from(FIXTURE_ROOT).join(MANIFEST_FILE)
}

/// Hand-rolled reader matching the V1L parser-corpus manifest shape:
///   - `# ...` comments and blank lines
///   - `splitter_version = <u32>`
///   - `fixtures = [` ... `"name",` ... `]`
fn read_manifest() -> Manifest {
    let raw = fs::read_to_string(manifest_path())
        .expect("read _manifest.toml");
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
            splitter_version = Some(
                val.parse()
                    .expect("splitter_version must be a u32"),
            );
        } else if l.starts_with("fixtures") && l.ends_with('[') {
            in_list = true;
        }
    }
    Manifest {
        splitter_version: splitter_version.expect("splitter_version missing"),
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

fn fixture_dir(name: &str) -> PathBuf {
    PathBuf::from(FIXTURE_ROOT).join(name)
}

fn read_config(name: &str) -> String {
    let p = fixture_dir(name).join("config.cfg");
    fs::read_to_string(&p)
        .unwrap_or_else(|e| panic!("read {}: {e}", p.display()))
}

fn pretty(r: &ConfigBatchSplitResult) -> String {
    let mut s = serde_json::to_string_pretty(r).expect("serialise ConfigBatchSplitResult");
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

fn split_fixture(name: &str) -> ConfigBatchSplitResult {
    let cfg = read_config(name);
    config_splitter::split_config_batch(&cfg)
}

// =====================================================================
// Manifest <-> on-disk consistency
// =====================================================================

#[test]
fn manifest_splitter_version_matches_source() {
    let m = read_manifest();
    assert_eq!(
        m.splitter_version,
        config_splitter::SPLITTER_VERSION,
        "manifest splitter_version must equal config_splitter::SPLITTER_VERSION"
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

    let missing_from_manifest: Vec<&String> = on_disk.difference(&listed).collect();
    let orphan_in_manifest: Vec<&String> = listed.difference(&on_disk).collect();

    assert!(
        missing_from_manifest.is_empty(),
        "fixture dirs exist on disk but are NOT in _manifest.toml: {:?}",
        missing_from_manifest
    );
    assert!(
        orphan_in_manifest.is_empty(),
        "_manifest.toml lists fixtures that do NOT exist on disk: {:?}",
        orphan_in_manifest
    );
}

#[test]
fn every_listed_fixture_has_config_and_expected_files() {
    let m = read_manifest();
    let updating = std::env::var("ANTHRACITE_UPDATE_FIXTURES").is_ok();
    for name in &m.fixtures {
        let d = fixture_dir(name);
        let cfg = d.join("config.cfg");
        assert!(
            cfg.exists(),
            "fixture {name}: missing config.cfg at {}",
            cfg.display()
        );
        if !updating {
            let exp = d.join("expected.json");
            assert!(
                exp.exists(),
                "fixture {name}: missing expected.json — run `ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test config_splitter_corpus` to bootstrap"
            );
        }
    }
}

// =====================================================================
// Byte-equal walk over the full corpus
// =====================================================================

#[test]
fn every_fixture_splits_to_committed_expected_json() {
    let m = read_manifest();
    let updating = std::env::var("ANTHRACITE_UPDATE_FIXTURES").is_ok();
    let mut mismatches: Vec<String> = Vec::new();

    for name in &m.fixtures {
        let result = split_fixture(name);
        let produced = pretty(&result);
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
                .map(|(i, (a, b))| {
                    format!(
                        "line {}: produced={a:?} expected={b:?}",
                        i + 1
                    )
                })
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
        "fixture corpus mismatches:\n  {}",
        mismatches.join("\n  ")
    );
}

#[test]
fn every_fixture_round_trips_through_serde() {
    let m = read_manifest();
    for name in &m.fixtures {
        let result = split_fixture(name);
        let s1 = serde_json::to_string(&result).expect("ser 1");
        let back: ConfigBatchSplitResult = serde_json::from_str(&s1).expect("deser");
        let s2 = serde_json::to_string(&back).expect("ser 2");
        assert_eq!(s1, s2, "fixture {name}: serde round-trip diverged");
    }
}

#[test]
fn splitter_version_is_carried_in_every_result() {
    let m = read_manifest();
    let expected = config_splitter::SPLITTER_VERSION.to_string();
    for name in &m.fixtures {
        let r = split_fixture(name);
        assert_eq!(
            r.splitter_version, expected,
            "fixture {name}: splitter_version mismatch"
        );
    }
}
