//! EOS services helpers — V1N.
//!
//! EOS differs from IOS/XE most visibly in services:
//!   - SSH lives under a `management ssh` block (not top-level `ip ssh`)
//!   - SNMP commands match IOS/XE shape (`snmp-server community`, …)
//!   - NTP / DNS / syslog top-level commands look IOS-like
//!
//! Notes-encoding mirrors V1K/V1L so receipt projection stays uniform.

use crate::engines::network_model::{ServiceKind, ServiceModel};

#[derive(Debug, Default, Clone)]
pub struct SshAccum {
    pub enabled: bool,
    pub idle_timeout_minutes: Option<u32>,
    pub vrf: Option<String>,
    pub source_interface: Option<String>,
}

impl SshAccum {
    pub fn build(self) -> Option<ServiceModel> {
        if !self.enabled
            && self.idle_timeout_minutes.is_none()
            && self.vrf.is_none()
            && self.source_interface.is_none()
        {
            return None;
        }
        let mut notes: Vec<String> = Vec::new();
        if let Some(t) = self.idle_timeout_minutes {
            // EOS idle-timeout is minutes; convert to seconds for the
            // canonical V1L vocabulary.
            notes.push(format!("idle_timeout_seconds={}", t.saturating_mul(60)));
        }
        let notes = if notes.is_empty() {
            None
        } else {
            Some(notes.join(";"))
        };
        Some(ServiceModel {
            kind: ServiceKind::Ssh,
            servers: Vec::new(),
            source_interface: self.source_interface,
            vrf: self.vrf,
            authentication_mode: None,
            notes,
        })
    }
}

#[derive(Debug, Default, Clone)]
pub struct SnmpAccum {
    pub communities: Vec<String>,
    pub location: Option<String>,
    pub contact: Option<String>,
    pub trap_hosts: Vec<String>,
    pub source_interface: Option<String>,
}

impl SnmpAccum {
    pub fn build(mut self) -> Vec<ServiceModel> {
        let mut out: Vec<ServiceModel> = Vec::new();
        self.communities.sort();
        self.communities.dedup();
        self.trap_hosts.sort();
        self.trap_hosts.dedup();
        if !self.communities.is_empty() || self.location.is_some() || self.contact.is_some() {
            let mut notes: Vec<String> = Vec::new();
            if let Some(l) = &self.location {
                notes.push(format!("location={l}"));
            }
            if let Some(c) = &self.contact {
                notes.push(format!("contact={c}"));
            }
            notes.push(format!("communities={}", self.communities.join(",")));
            out.push(ServiceModel {
                kind: ServiceKind::Snmp,
                servers: Vec::new(),
                source_interface: self.source_interface.clone(),
                vrf: None,
                authentication_mode: None,
                notes: Some(notes.join(";")),
            });
        }
        if !self.trap_hosts.is_empty() {
            out.push(ServiceModel {
                kind: ServiceKind::Snmp,
                servers: self.trap_hosts,
                source_interface: self.source_interface,
                vrf: None,
                authentication_mode: None,
                notes: Some("kind=trap_hosts".to_string()),
            });
        }
        out
    }
}

#[derive(Debug, Default, Clone)]
pub struct NtpAccum {
    pub servers: Vec<String>,
    pub source_interface: Option<String>,
}
impl NtpAccum {
    pub fn build(mut self) -> Option<ServiceModel> {
        if self.servers.is_empty() && self.source_interface.is_none() {
            return None;
        }
        self.servers.sort();
        self.servers.dedup();
        Some(ServiceModel {
            kind: ServiceKind::Ntp,
            servers: self.servers,
            source_interface: self.source_interface,
            vrf: None,
            authentication_mode: None,
            notes: None,
        })
    }
}

#[derive(Debug, Default, Clone)]
pub struct DnsAccum {
    pub servers: Vec<String>,
    pub domains: Vec<String>,
}
impl DnsAccum {
    pub fn build(mut self) -> Option<ServiceModel> {
        if self.servers.is_empty() && self.domains.is_empty() {
            return None;
        }
        self.servers.sort();
        self.servers.dedup();
        self.domains.sort();
        self.domains.dedup();
        let notes = if self.domains.is_empty() {
            None
        } else {
            Some(format!("domains={}", self.domains.join(",")))
        };
        Some(ServiceModel {
            kind: ServiceKind::Dns,
            servers: self.servers,
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes,
        })
    }
}

#[derive(Debug, Default, Clone)]
pub struct SyslogAccum {
    pub servers: Vec<String>,
    pub facility: Option<String>,
    pub severity: Option<String>,
    pub source_interface: Option<String>,
}
impl SyslogAccum {
    pub fn build(mut self) -> Option<ServiceModel> {
        if self.servers.is_empty()
            && self.facility.is_none()
            && self.severity.is_none()
            && self.source_interface.is_none()
        {
            return None;
        }
        self.servers.sort();
        self.servers.dedup();
        let mut notes: Vec<String> = Vec::new();
        if let Some(f) = &self.facility {
            notes.push(format!("facility={f}"));
        }
        if let Some(s) = &self.severity {
            notes.push(format!("severity={s}"));
        }
        let notes = if notes.is_empty() {
            None
        } else {
            Some(notes.join(";"))
        };
        Some(ServiceModel {
            kind: ServiceKind::Syslog,
            servers: self.servers,
            source_interface: self.source_interface,
            vrf: None,
            authentication_mode: None,
            notes,
        })
    }
}

/// V1Z-A — Telnet service accumulator (EOS).
///
/// EOS enables Telnet via the top-level `management telnet` block (mirrors
/// `management ssh`). Detection lives in `mod.rs` management-block dispatch.
#[derive(Debug, Default, Clone)]
pub struct TelnetAccum {
    pub enabled: bool,
}

impl TelnetAccum {
    pub fn build(self) -> Option<ServiceModel> {
        if !self.enabled {
            return None;
        }
        Some(ServiceModel {
            kind: ServiceKind::Telnet,
            servers: Vec::new(),
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes: None,
        })
    }
}

/// Sort key for the services `Vec<ServiceModel>` output, mirroring the
/// V1K/V1M convention.
pub fn service_identifier(s: &ServiceModel) -> String {
    let primary = s.servers.first().cloned().unwrap_or_default();
    let notes = s.notes.clone().unwrap_or_default();
    format!("{primary}|{notes}")
}
