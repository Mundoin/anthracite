//! Interface name normalization — shared across parsers.
//!
//! Implements the canonical short-form table from
//! `docs/architecture/INTERFACE_NAMING.md` (V1K §3.1). Cisco mappings
//! only in V1K; Junos / EOS / NX-OS parsers extend per-vendor without
//! editing the shared short-form vocabulary.

/// Cisco IOS / IOS XE long-form → canonical short-form table.
///
/// First match wins. Order matters because some long-forms are prefixes
/// of others (`Ten...` before `Te...` would be wrong direction; we sort
/// longest-prefix first to avoid `Gi` swallowing `GigabitEthernet`).
const CISCO_PREFIXES: &[(&str, &str)] = &[
    ("TenGigabitEthernet", "Te"),
    ("HundredGigE", "Hu"),
    ("FortyGigE", "Fo"),
    ("GigabitEthernet", "Gi"),
    ("FastEthernet", "Fa"),
    ("Ethernet", "Et"),
    ("Loopback", "Lo"),
    ("Management", "Mgmt"),
    ("Port-channel", "Po"),
    ("Tunnel", "Tu"),
    ("Serial", "Se"),
    ("Vlan", "Vl"),
];

/// Return the normalized short-form name for a Cisco IOS / IOS XE
/// interface name. Returns `Some(short_form)` for recognized long-forms
/// (slot/port suffix and sub-interface notation `.N` preserved verbatim);
/// returns `None` for unrecognized long-forms (caller should store the
/// vendor-native string in both `name` and `normalized_name` and emit an
/// `UnknownConfigLine` per the V1K rule).
pub fn normalize_cisco(name: &str) -> Option<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return None;
    }
    for (long, short) in CISCO_PREFIXES {
        if let Some(rest) = trimmed.strip_prefix(long) {
            return Some(format!("{short}{rest}"));
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gigabit_normalizes_to_gi() {
        assert_eq!(
            normalize_cisco("GigabitEthernet0/0/0").as_deref(),
            Some("Gi0/0/0")
        );
    }

    #[test]
    fn ten_gigabit_normalizes_to_te_not_gi() {
        assert_eq!(
            normalize_cisco("TenGigabitEthernet1/0/1").as_deref(),
            Some("Te1/0/1")
        );
    }

    #[test]
    fn hundred_gig_normalizes_to_hu() {
        assert_eq!(
            normalize_cisco("HundredGigE1/0/1").as_deref(),
            Some("Hu1/0/1")
        );
    }

    #[test]
    fn forty_gig_normalizes_to_fo() {
        assert_eq!(
            normalize_cisco("FortyGigE1/0/1").as_deref(),
            Some("Fo1/0/1")
        );
    }

    #[test]
    fn fast_ethernet_normalizes_to_fa() {
        assert_eq!(normalize_cisco("FastEthernet0/1").as_deref(), Some("Fa0/1"));
    }

    #[test]
    fn ethernet_normalizes_to_et() {
        assert_eq!(normalize_cisco("Ethernet0/0").as_deref(), Some("Et0/0"));
    }

    #[test]
    fn loopback_normalizes_to_lo() {
        assert_eq!(normalize_cisco("Loopback0").as_deref(), Some("Lo0"));
    }

    #[test]
    fn vlan_normalizes_to_vl() {
        assert_eq!(normalize_cisco("Vlan10").as_deref(), Some("Vl10"));
    }

    #[test]
    fn port_channel_normalizes_to_po() {
        assert_eq!(normalize_cisco("Port-channel1").as_deref(), Some("Po1"));
    }

    #[test]
    fn tunnel_normalizes_to_tu() {
        assert_eq!(normalize_cisco("Tunnel0").as_deref(), Some("Tu0"));
    }

    #[test]
    fn serial_normalizes_to_se() {
        assert_eq!(normalize_cisco("Serial0/0/0").as_deref(), Some("Se0/0/0"));
    }

    #[test]
    fn management_normalizes_to_mgmt() {
        assert_eq!(normalize_cisco("Management0").as_deref(), Some("Mgmt0"));
    }

    #[test]
    fn sub_interface_notation_preserved() {
        assert_eq!(
            normalize_cisco("GigabitEthernet0/0/0.10").as_deref(),
            Some("Gi0/0/0.10")
        );
    }

    #[test]
    fn unknown_long_form_returns_none() {
        assert_eq!(normalize_cisco("Bizarre0/0"), None);
    }

    #[test]
    fn empty_input_returns_none() {
        assert_eq!(normalize_cisco(""), None);
        assert_eq!(normalize_cisco("   "), None);
    }
}
