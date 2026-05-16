//! V1O-B Archive Intake corpus harness.
//!
//! Two roles:
//!
//!   1. **Regeneration helper** (`regenerate_fixtures`, `#[ignore]`) —
//!      constructs the 4 committed archive fixtures from inline
//!      cross-vendor config bodies and writes them plus their
//!      `expected.json` snapshots under
//!      `src-tauri/tests/fixtures/archives/<name>/`. Run with
//!      `cargo test --test archive_intake_corpus -- --ignored
//!      --nocapture`.
//!
//!   2. **Frozen corpus assertion** (`fixture_outputs_are_byte_equal`)
//!      — for every fixture listed in the manifest, reads the
//!      committed archive bytes, runs `archive_intake`, serialises
//!      the result, and asserts the JSON is byte-identical to the
//!      committed `expected.json`. Any drift fails CI.
//!
//! The harness lives next to the splitter / parser corpus harnesses
//! (`config_splitter_corpus.rs`, `cisco_iosxe_fixture_corpus.rs`,
//! …) and follows their conventions.

use std::collections::BTreeSet;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

use anthracite_lib::engines::archive_intake::{
    self, ArchiveIntakeResult, ArchiveKind,
};

// =====================================================================
// Fixture inventory
// =====================================================================

const FIXTURES: &[FixtureSpec] = &[
    FixtureSpec {
        name: "zip-single-config",
        archive_filename: "archive.zip",
        kind: ArchiveKind::Zip,
        kind_hint: ArchiveKind::Zip,
    },
    FixtureSpec {
        name: "zip-multiple-configs",
        archive_filename: "archive.zip",
        kind: ArchiveKind::Zip,
        kind_hint: ArchiveKind::Zip,
    },
    FixtureSpec {
        name: "tar-multiple-configs",
        archive_filename: "archive.tar",
        kind: ArchiveKind::Tar,
        kind_hint: ArchiveKind::Tar,
    },
    FixtureSpec {
        name: "targz-multiple-configs",
        archive_filename: "archive.tar.gz",
        kind: ArchiveKind::TarGz,
        kind_hint: ArchiveKind::TarGz,
    },
];

struct FixtureSpec {
    name: &'static str,
    archive_filename: &'static str,
    kind: ArchiveKind,
    kind_hint: ArchiveKind,
}

// =====================================================================
// Inline config bodies (kept stable across runs)
// =====================================================================

// Vendor-distinctive bodies. Each carries enough vendor-specific
// vocabulary (`vrf definition` vs `vrf instance`, `set system
// host-name`, etc.) that V1J detection picks the right platform
// without ambiguity. Hostnames diverge (r1/r2/r3) so the integration
// test can prove per-entry provenance survives the chain.
pub const CISCO_R1_CFG: &str = "\
!
hostname r1
!
vrf definition MGMT
 rd 65000:1
!
vlan 100
 name USERS
!
interface Loopback0
 ip address 192.0.2.1 255.255.255.255
!
interface GigabitEthernet0/0/0
 ip address 10.0.0.1 255.255.255.252
 no shutdown
!
ip route 0.0.0.0 0.0.0.0 10.0.0.2
!
ip ssh version 2
!
snmp-server community PUBLIC RO
!
end
";

pub const JUNOS_R2_CFG: &str = "\
set system host-name r2
set system services ssh
set system ntp server 10.0.0.1
set system name-server 10.0.0.10
set system domain-name example.test
set snmp community PUBLIC
set interfaces lo0 unit 0 family inet address 192.0.2.2/32
set interfaces ge-0/0/0 unit 0 family inet address 10.0.0.2/30
set vlans USERS vlan-id 100
set routing-instances MGMT instance-type vrf
set routing-instances MGMT route-distinguisher 65000:1
set routing-options static route 0.0.0.0/0 next-hop 10.0.0.1
";

pub const EOS_R3_CFG: &str = "\
!
daemon TerminAttr
   exec /usr/bin/TerminAttr -ingestgrpcurl=apiserver.example.test:9910
   no shutdown
!
hostname r3
!
management api http-commands
   no shutdown
!
vrf instance MGMT
   rd 65000:1
!
vlan 100
   name USERS
!
interface Loopback0
   ip address 192.0.2.3/32
!
interface Ethernet1
   no switchport
   ip address 10.0.0.3/30
   no shutdown
