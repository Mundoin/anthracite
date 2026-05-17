//! V1U fixture / determinism / negative tests for the cisco-nxos parser.
//!
//! Fixture files live in `tests/fixtures/cisco-nxos/<name>/`:
//!   - `config.cfg`  — raw NX-OS config under test
//!   - `expected.json` — canonical pretty-printed `DeviceModel` JSON
//!
//! Seed `expected.json` by running:
//!     ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test cisco_nxos_fixtures
//! Hand-review the captured JSON before committing.

use std::fs;
use std::path::PathBuf;

use anthracite_lib::engines::network_model::{DeviceModel, PlatformRef};
use anthracite_lib::engines::parsers;

const FIXTURE_ROOT: &str = "tests/fixtures/cisco-nxos";

fn nxos_platform_ref() -> PlatformRef {
    PlatformRef {
        platform_id: Some("cisco-nxos".to_string()),
        vendor: Some("Cisco".to_string()),
        os_family: Some("NX-OS".to_string()),
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
    parsers::parse_device_config(nxos_platform_ref(), &cfg).expect("parse_device_config Ok")
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
        panic!(
            "fixture {name} mismatch.\n{first_diff}\n--- produced ---\n{produced}\n--- expected ---\n{expected}"
        );
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

#[test]
fn feature_commands_fixture_byte_equal() {
    assert_fixture_byte_equal("feature-commands");
}

#[test]
fn vlan_database_fixture_byte_equal() {
    assert_fixture_byte_equal("vlan-database");
}

#[test]
fn vrf_segmentation_fixture_byte_equal() {
    assert_fixture_byte_equal("vrf-segmentation");
}

#[test]
fn nxos_divergence_from_iosxe_fixture_byte_equal() {
    assert_fixture_byte_equal("nxos-divergence-from-iosxe");
}

#[test]
fn services_ssh_ntp_syslog_fixture_byte_equal() {
    assert_fixture_byte_equal("services-ssh-ntp-syslog");
}

#[test]
fn large_interface_count_fixture_byte_equal() {
    assert_fixture_byte_equal("large-interface-count");
}

#[test]
fn cross_vendor_equivalent_small_fixture_byte_equal() {
    assert_fixture_byte_equal("cross-vendor-equivalent-small");
}

// =====================================================================
// Determinism
// =====================================================================

#[test]
fn small_parses_byte_identically_across_ten_runs() {
    let cfg = read_config("small");
    let pref = nxos_platform_ref();
    let first =
        pretty(&parsers::parse_device_config(pref.clone(), &cfg).expect("first parse"));
    for i in 1..10 {
        let nth =
            pretty(&parsers::parse_device_config(pref.clone(), &cfg).expect("nth parse"));
        assert_eq!(first, nth, "run {i} differs from run 0");
    }
}

#[test]
fn small_round_trips_through_serde() {
    let model = parse_fixture("small");
    let s1 = serde_json::to_string(&model).unwrap();
    let back: DeviceModel = serde_json::from_str(&s1).unwrap();
    let s2 = serde_json::to_string(&back).unwrap();
    assert_eq!(s1, s2, "round-trip serialisation diverged");
}

// =====================================================================
// Negative
// =====================================================================

#[test]
fn empty_input_returns_empty_shell_with_warning() {
    let m = parsers::parse_device_config(nxos_platform_ref(), "").expect("ok");
    assert!(
        m.parse_confidence
            .warnings
            .contains(&"empty_input".to_string())
    );
    assert_eq!(m.parse_confidence.score, Some(0.0));
    assert!(m.interfaces.is_empty());
}

#[test]
fn whitespace_only_input_returns_empty_shell_with_warning() {
    let m = parsers::parse_device_config(nxos_platform_ref(), "   \n\n\t\n").expect("ok");
    assert!(
        m.parse_confidence
            .warnings
            .contains(&"empty_input".to_string())
    );
}

#[test]
fn wrong_platform_ref_returns_err() {
    let mut pref = nxos_platform_ref();
    pref.platform_id = Some("unknown-vendor-xyz".to_string());
    let r = parsers::parse_device_config(pref, "hostname x\n");
    assert_eq!(r.unwrap_err(), "unsupported platform: unknown-vendor-xyz");
}

#[test]
fn single_garbage_line_no_panic() {
    let m = parsers::parse_device_config(nxos_platform_ref(), "wibble wobble\n").expect("ok");
    assert_eq!(m.unknown_lines.len(), 1);
}

// =====================================================================
// NX-OS behavioural invariants
// =====================================================================

#[test]
fn feature_ssh_enables_ssh_service() {
    let cfg = "hostname test\nfeature ssh\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    use anthracite_lib::engines::network_model::ServiceKind;
    assert!(
        m.services.iter().any(|s| s.kind == ServiceKind::Ssh),
        "feature ssh must produce SSH service"
    );
}

#[test]
fn no_feature_ssh_suppresses_ssh_service() {
    let cfg = "hostname test\nfeature ssh\nno feature ssh\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    use anthracite_lib::engines::network_model::ServiceKind;
    assert!(
        !m.services.iter().any(|s| s.kind == ServiceKind::Ssh),
        "no feature ssh must suppress SSH service"
    );
}

#[test]
fn vrf_context_block_captured() {
    let cfg = "vrf context MGMT\n  rd 65000:1\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    assert!(
        m.vrfs.iter().any(|v| v.name == "MGMT"),
        "vrf context MGMT must appear in vrfs"
    );
    let vrf = m.vrfs.iter().find(|v| v.name == "MGMT").unwrap();
    assert_eq!(
        vrf.route_distinguisher.as_deref(),
        Some("65000:1"),
        "rd must be captured from vrf context block"
    );
}

#[test]
fn ip_route_inside_vrf_context_binds_vrf() {
    let cfg = "vrf context OOB\n  ip route 0.0.0.0/0 10.0.0.1\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    assert!(
        m.static_routes
            .iter()
            .any(|r| r.prefix == "0.0.0.0/0" && r.vrf.as_deref() == Some("OOB")),
        "ip route inside vrf context must carry vrf binding"
    );
}

