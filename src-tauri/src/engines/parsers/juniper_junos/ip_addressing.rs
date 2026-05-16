//! Junos IP-addressing helpers — V1M.
//!
//! Junos addresses are always slash-prefix (`10.0.0.1/24`,
//! `2001:db8::1/64`). No dotted-mask form exists, so the helper just
//! splits on `/` and validates the prefix length.

use crate::engines::network_model::{IpAddressModel, IpFamily};

pub fn parse(addr_with_prefix: &str, family: IpFamily, vrf: Option<&str>) -> Option<IpAddressModel> {
    let (addr, prefix_str) = addr_with_prefix.rsplit_once('/')?;
    let prefix: u8 = prefix_str.parse().ok()?;
    // Don't validate the address itself beyond non-empty — Junos may
    // accept names; we record what we saw.
    if addr.is_empty() {
        return None;
    }
    Some(IpAddressModel {
        family,
        address: addr.to_string(),
        prefix_length: prefix,
        secondary: false,
        vrf: vrf.map(|s| s.to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ipv4_slash_form_parses() {
        let ip = parse("10.0.0.1/24", IpFamily::V4, None).unwrap();
        assert_eq!(ip.address, "10.0.0.1");
        assert_eq!(ip.prefix_length, 24);
        assert_eq!(ip.family, IpFamily::V4);
    }

    #[test]
    fn ipv6_slash_form_parses() {
        let ip = parse("2001:db8::1/64", IpFamily::V6, Some("vrf-a")).unwrap();
        assert_eq!(ip.address, "2001:db8::1");
        assert_eq!(ip.prefix_length, 64);
        assert_eq!(ip.vrf.as_deref(), Some("vrf-a"));
    }

    #[test]
    fn missing_prefix_returns_none() {
        assert!(parse("10.0.0.1", IpFamily::V4, None).is_none());
    }

    #[test]
    fn bad_prefix_returns_none() {
        assert!(parse("10.0.0.1/abc", IpFamily::V4, None).is_none());
    }
}