!
ip route 0.0.0.0/0 10.0.0.3
!
management ssh
   idle-timeout 30
!
snmp-server community PUBLIC ro
!
end
";

// =====================================================================
// Public builders (re-used by determinism + integration tests)
// =====================================================================

pub fn build_zip_single_config() -> Vec<u8> {
    build_zip(&[("r1.cfg", CISCO_R1_CFG)])
}

pub fn build_zip_multiple_configs() -> Vec<u8> {
    build_zip(&[
        ("r1.cfg", CISCO_R1_CFG),
        ("r2.cfg", JUNOS_R2_CFG),
        ("r3.cfg", EOS_R3_CFG),
    ])
}

pub fn build_tar_multiple_configs() -> Vec<u8> {
    build_tar(&[
        ("r1.cfg", CISCO_R1_CFG),
        ("r2.cfg", JUNOS_R2_CFG),
        ("r3.cfg", EOS_R3_CFG),
    ])
}

pub fn build_targz_multiple_configs() -> Vec<u8> {
    use flate2::Compression;
    use flate2::GzBuilder;
    let tar_bytes = build_tar_multiple_configs();
    let mut out: Vec<u8> = Vec::new();
    // Fixed mtime (0), no embedded filename → byte-identical across
    // rebuilds.
    let mut encoder = GzBuilder::new()
        .mtime(0)
        .write(&mut out, Compression::default());
    encoder.write_all(&tar_bytes).expect("gzip write");
    encoder.finish().expect("gzip finish");
    out
}

// =====================================================================
// Internal zip / tar builders (deterministic timestamps + permissions)
// =====================================================================

fn build_zip(entries: &[(&str, &str)]) -> Vec<u8> {
    use zip::write::FileOptions;
    let buf: Vec<u8> = Vec::new();
    let cursor = std::io::Cursor::new(buf);
    let mut writer = zip::ZipWriter::new(cursor);
    // Fixed timestamp = 2020-01-01 00:00:00 → byte-stable archives.
    let fixed_time = zip::DateTime::from_date_and_time(2020, 1, 1, 0, 0, 0)
        .expect("fixed zip datetime is valid");
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644)
        .last_modified_time(fixed_time);
    for (name, body) in entries {
        writer
            .start_file(*name, options)
            .expect("zip start_file");
        writer.write_all(body.as_bytes()).expect("zip write body");
    }
    let cursor = writer.finish().expect("zip finish");
    cursor.into_inner()
}

fn build_tar(entries: &[(&str, &str)]) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::new();
    {
        let mut builder = tar::Builder::new(&mut out);
        for (name, body) in entries {
            let bytes = body.as_bytes();
            let mut header = tar::Header::new_gnu();
            header.set_path(*name).expect("tar set_path");
            header.set_size(bytes.len() as u64);
            header.set_mode(0o644);
            header.set_uid(0);
            header.set_gid(0);
            header.set_mtime(0);
            header.set_entry_type(tar::EntryType::Regular);
            header.set_cksum();
            builder
                .append(&header, bytes)
                .expect("tar append");
        }
        builder.finish().expect("tar finish");
    }
    out
}

// =====================================================================
// Filesystem helpers
// =====================================================================

fn fixtures_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("archives")
}

fn fixture_dir(name: &str) -> PathBuf {
    fixtures_root().join(name)
}

fn manifest_path() -> PathBuf {
    fixtures_root().join("_manifest.toml")
}

fn fixture_bytes_for(spec: &FixtureSpec) -> Vec<u8> {
    match spec.name {
        "zip-single-config" => build_zip_single_config(),
        "zip-multiple-configs" => build_zip_multiple_configs(),
        "tar-multiple-configs" => build_tar_multiple_configs(),
        "targz-multiple-configs" => build_targz_multiple_configs(),
        other => panic!("unknown fixture: {other}"),
    }
}

fn canonical_json(result: &ArchiveIntakeResult) -> String {
    // Pretty-print with a stable two-space indent so diffs read clean.
    serde_json::to_string_pretty(result).expect("json serialise")
}

// =====================================================================
// Regeneration helper (#[ignore]: explicit run only)
// =====================================================================

