//! IPv4 / IPv6 address parsing helpers.
//!
//! V1K scope: IPv4 primary + secondary, IPv6 global unicast + link-local.

use crate::engines::network_model::{IpAddressModel, IpFamily};

/// Parse an IPv4 dotted-quad mask into prefix length (0..=32). Returns
/// `None` for non-contiguous or malformed masks.
pub fn mask_to_prefix_v4(mask: &str) -> Option<u8> {
    let octets: Vec<u8> = mask
        .split('.')
        .map(|o| o.parse::<u8>().ok())
        .collect::<Option<Vec<_>>>()?;
    if octets.len() != 4 {
        return None;
    }
    let bits: u32 = ((octets[0] as u32) << 24)
        | ((octets[1] as u32) << 16)
        | ((octets[2] as u32) << 8)
        | (octets[3] as u32);
    if bits == 0 {
        return Some(0);
    }
    let ones = bits.leading_ones();
    // A contiguous mask has all 1s followed by all 0s.
    let trailing_zeros = (!bits).leading_zeros();
    if ones + (32 - ones) == 32 && ones + bits.trailing_zeros() == 32 {
        Some(ones as u8)
    } else {
        // Reject non-contiguous masks.
        let _ = trailing_zeros;
        None
    }
}

/// Parse `ip address ADDR MASK [secondary]` arguments. Returns the
/// `(IpAddressModel, is_secondary)` pair, or `None` if malformed.
pub fn parse_ipv4_address_line(args: &str, vrf: Option<&str>) -> Option<IpAddressModel> {
    let toks: Vec<&str> = args.split_whitespace().collect();
    if toks.len() < 2 {
        return None;
    }
    let addr = toks[0];
    let mask = toks[1];
    let secondary = toks.iter().any(|t| t.eq_ignore_ascii_case("secondary"));
    let prefix = mask_to_prefix_v4(mask)?;
    Some(IpAddressModel {
        family: IpFamily::V4,
        address: addr.to_string(),
        prefix_length: prefix,
        secondary,
        vrf: vrf.map(|s| s.to_string()),
    })
}

/// Parse `ipv6 address ADDR/PREFIX [link-local]` arguments.
pub fn parse_ipv6_address_line(args: &str, vrf: Option<&str>) -> Option<IpAddressModel> {
    let toks: Vec<&str> = args.split_whitespace().collect();
    if toks.is_empty() {
        return None;
    }
    let raw = toks[0];
    let link_local = toks.iter().any(|t| t.eq_ignore_ascii_case("link-local"));
    let (addr, prefix) = if let Some((a, p)) = raw.split_once('/') {
        let prefix: u8 = p.parse().ok()?;
        (a.to_string(), prefix)
    } else if link_local {
        (raw.to_string(), 64)
    } else {
        return None;
    };
    Some(IpAddressModel {
        family: IpFamily::V6,
        address: addr,
        prefix_length: prefix,
        secondary: false,
        vrf: vrf.map(|s| s.to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mask_24() {
        assert_eq!(mask_to_prefix_v4("255.255.255.0"), Some(24));
    }

    #[test]
    fn mask_30() {
        assert_eq!(mask_to_prefix_v4("255.255.255.252"), Some(30));
    }

    #[test]
    fn mask_0() {
        assert_eq!(mask_to_prefix_v4("0.0.0.0"), Some(0));
    }

    #[test]
    fn mask_32() {
        assert_eq!(mask_to_prefix_v4("255.255.255.255"), Some(32));
    }

    #[test]
    fn primary_ipv4() {
        let ip = parse_ipv4_address_line("10.0.0.1 255.255.255.0", None).unwrap();
        assert_eq!(ip.family, IpFamily::V4);
        assert_eq!(ip.address, "10.0.0.1");
        assert_eq!(ip.prefix_length, 24);
        assert!(!ip.secondary);
        assert_eq!(ip.vrf, None);
    }

    #[test]
    fn secondary_ipv4() {
        let ip = parse_ipv4_address_line("10.0.0.2 255.255.255.0 secondary", None).unwrap();
        assert!(ip.secondary);
    }

    #[test]
    fn ipv4_with_vrf() {
        let ip = parse_ipv4_address_line("10.0.0.1 255.255.255.0", Some("CUST-A")).unwrap();
        assert_eq!(ip.vrf.as_deref(), Some("CUST-A"));
    }

    #[test]
    fn ipv6_global() {
        let ip = parse_ipv6_address_line("2001:db8::1/64", None).unwrap();
        assert_eq!(ip.family, IpFamily::V6);
        assert_eq!(ip.address, "2001:db8::1");
        assert_eq!(ip.prefix_length, 64);
    }

    #[test]
    fn ipv6_link_local() {
        let ip = parse_ipv6_address_line("fe80::1 link-local", None).unwrap();
        assert_eq!(ip.address, "fe80::1");
        assert_eq!(ip.prefix_length, 64);
    }

    #[test]
    fn ipv6_malformed_returns_none() {
        assert!(parse_ipv6_address_line("", None).is_none());
        assert!(parse_ipv6_address_line("garbage", None).is_none());
    }
}
