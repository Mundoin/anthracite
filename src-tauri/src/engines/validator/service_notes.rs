//! Service-notes extractor (Path A) — V1P.
//!
//! Reverses the deterministic `key=value;key=value` encoding emitted
//! by V1K / V1M / V1N parsers into `ServiceModel.notes` for `Snmp`
//! and `Ssh` records. Pure function, no `unwrap()`, no regex, no
//! `HashMap`, no allocation beyond the returned `ServiceFacts`.
//!
//! Encoding rules (verified against parser source on 2026-05-17 —
//! see `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md` §"Service-
//! notes extractor contract"):
//!
//!   - pair separator: `;`
//!   - key-value separator: `=` (split on FIRST `=` only)
//!   - `communities=` value is comma-separated; preserve document
//!     order; do not dedup (parser-side dedup already ran)
//!   - `role=agent` (Cisco) marks the community/metadata record
//!   - `role=trap_hosts` (Cisco) OR `kind=trap_hosts` (Junos / EOS)
//!     marks the trap-hosts record
//!   - whitespace inside values is preserved verbatim — values are
//!     not trimmed (e.g. `location=DataCenter A` survives)
//!   - any unrecognised pair pushes into `raw_unparsed`; nothing is
//!     silently dropped
//!
//! Locked at the integration level by
//! `tests/service_notes_extractor_pinned.rs` against verbatim
//! strings copied from the existing parser fixture corpora. That
//! file is the firewall against parser-side encoding drift; if it
//! goes red, the validator and the parsers have stopped agreeing
//! and the extractor — or the rule pack — needs an explicit update.

