//! V1O-A config-splitter determinism harness.
//!
//! Proves the splitter is bit-stable across repeated calls on a large
//! input. Mirrors the V1L parser-corpus determinism pattern.

use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::config_splitter;

const FIXTURE: &str = "tests/fixtures/config-batches/large-batch-50-devices/config.cfg";

fn pretty_split(text: &str) -> String {
    let r = config_splitter::split_config_batch(text);
    let mut s = serde_json::to_string_pretty(&r).expect("serialise");
    s.push('\n');
    s
}

#[test]
fn ten_consecutive_splits_are_byte_identical() {
    let cfg = fs::read_to_string(PathBuf::from(FIXTURE))
        .unwrap_or_else(|e| panic!("read fixture {FIXTURE}: {e}"));
    let first = pretty_split(&cfg);
    for i in 1..10 {
        let nth = pretty_split(&cfg);
        assert_eq!(first, nth, "run {i} differs from run 0");
    }
}

#[test]
fn serde_round_trip_is_byte_identical() {
    let cfg = fs::read_to_string(PathBuf::from(FIXTURE))
        .unwrap_or_else(|e| panic!("read fixture {FIXTURE}: {e}"));
    let r = config_splitter::split_config_batch(&cfg);
    let s1 = serde_json::to_string(&r).expect("ser 1");
    let back: config_splitter::ConfigBatchSplitResult =
        serde_json::from_str(&s1).expect("deser");
    let s2 = serde_json::to_string(&back).expect("ser 2");
    assert_eq!(s1, s2, "serde round-trip diverged");
}
