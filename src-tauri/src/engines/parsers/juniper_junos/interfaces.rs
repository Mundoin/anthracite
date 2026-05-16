//! Junos interface classification + helpers — V1M.

use crate::engines::network_model::InterfaceKind;

/// Classify a Junos interface short name into a canonical kind.
///
/// Junos names are already short-form (`ge-0/0/0`, `ae0`, `lo0`,
/// `me0`, `irb.100`, `vlan.100`). We do not rewrite them; we only
/// classify.
pub fn classify(name: &str) -> InterfaceKind {
    let lower = name.to_ascii_lowercase();
    if lower.starts_with("ae") && lower[2..].chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
        return InterfaceKind::Lag;
    }
    if lower.starts_with("lo") {
        return InterfaceKind::Loopback;
    }
    if lower.starts_with("me") {
        return InterfaceKind::Management;
    }
    if lower.starts_with("fxp") {
        return InterfaceKind::Management;
    }
    if lower.starts_with("vlan.") || lower.starts_with("irb.") {
        return InterfaceKind::Vlan;
    }
    if lower.starts_with("ge-")
        || lower.starts_with("xe-")
        || lower.starts_with("et-")
        || lower.starts_with("fe-")
    {
        if name.contains('.') {
            return InterfaceKind::SubInterface;
        }
        return InterfaceKind::Physical;
    }
    if lower.starts_with("st") || lower.starts_with("gr-") || lower.starts_with("ip-") {
        return InterfaceKind::Tunnel;
    }
    InterfaceKind::Unknown
}

/// Parent name for a unit-style sub-interface (`ge-0/0/0.10` → `ge-0/0/0`).
/// `irb.100` and `vlan.100` are not sub-interfaces in the Cisco sense; we
/// return `None` so they classify as `Vlan` and stand alone.
pub fn parent_of(name: &str) -> Option<String> {
    if name.starts_with("irb.") || name.starts_with("vlan.") {
        return None;
    }
    name.rsplit_once('.').map(|(p, _)| p.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_physical() {
        assert_eq!(classify("ge-0/0/0"), InterfaceKind::Physical);
        assert_eq!(classify("xe-1/0/2"), InterfaceKind::Physical);
        assert_eq!(classify("et-0/0/0"), InterfaceKind::Physical);
    }

    #[test]
    fn classify_lag() {
        assert_eq!(classify("ae0"), InterfaceKind::Lag);
        assert_eq!(classify("ae12"), InterfaceKind::Lag);
    }

    #[test]
    fn classify_loopback() {
        assert_eq!(classify("lo0"), InterfaceKind::Loopback);
    }

    #[test]
    fn classify_management() {
        assert_eq!(classify("me0"), InterfaceKind::Management);
        assert_eq!(classify("fxp0"), InterfaceKind::Management);
    }

    #[test]
    fn classify_irb_and_vlan_dotted() {
        assert_eq!(classify("irb.100"), InterfaceKind::Vlan);
        assert_eq!(classify("vlan.100"), InterfaceKind::Vlan);
    }

    #[test]
    fn classify_sub_interface() {
        assert_eq!(classify("ge-0/0/0.10"), InterfaceKind::SubInterface);
    }

    #[test]
    fn parent_of_unit() {
        assert_eq!(parent_of("ge-0/0/0.10").as_deref(), Some("ge-0/0/0"));
    }

    #[test]
    fn parent_of_irb_is_none() {
        assert!(parent_of("irb.100").is_none());
    }
}
