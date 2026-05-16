//! Interface-area parsing helpers.

use crate::engines::network_model::{
    DuplexMode, InterfaceAdminState, InterfaceKind, L2Mode,
};

/// Classify an interface name into a canonical `InterfaceKind`.
pub fn classify(name: &str) -> InterfaceKind {
    let n = name.trim();
    let lower = n.to_ascii_lowercase();
    if n.contains('.') {
        return InterfaceKind::SubInterface;
    }
    if lower.starts_with("loopback") {
        InterfaceKind::Loopback
    } else if lower.starts_with("vlan") {
        InterfaceKind::Vlan
    } else if lower.starts_with("port-channel") {
        InterfaceKind::Lag
    } else if lower.starts_with("tunnel") {
        InterfaceKind::Tunnel
    } else if lower.starts_with("management") || lower.starts_with("mgmt") {
        InterfaceKind::Management
    } else if lower.starts_with("gigabitethernet")
        || lower.starts_with("tengigabitethernet")
        || lower.starts_with("hundredgige")
        || lower.starts_with("fortygige")
        || lower.starts_with("fastethernet")
        || lower.starts_with("ethernet")
        || lower.starts_with("serial")
    {
        InterfaceKind::Physical
    } else {
        InterfaceKind::Unknown
    }
}

/// Return the parent interface name for a sub-interface, e.g.
/// `Gi0/0/0.10` → `Gi0/0/0`. Returns `None` if not a sub-interface.
pub fn parent_of(name: &str) -> Option<String> {
    name.rsplit_once('.').map(|(parent, _)| parent.to_string())
}

/// Parse `mtu N` argument.
pub fn parse_mtu(args: &str) -> Option<u32> {
    args.split_whitespace().next()?.parse().ok()
}

/// Parse `speed N` argument. `auto` returns None.
pub fn parse_speed(args: &str) -> Option<u32> {
    let tok = args.split_whitespace().next()?;
    if tok.eq_ignore_ascii_case("auto") {
        return None;
    }
    tok.parse().ok()
}

/// Parse `duplex full|half|auto`.
pub fn parse_duplex(args: &str) -> Option<DuplexMode> {
    let tok = args.split_whitespace().next()?;
    match tok.to_ascii_lowercase().as_str() {
        "full" => Some(DuplexMode::Full),
        "half" => Some(DuplexMode::Half),
        "auto" => Some(DuplexMode::Auto),
        _ => None,
    }
}

/// `switchport mode access|trunk` → `L2Mode`.
pub fn parse_switchport_mode(args: &str) -> Option<L2Mode> {
    let tok = args.split_whitespace().next()?;
    match tok.to_ascii_lowercase().as_str() {
        "access" => Some(L2Mode::Access),
        "trunk" => Some(L2Mode::Trunk),
        _ => None,
    }
}

/// Parse a simple comma-separated VLAN list. Range syntax (`10-20`) and
/// `add` / `remove` modifiers are explicitly out of V1K scope per
/// PROPOSAL §2.1; lines containing them yield an empty Vec and the
/// caller should emit an `UnknownConfigLine`.
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

/// `shutdown` → Down; `no shutdown` → Up; otherwise Unknown.
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
    fn classify_physical() {
        assert_eq!(classify("GigabitEthernet0/0/0"), InterfaceKind::Physical);
        assert_eq!(classify("Ethernet0/0"), InterfaceKind::Physical);
    }

    #[test]
    fn classify_loopback() {
        assert_eq!(classify("Loopback0"), InterfaceKind::Loopback);
    }

    #[test]
    fn classify_vlan_interface() {
        assert_eq!(classify("Vlan10"), InterfaceKind::Vlan);
    }

    #[test]
    fn classify_port_channel() {
        assert_eq!(classify("Port-channel1"), InterfaceKind::Lag);
    }

    #[test]
    fn classify_sub_interface() {
        assert_eq!(
            classify("GigabitEthernet0/0/0.10"),
            InterfaceKind::SubInterface
        );
    }

    #[test]
    fn classify_management() {
        assert_eq!(classify("Management0"), InterfaceKind::Management);
    }

    #[test]
    fn classify_unknown_returns_unknown() {
        assert_eq!(classify("Bizarre1/0"), InterfaceKind::Unknown);
    }

    #[test]
    fn parent_of_sub_interface() {
        assert_eq!(
            parent_of("GigabitEthernet0/0/0.10").as_deref(),
            Some("GigabitEthernet0/0/0")
        );
    }

    #[test]
    fn parent_of_main_interface_is_none() {
        assert_eq!(parent_of("GigabitEthernet0/0/0"), None);
    }

    #[test]
    fn parse_mtu_ok() {
        assert_eq!(parse_mtu("9000"), Some(9000));
    }

    #[test]
    fn parse_speed_auto_returns_none() {
        assert_eq!(parse_speed("auto"), None);
    }

    #[test]
    fn parse_speed_number() {
        assert_eq!(parse_speed("1000"), Some(1000));
    }

    #[test]
    fn parse_duplex_full() {
        assert_eq!(parse_duplex("full"), Some(DuplexMode::Full));
    }

    #[test]
    fn parse_switchport_modes() {
        assert_eq!(parse_switchport_mode("access"), Some(L2Mode::Access));
        assert_eq!(parse_switchport_mode("trunk"), Some(L2Mode::Trunk));
    }

    #[test]
    fn parse_vlan_list_simple_csv() {
        assert_eq!(parse_vlan_list("10,20,30"), Some(vec![10, 20, 30]));
    }

    #[test]
    fn parse_vlan_list_rejects_range_syntax() {
        assert!(parse_vlan_list("10-20").is_none());
    }

    #[test]
    fn parse_vlan_list_rejects_add_modifier() {
        assert!(parse_vlan_list("add 40,50").is_none());
    }

    #[test]
    fn shutdown_and_no_shutdown() {
        assert_eq!(
            admin_state_from_line("shutdown"),
            Some(InterfaceAdminState::Down)
        );
        assert_eq!(
            admin_state_from_line("no shutdown"),
            Some(InterfaceAdminState::Up)
        );
        assert_eq!(admin_state_from_line("description x"), None);
    }
}