#[test]
fn loopback_interface_classified_as_loopback() {
    let cfg = "interface loopback0\n  ip address 10.255.1.1/32\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    use anthracite_lib::engines::network_model::InterfaceKind;
    assert!(
        m.interfaces
            .iter()
            .any(|i| i.kind == InterfaceKind::Loopback),
        "loopback0 must be classified Loopback"
    );
}

#[test]
fn port_channel_interface_classified_as_lag() {
    let cfg = "interface port-channel1\n  no switchport\n  ip address 10.0.0.1/30\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    use anthracite_lib::engines::network_model::InterfaceKind;
    assert!(
        m.interfaces.iter().any(|i| i.kind == InterfaceKind::Lag),
        "port-channel1 must be classified Lag"
    );
}

#[test]
fn channel_group_membership_recorded() {
    let cfg =
        "interface Ethernet1/1\n  channel-group 1 mode active\ninterface Ethernet1/2\n  channel-group 1 mode active\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    assert_eq!(m.lag_groups.len(), 1, "one lag group expected");
    let lag = &m.lag_groups[0];
    assert_eq!(lag.name, "port-channel1");
    assert_eq!(lag.members.len(), 2);
}

#[test]
fn vlan_database_vlans_captured() {
    let cfg = "vlan 10\n  name USERS\nvlan 20\n  name VOICE\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    assert!(m.vlans.iter().any(|v| v.id == 10 && v.name.as_deref() == Some("USERS")));
    assert!(m.vlans.iter().any(|v| v.id == 20 && v.name.as_deref() == Some("VOICE")));
}

#[test]
fn ntp_server_use_vrf_syntax_captured() {
    let cfg = "ntp server use-vrf OOB 10.200.0.123\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    use anthracite_lib::engines::network_model::ServiceKind;
    let ntp = m.services.iter().find(|s| s.kind == ServiceKind::Ntp);
    assert!(ntp.is_some(), "ntp service must be present");
    assert!(
        ntp.unwrap().servers.contains(&"10.200.0.123".to_string()),
        "ntp server address must be captured from use-vrf syntax"
    );
}

#[test]
fn ip_name_server_use_vrf_syntax_captured() {
    let cfg = "ip name-server use-vrf OOB 10.200.0.53\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    use anthracite_lib::engines::network_model::ServiceKind;
    let dns = m.services.iter().find(|s| s.kind == ServiceKind::Dns);
    assert!(dns.is_some(), "dns service must be present");
    assert!(
        dns.unwrap().servers.contains(&"10.200.0.53".to_string()),
        "dns server must be captured from ip name-server use-vrf syntax"
    );
}

#[test]
fn truncated_input_sets_warning() {
    let cfg = "hostname nxos-truncated\ninterface Ethernet1/1\n  ip address 10.0.0.1/30\n";
    let m = parsers::parse_device_config(nxos_platform_ref(), cfg).expect("ok");
    assert!(
        m.parse_confidence
            .warnings
            .contains(&"truncated_input".to_string()),
        "config without `end` must produce truncated_input warning"
    );
}

#[test]
fn parser_version_in_evidence() {
    let m = parse_fixture("small");
    let pv = m.evidence.parser_version.as_deref().unwrap_or("");
    assert_eq!(
        pv,
        anthracite_lib::engines::parsers::cisco_nxos::PARSER_VERSION
            .to_string()
            .as_str(),
        "evidence.parser_version must equal PARSER_VERSION constant"
    );
}

// =====================================================================
// Registry integrity
// =====================================================================

#[test]
fn cisco_nxos_resolves_through_vendor_registry() {
    let p = anthracite_lib::engines::vendor_registry::get_platform("cisco-nxos")
        .expect("cisco-nxos must resolve");
    assert_eq!(p.id, "cisco-nxos");
    assert_eq!(p.vendor, "Cisco");
}
