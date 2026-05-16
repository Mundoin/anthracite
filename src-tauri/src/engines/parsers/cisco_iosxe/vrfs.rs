//! VRF-area helpers.

use crate::engines::network_model::VrfModel;

#[derive(Debug, Clone, Default)]
pub struct VrfBuilder {
    pub name: String,
    pub route_distinguisher: Option<String>,
    pub route_targets_import: Vec<String>,
    pub route_targets_export: Vec<String>,
    pub interfaces: Vec<String>,
    pub address_families: Vec<String>,
}

impl VrfBuilder {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            ..Default::default()
        }
    }

    pub fn build(self) -> VrfModel {
        let mut ifs = self.interfaces;
        ifs.sort();
        ifs.dedup();
        let mut afs = self.address_families;
        afs.sort();
        afs.dedup();
        let mut rti = self.route_targets_import;
        rti.sort();
        rti.dedup();
        let mut rte = self.route_targets_export;
        rte.sort();
        rte.dedup();
        VrfModel {
            name: self.name,
            route_distinguisher: self.route_distinguisher,
            route_targets_import: rti,
            route_targets_export: rte,
            interfaces: ifs,
            address_families: afs,
        }
    }
}

/// Parse `vrf definition NAME` opener.
pub fn parse_vrf_opener(args: &str) -> Option<String> {
    let n = args.trim();
    if n.is_empty() {
        None
    } else {
        Some(n.to_string())
    }
}

/// Parse `rd RD` line.
pub fn parse_rd(args: &str) -> Option<String> {
    let n = args.trim();
    if n.is_empty() {
        None
    } else {
        Some(n.to_string())
    }
}

/// Parse `address-family ipv4|ipv6 [unicast]` opener. Returns the
/// canonical family token (`ipv4-unicast` / `ipv6-unicast`) for V1K
/// scope; anything else returns None.
pub fn parse_address_family(args: &str) -> Option<String> {
    let lower = args.trim().to_ascii_lowercase();
    if lower.starts_with("ipv4") {
        Some("ipv4-unicast".to_string())
    } else if lower.starts_with("ipv6") {
        Some("ipv6-unicast".to_string())
    } else {
        None
    }
}

/// Parse `route-target import RT` / `route-target export RT`. Returns
/// `(direction, value)` where direction is `"import"` or `"export"`.
pub fn parse_route_target(args: &str) -> Option<(&'static str, String)> {
    let mut toks = args.split_whitespace();
    let dir = toks.next()?.to_ascii_lowercase();
    let val = toks.next()?.to_string();
    match dir.as_str() {
        "import" => Some(("import", val)),
        "export" => Some(("export", val)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opener_parses_name() {
        assert_eq!(parse_vrf_opener("CUST-A").as_deref(), Some("CUST-A"));
    }

    #[test]
    fn opener_absent_when_blank() {
        assert_eq!(parse_vrf_opener("   "), None);
    }

    #[test]
    fn rd_parsed_literally() {
        assert_eq!(parse_rd("65000:100").as_deref(), Some("65000:100"));
    }

    #[test]
    fn address_family_ipv4_canonicalised() {
        assert_eq!(
            parse_address_family("ipv4 unicast").as_deref(),
            Some("ipv4-unicast")
        );
        assert_eq!(
            parse_address_family("ipv6 unicast").as_deref(),
            Some("ipv6-unicast")
        );
    }

    #[test]
    fn address_family_out_of_scope_returns_none() {
        assert_eq!(parse_address_family("vpnv4"), None);
    }

    #[test]
    fn route_target_import_export() {
        assert_eq!(
            parse_route_target("import 65000:100"),
            Some(("import", "65000:100".to_string()))
        );
        assert_eq!(
            parse_route_target("export 65000:100"),
            Some(("export", "65000:100".to_string()))
        );
    }

    #[test]
    fn builder_dedupes_and_sorts() {
        let mut b = VrfBuilder::new("CUST-A");
        b.route_targets_import.push("65000:200".to_string());
        b.route_targets_import.push("65000:100".to_string());
        b.route_targets_import.push("65000:100".to_string());
        b.interfaces.push("Gi0/2".to_string());
        b.interfaces.push("Gi0/1".to_string());
        let v = b.build();
        assert_eq!(
            v.route_targets_import,
            vec!["65000:100".to_string(), "65000:200".to_string()]
        );
        assert_eq!(v.interfaces, vec!["Gi0/1".to_string(), "Gi0/2".to_string()]);
    }
}
