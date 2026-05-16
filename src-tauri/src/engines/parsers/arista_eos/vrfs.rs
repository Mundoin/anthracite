//! EOS VRF helpers — V1N.
//!
//! EOS uses `vrf instance NAME` (not Cisco's `vrf definition NAME`).
//! V1N captures the name and accepts optional `rd` / `route-target`
//! sub-statements; route-target sub-statements live at top level on
//! EOS, not under an `address-family ipv4`-style nested block.

use crate::engines::network_model::VrfModel;

#[derive(Debug, Default, Clone)]
pub struct VrfBuilder {
    pub name: String,
    pub route_distinguisher: Option<String>,
    pub route_targets_import: Vec<String>,
    pub route_targets_export: Vec<String>,
    pub interfaces: Vec<String>,
    pub address_families: Vec<String>,
}

impl VrfBuilder {
    pub fn new(name: String) -> Self {
        Self {
            name,
            ..Self::default()
        }
    }

    pub fn build(mut self) -> VrfModel {
        self.interfaces.sort();
        self.interfaces.dedup();
        self.route_targets_import.sort();
        self.route_targets_import.dedup();
        self.route_targets_export.sort();
        self.route_targets_export.dedup();
        self.address_families.sort();
        self.address_families.dedup();
        VrfModel {
            name: self.name,
            route_distinguisher: self.route_distinguisher,
            route_targets_import: self.route_targets_import,
            route_targets_export: self.route_targets_export,
            interfaces: self.interfaces,
            address_families: self.address_families,
        }
    }
}

/// `vrf instance NAME` opener — extract NAME.
pub fn parse_vrf_instance_opener(args: &str) -> Option<String> {
    let mut toks = args.split_whitespace();
    let head = toks.next()?.to_ascii_lowercase();
    if head != "instance" {
        return None;
    }
    let name: Vec<&str> = toks.collect();
    if name.is_empty() {
        None
    } else {
        Some(name.join(" "))
    }
}

pub fn parse_rd(args: &str) -> Option<String> {
    let t = args.trim();
    if t.is_empty() {
        None
    } else {
        Some(t.to_string())
    }
}

pub fn parse_route_target(args: &str) -> Option<(&'static str, String)> {
    let mut toks = args.split_whitespace();
    let dir = toks.next()?.to_ascii_lowercase();
    let val = toks.collect::<Vec<_>>().join(" ");
    if val.is_empty() {
        return None;
    }
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
    fn opens_vrf_instance() {
        assert_eq!(
            parse_vrf_instance_opener("instance MGMT").as_deref(),
            Some("MGMT")
        );
    }

    #[test]
    fn ignores_non_instance_keyword() {
        assert!(parse_vrf_instance_opener("definition MGMT").is_none());
    }
}
