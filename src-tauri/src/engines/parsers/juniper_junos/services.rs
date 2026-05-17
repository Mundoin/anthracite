//! Junos services helpers — V1M.

use crate::engines::network_model::ServiceModel;

#[derive(Debug, Default, Clone)]
pub struct SshAccum {
    pub enabled: bool,
    pub root_login: Option<String>,
    pub protocol_version: Option<String>,
}

impl SshAccum {
    pub fn build(self) -> Option<ServiceModel> {
        if !self.enabled
            && self.root_login.is_none()
            && self.protocol_version.is_none()
        {
            return None;
        }
        let mut notes: Vec<String> = Vec::new();
        if let Some(rl) = &self.root_login {
            notes.push(format!("root_login={rl}"));
        }
        if let Some(v) = &self.protocol_version {
            notes.push(format!("version={v}"));
        }
        let notes = if notes.is_empty() {
            None
        } else {
            Some(notes.join(";"))
        };
        Some(ServiceModel {
            kind: crate::engines::network_model::ServiceKind::Ssh,
            servers: Vec::new(),
            source_interface: None,
            vrf: None,
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
    pub trap_targets: Vec<String>, // (group, address) flattened to "group:address"
}

impl SnmpAccum {
    pub fn build(mut self) -> Vec<ServiceModel> {
        use crate::engines::network_model::ServiceKind;
        let mut out: Vec<ServiceModel> = Vec::new();
        self.communities.sort();
        self.communities.dedup();
        self.trap_targets.sort();
        self.trap_targets.dedup();
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
                source_interface: None,
                vrf: None,
                authentication_mode: None,
                notes: Some(notes.join(";")),
            });
        }
        if !self.trap_targets.is_empty() {
            out.push(ServiceModel {
                kind: ServiceKind::Snmp,
                servers: self.trap_targets,
                source_interface: None,
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
    /// V1Z-A — Junos NTP source-address parity. Mirrors NX-OS/EOS
    /// (cross-vendor NTP service emission parity for DIAG-HYG-004).
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
            kind: crate::engines::network_model::ServiceKind::Ntp,
            servers: self.servers,
            source_interface: self.source_interface,
            vrf: None,
            authentication_mode: None,
            notes: None,
        })
    }
}

/// V1Z-A — Telnet service accumulator (Junos).
///
/// Junos enables Telnet via `set system services telnet` or the brace-form
/// equivalent `system { services { telnet; } }`. Both converge through the
/// path-based dispatch in `mod.rs`.
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
            kind: crate::engines::network_model::ServiceKind::Telnet,
            servers: Vec::new(),
            source_interface: None,
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
            kind: crate::engines::network_model::ServiceKind::Dns,
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
}
impl SyslogAccum {
    pub fn build(mut self) -> Option<ServiceModel> {
        if self.servers.is_empty() && self.facility.is_none() && self.severity.is_none() {
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
            kind: crate::engines::network_model::ServiceKind::Syslog,
            servers: self.servers,
            source_interface: None,
            vrf: None,
            authentication_mode: None,
            notes,
        })
    }
}
