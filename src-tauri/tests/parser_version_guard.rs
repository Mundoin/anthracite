//! V1K / V1L / V1M / V1N / V1U / V1AV / V1BA / V1BC parser-version guard.
//!
//! Per-parser focused gates that fire CI red whenever a parser's
//! source `PARSER_VERSION`, its fixture manifest, and the on-disk
//! fixture set drift apart. Intentionally separate from the corpus
//! harnesses so the failure surface speaks to "did the contract
//! drift?" rather than "did one fixture's output drift?".
//!
//! Covers the shipped Anthracite parsers as of V1BC:
//!   - cisco-ios     (V1BC v1)
//!   - cisco-iosxe   (V1K + V1L bump to v2)
//!   - juniper-junos (V1M v1)
//!   - arista-eos    (V1N v1)
//!   - cisco-nxos    (V1U v1)
//!   - huawei-vrp    (V1AV v1)
//!   - fortinet-fortios (V1AV v1)
//!   - mikrotik-routeros (V1BA v1)
//!   - paloalto-panos (V1BA v1)
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

const CISCO_IOS_FIXTURE_ROOT: &str = "tests/fixtures/cisco-ios";
const CISCO_FIXTURE_ROOT: &str = "tests/fixtures/cisco-iosxe";
const JUNOS_FIXTURE_ROOT: &str = "tests/fixtures/juniper-junos";
const EOS_FIXTURE_ROOT: &str = "tests/fixtures/arista-eos";
const AOSCX_FIXTURE_ROOT: &str = "tests/fixtures/aruba-aoscx";
const NXOS_FIXTURE_ROOT: &str = "tests/fixtures/cisco-nxos";
const HUAWEI_FIXTURE_ROOT: &str = "tests/fixtures/huawei-vrp";
const FORTIOS_FIXTURE_ROOT: &str = "tests/fixtures/fortinet-fortios";
const NOKIA_FIXTURE_ROOT: &str = "tests/fixtures/nokia-sros";
const MIKROTIK_FIXTURE_ROOT: &str = "tests/fixtures/mikrotik-routeros";
const PALOALTO_FIXTURE_ROOT: &str = "tests/fixtures/paloalto-panos";
const VYOS_FIXTURE_ROOT: &str = "tests/fixtures/vyos";
const CHECKPOINT_FIXTURE_ROOT: &str = "tests/fixtures/checkpoint-gaia";
const IOSXR_FIXTURE_ROOT: &str = "tests/fixtures/cisco-iosxr";
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
// cisco-ios
// =====================================================================

#[test]
fn cisco_ios_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(CISCO_IOS_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::cisco_ios::PARSER_VERSION,
        "DRIFT: cisco-ios manifest parser_version != cisco_ios::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn cisco_ios_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(CISCO_IOS_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(CISCO_IOS_FIXTURE_ROOT, &listed);
}

#[test]
fn cisco_ios_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(CISCO_IOS_FIXTURE_ROOT);
    assert_every_fixture_has_config(CISCO_IOS_FIXTURE_ROOT, &listed);
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

// =====================================================================
// aruba-aoscx
// =====================================================================

#[test]
fn aoscx_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(AOSCX_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::aruba_aoscx::PARSER_VERSION,
        "DRIFT: aoscx manifest parser_version != aruba_aoscx::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn aoscx_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(AOSCX_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(AOSCX_FIXTURE_ROOT, &listed);
}

#[test]
fn aoscx_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(AOSCX_FIXTURE_ROOT);
    assert_every_fixture_has_config(AOSCX_FIXTURE_ROOT, &listed);
}

// =====================================================================
// vyos
// =====================================================================

#[test]
fn vyos_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(VYOS_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::vyos::PARSER_VERSION,
        "DRIFT: vyos manifest parser_version != vyos::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn vyos_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(VYOS_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(VYOS_FIXTURE_ROOT, &listed);
}

#[test]
fn vyos_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(VYOS_FIXTURE_ROOT);
    assert_every_fixture_has_config(VYOS_FIXTURE_ROOT, &listed);
}

// =====================================================================
// checkpoint-gaia
// =====================================================================

#[test]
fn checkpoint_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(CHECKPOINT_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::checkpoint_gaia::PARSER_VERSION,
        "DRIFT: checkpoint manifest parser_version != checkpoint_gaia::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn checkpoint_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(CHECKPOINT_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(CHECKPOINT_FIXTURE_ROOT, &listed);
}