#[test]
#[ignore]
fn regenerate_fixtures() {
    let root = fixtures_root();
    fs::create_dir_all(&root).expect("create archives root");

    for spec in FIXTURES {
        let dir = fixture_dir(spec.name);
        fs::create_dir_all(&dir).expect("create fixture dir");
        let bytes = fixture_bytes_for(spec);
        fs::write(dir.join(spec.archive_filename), &bytes)
            .expect("write archive");
        let result = archive_intake::archive_intake(&bytes, spec.kind_hint.clone())
            .expect("archive_intake on freshly built fixture");
        // Sanity: detected kind matches the supplied hint for clean
        // committed inputs.
        assert_eq!(result.archive_kind_detected, spec.kind);
        let mut json = canonical_json(&result);
        json.push('\n');
        fs::write(dir.join("expected.json"), json).expect("write expected.json");
        eprintln!(
            "regenerated {}: {} bytes, {} entries, {} extracted",
            spec.name,
            bytes.len(),
            result.entry_count,
            result.extracted_count,
        );
    }

    // Rewrite the manifest with the current ARCHIVE_INTAKE_VERSION and
    // the fixture list.
    let mut manifest = String::new();
    manifest.push_str(
        "# Auto-generated by `cargo test --test archive_intake_corpus -- --ignored\n",
    );
    manifest.push_str("#   regenerate_fixtures --nocapture`.\n");
    manifest.push_str("# Mirrors `archive_intake::ARCHIVE_INTAKE_VERSION`.\n\n");
    manifest.push_str(&format!(
        "archive_intake_version = {}\n\n",
        archive_intake::ARCHIVE_INTAKE_VERSION
    ));
    manifest.push_str("fixtures = [\n");
    for spec in FIXTURES {
        manifest.push_str(&format!("  \"{}\",\n", spec.name));
    }
    manifest.push_str("]\n");
    fs::write(manifest_path(), manifest).expect("write manifest");
    eprintln!("regenerated manifest at {}", manifest_path().display());
}

// =====================================================================
// Frozen corpus assertion (the actual gate)
// =====================================================================

#[test]
fn fixture_outputs_are_byte_equal() {
    for spec in FIXTURES {
        let dir = fixture_dir(spec.name);
        let archive_path = dir.join(spec.archive_filename);
        let expected_path = dir.join("expected.json");

        let bytes = fs::read(&archive_path).unwrap_or_else(|e| {
            panic!(
                "missing fixture archive at {}: {e}\n\
                run `cargo test --test archive_intake_corpus -- --ignored regenerate_fixtures --nocapture` to regenerate.",
                archive_path.display()
            )
        });
        let expected = fs::read_to_string(&expected_path).unwrap_or_else(|e| {
            panic!(
                "missing expected.json at {}: {e}",
                expected_path.display()
            )
        });

        let result = archive_intake::archive_intake(&bytes, spec.kind_hint.clone())
            .unwrap_or_else(|e| {
                panic!(
                    "archive_intake({} bytes from {}) returned Err: {e}",
                    bytes.len(),
                    archive_path.display()
                )
            });

        // Round-trip the expected JSON through the same type to
        // canonicalise (whitespace, key order). Both sides go through
        // serde_json::to_string_pretty so the diff is meaningful.
        let parsed_expected: ArchiveIntakeResult =
            serde_json::from_str(&expected).unwrap_or_else(|e| {
                panic!(
                    "expected.json at {} is not valid ArchiveIntakeResult JSON: {e}",
                    expected_path.display()
                )
            });
        let canon_actual = canonical_json(&result);
        let canon_expected = canonical_json(&parsed_expected);

        assert_eq!(
            canon_actual.trim(),
            canon_expected.trim(),
            "fixture {} drifted from committed expected.json",
            spec.name
        );
    }
}

#[test]
fn manifest_contains_every_fixture_directory() {
    let root = fixtures_root();
    let manifest_text = fs::read_to_string(manifest_path())
        .expect("read archive fixtures manifest");

    // Naive but stable extraction — we don't pull in a TOML parser
    // just for a names list. Format: `fixtures = [ "name", ... ]`.
    let manifest_names: BTreeSet<String> = manifest_text
        .lines()
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
        .collect();

    let disk_names: BTreeSet<String> = fs::read_dir(&root)
        .expect("read archives root")
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();

    assert_eq!(
        manifest_names, disk_names,
        "manifest and on-disk archive fixture directories disagree"
    );
}

