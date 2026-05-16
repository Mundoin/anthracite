//! Service-area helpers and accumulators.
//!
//! Silent decision (flagged in V1K final report): the V1I `ServiceModel`
//! schema does not carry first-class fields for SSH version / timeout,
//! SNMP location / contact / community-vs-trap split, DNS domain list,
//! syslog severity / facility. V1K packs these scalars into
//! `ServiceModel.notes` as a deterministic `key=value;…` string. For
//! SNMP, communities and trap hosts are emitted as two distinct
//! `ServiceModel { kind: Snmp }` records differentiated by `notes`.

use crate::engines::network_model::{ServiceKind, ServiceModel};

#[derive(Debug, Default, Clone)]
pub struct SshAccum {
    pub version: Option<String>,
    pub idle_timeout_seconds: Option<u32>,
    pub source_interface: Option<String>,
}

#[derive(Debug, Default, Clone)]
pub struct SnmpAccum {
    pub communities: Vec<String>,
    pub location: Option<String>,
    pub contact: Option<String>,
    pub trap_hosts: Vec<String>,
    pub source_interface: Option<String>,
}

#[derive(Debug, Default, Clone)]
pub struct NtpAccum {
    pub servers: Vec<String>,
    pub source_interface: Option<String>,
}

#[derive(Debug, Default, Clone)]
pub struct DnsAccum {
    pub servers: Vec<String>,
    pub domains: Vec<String>,
}

#[derive(Debug, Default, Clone)]
pub struct SyslogAccum {
    pub servers: Vec<String>,
    pub severity: Option<String>,
    pub source_interface: Option<String>,
    pub facility: Option<String>,
}

fn join_notes(pairs: &[(&str, String)]) -> Option<String> {
    let filtered: Vec<String> = pairs
        .iter()
        .filter(|(_, v)| !v.is_empty())
        .map(|(k, v)| format!("{k}={v}"))
        .collect();
    if filtered.is_empty() {
        None
    } else {
        Some(filtered.join(";"))
    }
}

impl SshAccum {
    pub fn touched(&self) -> bool {
        self.version.is_some() || self.idle_timeout_seconds.is_some() || self.source_interface.is_some()
    }
    pub fn build(self) -> Option<ServiceModel> {
        if !self.touched() {
            return None;
        }
        let pairs: Vec<(&str, String)> = vec![
            ("version", self.version.unwrap_or_default()),
            (
                "idle_timeout_seconds",
                self.idle_timeout_seconds
                    .map(|n| n.to_string())
                    .unwrap_or_default(),
            ),
        ];
        Some(ServiceModel {
            kind: ServiceKind::Ssh,
            servers: Vec::new(),
            source_interface: self.source_interface,
            vrf: None,
            authentication_mode: None,
            notes: join_notes(&pairs),
        })
    }
}

impl SnmpAccum {
    pub fn touched(&self) -> bool {
        !self.communities.is_empty()
            || self.location.is_some()
            || self.contact.is_some()
            || !self.trap_hosts.is_empty()
            || self.source_interface.is_some()
    }
    /// Returns up to two records: one for communities/metadata, one for
    /// trap hosts. Either may be absent.
    pub fn build(self) -> Vec<ServiceModel> {
        let mut out: Vec<ServiceModel> = Vec::new();
        let has_community_meta = !self.communities.is_empty()
            || self.location.is_some()
            || self.contact.is_some()
            || self.source_interface.is_some();
        if has_community_meta {
            let mut comms = self.communities.clone();
            comms.sort();
            comms.dedup();
            let pairs: Vec<(&str, String)> = vec![
                ("role", "agent".to_string()),
                ("communities", comms.join(",")),
                ("location", self.location.clone().unwrap_or_default()),
                ("contact", self.contact.clone().unwrap_or_default()),
            ];
            out.push(ServiceModel {
                kind: ServiceKind::Snmp,
                servers: Vec::new(),
                source_interface: self.source_interface.clone(),
                vrf: None,
                authentication_mode: None,
                notes: join_notes(&pairs),
            });
        }
        if !self.trap_hosts.is_empty() {
            let mut hosts = self.trap_hosts;
            hosts.sort();
            hosts.dedup();
            let pairs: Vec<(&str, String)> = vec![("role", "trap_hosts".to_string())];
            out.push(ServiceModel {
                kind: ServiceKind::Snmp,
                servers: hosts,
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: join_notes(&pairs),
            });
        }
        out
    }
}

impl NtpAccum {
    pub fn touched(&self) -> bool {
        !self.servers.is_empty() || self.source_interface.is_some()
    }
    pub fn build(self) -> Option<ServiceModel> {
        if !self.touched() {
            return None;
        }
        let mut servers = self.servers;
        servers.sort();
        servers.dedup();
        Some(ServiceModel {
            kind: ServiceKind::Ntp,
            servers,
            source_interface: self.source_interface,
            vrf: None,
            authentication_mode: None,
            notes: None,
        })
    }
}

