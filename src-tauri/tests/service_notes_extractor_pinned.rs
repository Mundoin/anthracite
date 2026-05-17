//! V1P service-notes extractor pinned-strings test.
//!
//! Each scenario uses a `ServiceModel.notes` string copied verbatim
//! from a committed parser fixture's `expected.json`. If a parser
//! ever changes its notes-encoding shape, those fixture files
//! change too, and this test will surface the drift loudly before
//! it silently breaks the validator's rule pack.
//!
//! Source fixtures (re-verified 2026-05-17):
//!   - cisco-iosxe/services-snmp-ntp-ssh-syslog/expected.json
//!   - arista-eos/small/expected.json
//!   - arista-eos/cross-vendor-equivalent-small/expected.json
//!   - juniper-junos/small-set-style/expected.json

use anthracite_lib::engines::{
    network_model::{ServiceKind, ServiceModel},
    validator::service_notes::{extract_service_facts, ServiceFacts, ServiceRole},
};

fn snmp_svc(notes: &str) -> ServiceModel {
    ServiceModel {
        kind: ServiceKind::Snmp,
        servers: Vec::new(),
        source_interface: None,
        vrf: None,
        authentication_mode: None,
        notes: Some(notes.to_string()),
    }
}

fn ssh_svc(notes: &str) -> ServiceModel {
    ServiceModel {
        kind: ServiceKind::Ssh,
        servers: Vec::new(),
        source_interface: None,
        vrf: None,
        authentication_mode: None,
        notes: Some(notes.to_string()),
    }
}

#[test]
fn cisco_snmp_agent_pinned_notes_round_trip_to_full_facts() {
    // From cisco-iosxe/services-snmp-ntp-ssh-syslog/expected.json line 114.
    let pinned =
        "role=agent;communities=PRIVATE-COMM,PUBLIC-COMM;location=DataCenter-A;contact=noc@example.test";
    let facts = extract_service_facts(&snmp_svc(pinned));
    let expected = ServiceFacts {
        communities: vec!["PRIVATE-COMM".to_string(), "PUBLIC-COMM".to_string()],
        role: Some(ServiceRole::Agent),
        location: Some("DataCenter-A".to_string()),
        contact: Some("noc@example.test".to_string()),
        idle_timeout_seconds: None,
        ssh_version: None,
        raw_unparsed: Vec::new(),
    };
    assert_eq!(facts, expected);
}

#[test]
fn cisco_snmp_trap_hosts_pinned_notes_yield_trap_hosts_role() {
    // From cisco-iosxe/services-snmp-ntp-ssh-syslog/expected.json line 106.
    let pinned = "role=trap_hosts";
    let facts = extract_service_facts(&snmp_svc(pinned));
    assert_eq!(facts.role, Some(ServiceRole::TrapHosts));
    assert!(facts.communities.is_empty());
    assert!(facts.location.is_none());
    assert!(facts.contact.is_none());
    assert!(facts.raw_unparsed.is_empty());
}

#[test]
fn eos_small_snmp_pinned_notes_extract_full_facts() {
    // From arista-eos/small/expected.json line 324.
    let pinned = "location=dc-a;contact=noc@example.test;communities=PUBLIC";
    let facts = extract_service_facts(&snmp_svc(pinned));
    let expected = ServiceFacts {
        communities: vec!["PUBLIC".to_string()],
        role: None,
        location: Some("dc-a".to_string()),
        contact: Some("noc@example.test".to_string()),
        idle_timeout_seconds: None,
        ssh_version: None,
        raw_unparsed: Vec::new(),
    };
    assert_eq!(facts, expected);
}

#[test]
fn eos_small_snmp_trap_pinned_notes_yield_trap_hosts_role() {
    // From arista-eos/small/expected.json line 316.
    let pinned = "kind=trap_hosts";
    let facts = extract_service_facts(&snmp_svc(pinned));
    assert_eq!(facts.role, Some(ServiceRole::TrapHosts));
}

#[test]
fn eos_cross_vendor_equivalent_pinned_notes_extract_one_community() {
    // From arista-eos/cross-vendor-equivalent-small/expected.json line 159.
    let pinned = "communities=PUBLIC";
    let facts = extract_service_facts(&snmp_svc(pinned));
    let expected = ServiceFacts {
        communities: vec!["PUBLIC".to_string()],
        role: None,
        location: None,
        contact: None,
        idle_timeout_seconds: None,
        ssh_version: None,
        raw_unparsed: Vec::new(),
    };
    assert_eq!(facts, expected);
}

#[test]
fn junos_small_set_style_snmp_pinned_notes_extract_full_facts() {
    // From juniper-junos/small-set-style/expected.json line 198.
    let pinned = "location=DC-A;contact=noc@example.test;communities=PUBLIC";
    let facts = extract_service_facts(&snmp_svc(pinned));
    let expected = ServiceFacts {
        communities: vec!["PUBLIC".to_string()],
        role: None,
        location: Some("DC-A".to_string()),
        contact: Some("noc@example.test".to_string()),
        idle_timeout_seconds: None,
        ssh_version: None,
        raw_unparsed: Vec::new(),
    };
    assert_eq!(facts, expected);
}

#[test]
fn cisco_ssh_pinned_notes_extract_version_and_idle_timeout() {
    // From cisco-iosxe/services-snmp-ntp-ssh-syslog/expected.json line 122.
    let pinned = "version=2;idle_timeout_seconds=60";
    let facts = extract_service_facts(&ssh_svc(pinned));
    assert_eq!(facts.ssh_version, Some("2".to_string()));
    assert_eq!(facts.idle_timeout_seconds, Some(60));
    assert!(facts.raw_unparsed.is_empty());
}

#[test]
fn eos_ssh_pinned_notes_extract_idle_timeout_only() {
    // From arista-eos/small/expected.json line 332 and
    // arista-eos/cross-vendor-equivalent-small/expected.json line 167.
    let pinned = "idle_timeout_seconds=1800";
    let facts = extract_service_facts(&ssh_svc(pinned));
    assert_eq!(facts.idle_timeout_seconds, Some(1800));
    assert!(facts.ssh_version.is_none());
}
