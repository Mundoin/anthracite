//! NX-OS IP addressing — V1U.
//!
//! NX-OS uses CIDR notation (`ip address 10.0.0.1/24`). Legacy dotted-mask
//! form is also accepted. Output is always the canonical numeric prefix length.

use crate::engines::network_model::{IpAddressModel, IpFamily};

pub fn parse_ipv4_address_line(rest: &str, vrf: Option<&str>) -> Option<IpAddressModel> {
    let mut toks = rest.split_whitespace();
    let first = toks.next()?;
    let secondary;
    let (addr, prefix_length) = if let Some((a, p)) = first.split_once('/') {
        let pl: u8 = p.parse().ok()?;
        secondary = toks.next().map(|s| s.eq_ignore_ascii_case("secondary")).unwrap_or(false);
        (a.to_string(), pl)
    } else {
        let mask = toks.next()?;
        let pl = mask_to_prefix_len(mask)?;
        secondary = toks.next().map(|s| s.eq_ignore_ascii_case("secondary")).unwrap_or(false);
        (first.to_string(), pl)
    };
    Some(IpAddressModel {
        family: IpFamily::V4,
        address: addr,
        prefix_length,
        secondary,
        vrf: vrf.map(|s| s.to_string()),
    })
}

pub fn parse_ipv6_address_line(rest: &str, vrf: Option<&str>) -> Option<IpAddressModel> {
    let first = rest.split_whitespace().next()?;
    let (addr, prefix) = first.rsplit_once('/')?;
    let pl: u8 = prefix.parse().ok()?;
    Some(IpAddressModel {
        family: IpFamily::V6,
        address: addr.to_string(),
        prefix_length: pl,
        secondary: false,
        vrf: vrf.map(|s| s.to_string()),
    })
}

pub fn mask_to_prefix_len(mask: &str) -> Option<u8> {
    let octets: Vec<u8> = mask
        .split('.')
        .map(|o| o.parse::<u8>().ok())
        .collect::<Option<Vec<_>>>()?;
    if octets.len() != 4 {
        return None;
    }
    let bits: u32 = octets
        .iter()
        .map(|o| *o as u32)
        .fold(0u32, |acc, o| (acc << 8) | o);
    if bits == 0 {
        return Some(0);
    }
    let ones = bits.leading_ones();
    let trailing_zeros = bits.trailing_zeros();
    if ones + trailing_zeros == 32 {
        Some(ones as u8)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slash_form_parses() {
        let ip = parse_ipv4_address_line("10.0.0.1/24", None).unwrap();
        assert_eq!(ip.address, "10.0.0.1");
        assert_eq!(ip.prefix_length, 24);
    }

    #[test]
    fn dotted_form_parses() {
        let ip = parse_ipv4_address_line("10.0.0.1 255.255.255.0", Some("MGMT")).unwrap();
        assert_eq!(ip.prefix_length, 24);
        assert_eq!(ip.vrf.as_deref(), Some("MGMT"));
    }

    #[test]
    fn ipv6_slash_form() {
        let ip = parse_ipv6_address_line("2001:db8::1/64", None).unwrap();
        assert_eq!(ip.prefix_length, 64);
    }
}