use crate::engines::network_model::ServiceModel;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ServiceRole {
    Agent,
    TrapHosts,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ServiceFacts {
    pub communities: Vec<String>,
    pub role: Option<ServiceRole>,
    pub location: Option<String>,
    pub contact: Option<String>,
    pub idle_timeout_seconds: Option<u32>,
    pub ssh_version: Option<String>,
    pub raw_unparsed: Vec<(String, String)>,
}

/// Extract a structured `ServiceFacts` from a `ServiceModel.notes`
/// string. `notes == None` or `notes == Some("")` → default facts.
pub fn extract_service_facts(svc: &ServiceModel) -> ServiceFacts {
    let raw = match svc.notes.as_deref() {
        Some(s) if !s.is_empty() => s,
        _ => return ServiceFacts::default(),
    };
    parse_notes(raw)
}

fn parse_notes(raw: &str) -> ServiceFacts {
    let mut facts = ServiceFacts::default();
    for pair in raw.split(';') {
        if pair.is_empty() {
            continue;
        }
        let (key, value) = match pair.find('=') {
            Some(idx) => (&pair[..idx], &pair[idx + 1..]),
            None => {
                facts
                    .raw_unparsed
                    .push((pair.to_string(), String::new()));
                continue;
            }
        };
        match key {
            "communities" => {
                if !value.is_empty() {
                    for c in value.split(',') {
                        facts.communities.push(c.to_string());
                    }
                }
            }
            "role" => match value {
                "agent" => facts.role = Some(ServiceRole::Agent),
                "trap_hosts" => facts.role = Some(ServiceRole::TrapHosts),
                _ => facts
                    .raw_unparsed
                    .push((key.to_string(), value.to_string())),
            },
            "kind" => match value {
                "trap_hosts" => facts.role = Some(ServiceRole::TrapHosts),
                _ => facts
                    .raw_unparsed
                    .push((key.to_string(), value.to_string())),
            },
            "location" => facts.location = Some(value.to_string()),
            "contact" => facts.contact = Some(value.to_string()),
            "version" => facts.ssh_version = Some(value.to_string()),
            "idle_timeout_seconds" => match value.parse::<u32>() {
                Ok(n) => facts.idle_timeout_seconds = Some(n),
                Err(_) => facts
                    .raw_unparsed
                    .push((key.to_string(), value.to_string())),
            },
            _ => facts
                .raw_unparsed
                .push((key.to_string(), value.to_string())),
        }
    }
    facts
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::network_model::ServiceKind;

    fn svc_with_notes(notes: Option<&str>) -> ServiceModel {
        ServiceModel {
            kind: ServiceKind::Snmp,
            servers: Vec::new(),
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes: notes.map(|s| s.to_string()),
        }
    }

    #[test]
    fn empty_notes_returns_default_facts() {
        assert_eq!(extract_service_facts(&svc_with_notes(None)), ServiceFacts::default());
        assert_eq!(
            extract_service_facts(&svc_with_notes(Some(""))),
            ServiceFacts::default()
        );
    }

    #[test]
    fn cisco_snmp_agent_notes_extract_full_facts() {
        let svc = svc_with_notes(Some(
            "role=agent;communities=PUBLIC-COMM,PRIVATE-COMM;location=DataCenter-A;contact=noc@example.test",
        ));
        let f = extract_service_facts(&svc);
        assert_eq!(f.role, Some(ServiceRole::Agent));
        assert_eq!(
            f.communities,
            vec!["PUBLIC-COMM".to_string(), "PRIVATE-COMM".to_string()]
        );
        assert_eq!(f.location, Some("DataCenter-A".to_string()));
        assert_eq!(f.contact, Some("noc@example.test".to_string()));
        assert!(f.raw_unparsed.is_empty());
    }

    #[test]
    fn junos_snmp_notes_extract_facts_in_any_order() {
        // Junos emits location/contact before communities; ours must
        // parse correctly regardless of order.
        let svc = svc_with_notes(Some(
            "location=DC-A;contact=noc@example.test;communities=PUBLIC",
        ));
        let f = extract_service_facts(&svc);
        assert_eq!(f.role, None);
        assert_eq!(f.communities, vec!["PUBLIC".to_string()]);
        assert_eq!(f.location, Some("DC-A".to_string()));
        assert_eq!(f.contact, Some("noc@example.test".to_string()));
        assert!(f.raw_unparsed.is_empty());
    }

    #[test]
    fn eos_snmp_communities_only_extracts_one_community() {
        let svc = svc_with_notes(Some("communities=PUBLIC"));
        let f = extract_service_facts(&svc);
        assert_eq!(f.role, None);
        assert_eq!(f.communities, vec!["PUBLIC".to_string()]);
        assert_eq!(f.location, None);
        assert_eq!(f.contact, None);
    }

    #[test]
    fn cisco_trap_hosts_role_marker_recognized() {
        let svc = svc_with_notes(Some("role=trap_hosts"));
        let f = extract_service_facts(&svc);
        assert_eq!(f.role, Some(ServiceRole::TrapHosts));
        assert!(f.communities.is_empty());
    }

    #[test]
    fn junos_eos_trap_hosts_kind_marker_recognized() {
        let svc = svc_with_notes(Some("kind=trap_hosts"));
        let f = extract_service_facts(&svc);
        assert_eq!(f.role, Some(ServiceRole::TrapHosts));
    }

    #[test]
    fn unknown_key_lands_in_raw_unparsed_without_dropping_others() {
        let svc = svc_with_notes(Some("weird_key=xyz;communities=A"));
        let f = extract_service_facts(&svc);
        assert_eq!(f.communities, vec!["A".to_string()]);
        assert_eq!(
            f.raw_unparsed,
            vec![("weird_key".to_string(), "xyz".to_string())]
        );
    }

    #[test]
    fn value_containing_equals_is_split_only_on_the_first_one() {
        let svc = svc_with_notes(Some("notes=key1=v1=v2;communities=A"));
        let f = extract_service_facts(&svc);
        assert_eq!(f.communities, vec!["A".to_string()]);
        assert_eq!(
            f.raw_unparsed,
            vec![("notes".to_string(), "key1=v1=v2".to_string())]
        );
    }

    #[test]
    fn malformed_idle_timeout_lands_in_raw_unparsed() {
        let svc = ServiceModel {
            kind: ServiceKind::Ssh,
            servers: Vec::new(),
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes: Some("idle_timeout_seconds=abc".to_string()),
        };
        let f = extract_service_facts(&svc);
        assert_eq!(f.idle_timeout_seconds, None);
        assert_eq!(
            f.raw_unparsed,
            vec![("idle_timeout_seconds".to_string(), "abc".to_string())]
        );
    }

    #[test]
    fn ssh_version_two_extracts_to_ssh_version_field() {
        let svc = ServiceModel {
            kind: ServiceKind::Ssh,
            servers: Vec::new(),
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes: Some("version=2;idle_timeout_seconds=60".to_string()),
        };
        let f = extract_service_facts(&svc);
        assert_eq!(f.ssh_version, Some("2".to_string()));
        assert_eq!(f.idle_timeout_seconds, Some(60));
    }

    #[test]
    fn whitespace_inside_value_is_preserved() {
        let svc = svc_with_notes(Some("location=DataCenter A;communities=PUBLIC"));
        let f = extract_service_facts(&svc);
        assert_eq!(f.location, Some("DataCenter A".to_string()));
        assert_eq!(f.communities, vec!["PUBLIC".to_string()]);
    }

    #[test]
    fn pair_without_equals_lands_in_raw_unparsed_with_empty_value() {
        let svc = svc_with_notes(Some("loner;communities=A"));
        let f = extract_service_facts(&svc);
        assert_eq!(f.communities, vec!["A".to_string()]);
        assert_eq!(
            f.raw_unparsed,
            vec![("loner".to_string(), String::new())]
        );
    }
}
