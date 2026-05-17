//! NX-OS interface classification + helpers — V1U.
//!
//! NX-OS interface naming conventions differ from EOS and IOS-XE:
//!   `Ethernet1/1`, `Ethernet1/2/1`  → Physical
//!   `port-channel1`                  → Lag      (lowercase on NX-OS)
//!   `loopback0`                      → Loopback (lowercase on NX-OS)
//!   `Vlan100`                        → Vlan     (capital V)
//!   `mgmt0`                          → Management (lowercase on NX-OS)
//!   `tunnel0`                        → Tunnel
//!   Sub-interfaces via `.N`

use crate::engines::network_model::{
    DuplexMode, InterfaceAdminState, InterfaceKind, L2Mode,
};

pub fn classify(name: &str) -> InterfaceKind {
    let lower = name.to_ascii_lowercase();
    if name.contains('.') {
        return InterfaceKind::SubInterface;
    }
    if lower.starts_with("port-channel") {
        return InterfaceKind::Lag;
    }
    if lower.starts_with("loopback") {
        return InterfaceKind::Loopback;
    }
    if lower.starts_with("vlan") {
        return InterfaceKind::Vlan;
    }
    if lower.starts_with("mgmt") {
        return InterfaceKind::Management;
    }
    if lower.starts_with("ethernet") {
        return InterfaceKind::Physical;
    }
    if lower.starts_with("tunnel") {
        return InterfaceKind::Tunnel;
    }
    InterfaceKind::Unknown
}

pub fn parent_of(name: &str) -> Option<String> {
    name.rsplit_once('.').map(|(p, _)| p.to_string())
}

pub fn parse_mtu(args: &str) -> Option<u32> {
    args.split_whitespace().next()?.parse().ok()
}

pub fn parse_speed(args: &str) -> Option<u32> {
    let tok = args.split_whitespace().next()?;
    if tok.eq_ignore_ascii_case("auto") {
        return None;
    }
    tok.parse().ok()
}

pub fn parse_duplex(args: &str) -> Option<DuplexMode> {
    let tok = args.split_whitespace().next()?;
    match tok.to_ascii_lowercase().as_str() {
        "full" => Some(DuplexMode::Full),
        "half" => Some(DuplexMode::Half),
        "auto" => Some(DuplexMode::Auto),
        _ => None,
    }
}

pub fn parse_switchport_mode(args: &str) -> Option<L2Mode> {
    let tok = args.split_whitespace().next()?;
    match tok.to_ascii_lowercase().as_str() {
        "access" => Some(L2Mode::Access),
        "trunk" => Some(L2Mode::Trunk),
        _ => None,
    }
}

/// NX-OS `switchport trunk allowed vlan` uses same comma-list shape as
/// IOS/EOS. Ranges and modifiers (`add`, `remove`, `none`, `all`) are
/// out of V1U scope; return `None` to surface the line.
pub fn parse_vlan_list(args: &str) -> Option<Vec<u16>> {
    let t = args.trim();
    if t.contains('-')
        || t.split_whitespace()
            .next()
            .map(|w| matches!(w.to_ascii_lowercase().as_str(), "add" | "remove" | "except" | "all" | "none"))
            .unwrap_or(false)
    {
        return None;
    }
    let mut out: Vec<u16> = Vec::new();
    for part in t.split(',') {
        let p = part.trim();
        if p.is_empty() {
            continue;
        }
        match p.parse::<u16>() {
            Ok(v) => out.push(v),
            Err(_) => return None,
        }
    }
    Some(out)
}

pub fn admin_state_from_line(trimmed: &str) -> Option<InterfaceAdminState> {
    let l = trimmed.to_ascii_lowercase();
    if l == "shutdown" {
        Some(InterfaceAdminState::Down)
    } else if l == "no shutdown" {
        Some(InterfaceAdminState::Up)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_nxos_forms() {
        assert_eq!(classify("Ethernet1/1"), InterfaceKind::Physical);
        assert_eq!(classify("Ethernet1/2/1"), InterfaceKind::Physical);
        assert_eq!(classify("port-channel1"), InterfaceKind::Lag);
        assert_eq!(classify("loopback0"), InterfaceKind::Loopback);
        assert_eq!(classify("Vlan100"), InterfaceKind::Vlan);
        assert_eq!(classify("mgmt0"), InterfaceKind::Management);
        assert_eq!(classify("tunnel0"), InterfaceKind::Tunnel);
        assert_eq!(classify("Bizarre1"), InterfaceKind::Unknown);
    }

    #[test]
    fn sub_interface_dot_form() {
        assert_eq!(classify("Ethernet1/1.100"), InterfaceKind::SubInterface);
    }

    #[test]
    fn parent_of_sub_interface() {
        assert_eq!(parent_of("Ethernet1/1.100").as_deref(), Some("Ethernet1/1"));
    }
}
