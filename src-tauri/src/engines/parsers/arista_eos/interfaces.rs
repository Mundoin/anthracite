//! EOS interface classification + helpers — V1N.
//!
//! EOS uses `Ethernet1`, `Ethernet1/1`, `Port-Channel10`, `Management1`,
//! `Vlan100`, `Loopback0`. Sub-interface syntax via `.N` exists but is
//! uncommon in L1/L2 EOS configs.

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
    if lower.starts_with("management") {
        return InterfaceKind::Management;
    }
    if lower.starts_with("ethernet") {
        return InterfaceKind::Physical;
    }
    if lower.starts_with("tunnel") {
        return InterfaceKind::Tunnel;
    }
    if lower.starts_with("vxlan") {
        return InterfaceKind::Virtual;
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
    // EOS `speed forced 10000full` shape — take leading digits if present.
    let head: String = tok.chars().take_while(|c| c.is_ascii_digit()).collect();
    if !head.is_empty() {
        return head.parse().ok();
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

/// EOS uses the same comma-list shape as IOS for `switchport trunk
/// allowed vlan`. Ranges (`10-20`) and EOS-specific `add`/`remove`
/// modifiers are out of V1N scope; return `None` to surface the line.
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
    fn classify_eos_forms() {
        assert_eq!(classify("Ethernet1"), InterfaceKind::Physical);
        assert_eq!(classify("Ethernet1/1"), InterfaceKind::Physical);
        assert_eq!(classify("Port-Channel10"), InterfaceKind::Lag);
        assert_eq!(classify("Management1"), InterfaceKind::Management);
        assert_eq!(classify("Vlan100"), InterfaceKind::Vlan);
        assert_eq!(classify("Loopback0"), InterfaceKind::Loopback);
        assert_eq!(classify("Vxlan1"), InterfaceKind::Virtual);
        assert_eq!(classify("Bizarre1"), InterfaceKind::Unknown);
    }

    #[test]
    fn speed_handles_forced_form() {
        assert_eq!(parse_speed("forced 10000full"), None);
        assert_eq!(parse_speed("10000"), Some(10000));
        assert_eq!(parse_speed("1000full"), Some(1000));
    }
}