#[test]
fn checkpoint_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(CHECKPOINT_FIXTURE_ROOT);
    assert_every_fixture_has_config(CHECKPOINT_FIXTURE_ROOT, &listed);
}

// =====================================================================
// cisco-iosxr
// =====================================================================

#[test]
fn iosxr_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(IOSXR_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::cisco_iosxr::PARSER_VERSION,
        "DRIFT: iosxr manifest parser_version != cisco_iosxr::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn iosxr_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(IOSXR_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(IOSXR_FIXTURE_ROOT, &listed);
}

#[test]
fn iosxr_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(IOSXR_FIXTURE_ROOT);
    assert_every_fixture_has_config(IOSXR_FIXTURE_ROOT, &listed);
}

// =====================================================================
// cisco-nxos
// =====================================================================

#[test]
fn nxos_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(NXOS_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::cisco_nxos::PARSER_VERSION,
        "DRIFT: nxos manifest parser_version != cisco_nxos::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn nxos_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(NXOS_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(NXOS_FIXTURE_ROOT, &listed);
}

#[test]
fn nxos_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(NXOS_FIXTURE_ROOT);
    assert_every_fixture_has_config(NXOS_FIXTURE_ROOT, &listed);
}

// =====================================================================
// huawei-vrp
// =====================================================================

#[test]
fn huawei_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(HUAWEI_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::huawei_vrp::PARSER_VERSION,
        "DRIFT: huawei manifest parser_version != huawei_vrp::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn huawei_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(HUAWEI_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(HUAWEI_FIXTURE_ROOT, &listed);
}

#[test]
fn huawei_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(HUAWEI_FIXTURE_ROOT);
    assert_every_fixture_has_config(HUAWEI_FIXTURE_ROOT, &listed);
}

// =====================================================================
// fortinet-fortios
// =====================================================================

#[test]
fn fortios_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(FORTIOS_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::fortinet_fortios::PARSER_VERSION,
        "DRIFT: fortios manifest parser_version != fortinet_fortios::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn fortios_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(FORTIOS_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(FORTIOS_FIXTURE_ROOT, &listed);
}

#[test]
fn fortios_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(FORTIOS_FIXTURE_ROOT);
    assert_every_fixture_has_config(FORTIOS_FIXTURE_ROOT, &listed);
}

// =====================================================================
// nokia-sros
// =====================================================================

#[test]
fn nokia_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(NOKIA_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::nokia_sros::PARSER_VERSION,
        "DRIFT: nokia manifest parser_version != nokia_sros::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn nokia_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(NOKIA_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(NOKIA_FIXTURE_ROOT, &listed);
}

#[test]
fn nokia_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(NOKIA_FIXTURE_ROOT);
    assert_every_fixture_has_config(NOKIA_FIXTURE_ROOT, &listed);
}

// =====================================================================
// mikrotik-routeros
// =====================================================================

#[test]
fn mikrotik_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(MIKROTIK_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::mikrotik_routeros::PARSER_VERSION,
        "DRIFT: mikrotik manifest parser_version != mikrotik_routeros::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn mikrotik_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(MIKROTIK_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(MIKROTIK_FIXTURE_ROOT, &listed);
}

#[test]
fn mikrotik_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(MIKROTIK_FIXTURE_ROOT);
    assert_every_fixture_has_config(MIKROTIK_FIXTURE_ROOT, &listed);
}

// =====================================================================
// paloalto-panos
// =====================================================================

#[test]
fn paloalto_manifest_parser_version_equals_source_constant() {
    let (mv, _) = read_manifest_version_and_fixtures(PALOALTO_FIXTURE_ROOT);
    assert_eq!(
        mv,
        anthracite_lib::engines::parsers::paloalto_panos::PARSER_VERSION,
        "DRIFT: paloalto manifest parser_version != paloalto_panos::PARSER_VERSION. \
         Bump both or neither; never one without the other."
    );
}

#[test]
fn paloalto_on_disk_fixture_set_equals_manifest_fixture_set() {
    let (_, listed) = read_manifest_version_and_fixtures(PALOALTO_FIXTURE_ROOT);
    assert_on_disk_matches_manifest(PALOALTO_FIXTURE_ROOT, &listed);
}

#[test]
fn paloalto_every_listed_fixture_has_config_cfg() {
    let (_, listed) = read_manifest_version_and_fixtures(PALOALTO_FIXTURE_ROOT);
    assert_every_fixture_has_config(PALOALTO_FIXTURE_ROOT, &listed);
}