impl DnsAccum {
    pub fn touched(&self) -> bool {
        !self.servers.is_empty() || !self.domains.is_empty()
    }
    pub fn build(self) -> Option<ServiceModel> {
        if !self.touched() {
            return None;
        }
        let mut servers = self.servers;
        servers.sort();
        servers.dedup();
        let mut domains = self.domains;
        domains.sort();
        domains.dedup();
        let pairs: Vec<(&str, String)> = vec![("domains", domains.join(","))];
        Some(ServiceModel {
            kind: ServiceKind::Dns,
            servers,
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes: join_notes(&pairs),
        })
    }
}

impl SyslogAccum {
    pub fn touched(&self) -> bool {
        !self.servers.is_empty()
            || self.severity.is_some()
            || self.source_interface.is_some()
            || self.facility.is_some()
    }
    pub fn build(self) -> Option<ServiceModel> {
        if !self.touched() {
            return None;
        }
        let mut servers = self.servers;
        servers.sort();
        servers.dedup();
        let pairs: Vec<(&str, String)> = vec![
            ("severity", self.severity.clone().unwrap_or_default()),
            ("facility", self.facility.clone().unwrap_or_default()),
        ];
        Some(ServiceModel {
            kind: ServiceKind::Syslog,
            servers,
            source_interface: self.source_interface,
            vrf: None,
            authentication_mode: None,
            notes: join_notes(&pairs),
        })
    }
}

/// Identifier used for deterministic sorting of `services` Vec by
/// `(kind, identifier)`. Identifier prefers the first server, falls back
/// to the notes string.
pub fn service_identifier(s: &ServiceModel) -> String {
    s.servers
        .first()
        .cloned()
        .or_else(|| s.notes.clone())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ssh_minimal_emits_one_record() {
        let mut acc = SshAccum::default();
        acc.version = Some("2".to_string());
        acc.idle_timeout_seconds = Some(300);
        let svc = acc.build().unwrap();
        assert_eq!(svc.kind, ServiceKind::Ssh);
        assert!(svc.notes.as_deref().unwrap().contains("version=2"));
        assert!(svc
            .notes
            .as_deref()
            .unwrap()
            .contains("idle_timeout_seconds=300"));
    }

    #[test]
    fn ssh_untouched_emits_none() {
        let acc = SshAccum::default();
        assert!(acc.build().is_none());
    }

    #[test]
    fn snmp_emits_separate_community_and_trap_records() {
        let mut acc = SnmpAccum::default();
        acc.communities.push("public".to_string());
        acc.location = Some("rack-3".to_string());
        acc.trap_hosts.push("10.0.0.50".to_string());
        let recs = acc.build();
        assert_eq!(recs.len(), 2);
        assert!(recs.iter().any(|r| r
            .notes
            .as_deref()
            .map(|n| n.contains("role=agent"))
            .unwrap_or(false)));
        assert!(recs.iter().any(|r| r
            .notes
            .as_deref()
            .map(|n| n.contains("role=trap_hosts"))
            .unwrap_or(false)
            && r.servers.contains(&"10.0.0.50".to_string())));
    }

    #[test]
    fn ntp_emits_sorted_unique_servers() {
        let mut acc = NtpAccum::default();
        acc.servers.push("10.0.0.2".to_string());
        acc.servers.push("10.0.0.1".to_string());
        acc.servers.push("10.0.0.1".to_string());
        let svc = acc.build().unwrap();
        assert_eq!(svc.kind, ServiceKind::Ntp);
        assert_eq!(svc.servers, vec!["10.0.0.1".to_string(), "10.0.0.2".to_string()]);
    }

    #[test]
    fn dns_packs_domains_into_notes() {
        let mut acc = DnsAccum::default();
        acc.servers.push("8.8.8.8".to_string());
        acc.domains.push("example.com".to_string());
        let svc = acc.build().unwrap();
        assert_eq!(svc.kind, ServiceKind::Dns);
        assert!(svc.notes.as_deref().unwrap().contains("domains=example.com"));
    }

    #[test]
    fn syslog_packs_severity_and_facility() {
        let mut acc = SyslogAccum::default();
        acc.servers.push("10.0.0.99".to_string());
        acc.severity = Some("informational".to_string());
        acc.facility = Some("local7".to_string());
        let svc = acc.build().unwrap();
        let n = svc.notes.as_deref().unwrap();
        assert!(n.contains("severity=informational"));
        assert!(n.contains("facility=local7"));
    }
}
