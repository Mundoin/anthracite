//! EOS static-route parsing — V1N.
//!
//! Shapes:
//!   ip route <PREFIX/LEN | NET MASK> <NEXTHOP> [tag N] [name STR]
//!   ip route vrf NAME <PREFIX/LEN | NET MASK> <NEXTHOP> ...
//!   ipv6 route <PREFIX/LEN> <NEXTHOP> ...
//!   ipv6 route vrf NAME <PREFIX/LEN> <NEXTHOP> ...

use crate::engines::network_model::StaticRouteModel;

use super::ip_addressing::mask_to_prefix_len;

pub fn parse_ip_route(args: &str) -> Option<StaticRouteModel> {
    let mut toks: Vec<&str> = args.split_whitespace().collect();
    let mut vrf: Option<String> = None;
    if toks.first().map(|s| s.eq_ignore_ascii_case("vrf")).unwrap_or(false) && toks.len() >= 2 {
        vrf = Some(toks[1].to_string());
        toks.drain(0..2);
    }
    if toks.is_empty() {
        return None;
    }
    let (prefix, next_hop_idx) = if toks[0].contains('/') {
        (toks[0].to_string(), 1)
    } else if toks.len() >= 2 {
        let pl = mask_to_prefix_len(toks[1])?;
        (format!("{}/{}", toks[0], pl), 2)
    } else {
        return None;
    };
    let next_hop = toks.get(next_hop_idx)?.to_string();
    let mut tag: Option<u32> = None;
    let mut name: Option<String> = None;
    let mut admin_distance: Option<u32> = None;
    let mut i = next_hop_idx + 1;
    while i < toks.len() {
        match toks[i].to_ascii_lowercase().as_str() {
            "tag" => {
                if i + 1 < toks.len() {
                    tag = toks[i + 1].parse().ok();
                    i += 2;
                    continue;
                }
            }
            "name" => {
                if i + 1 < toks.len() {
                    name = Some(toks[i + 1..].join(" "));
                    break;
                }
            }
            _ => {
                // Optional admin-distance is a bare integer between
                // next-hop and tail keywords on EOS.
                if let Ok(d) = toks[i].parse::<u32>() {
                    admin_distance = Some(d);
                }
            }
        }
        i += 1;
    }
    Some(StaticRouteModel {
        prefix,
        next_hops: vec![next_hop],
        admin_distance,
        metric: None,
        tag,
        vrf,
        name,
    })
}

pub fn parse_ipv6_route(args: &str) -> Option<StaticRouteModel> {
    let mut toks: Vec<&str> = args.split_whitespace().collect();
    let mut vrf: Option<String> = None;
    if toks.first().map(|s| s.eq_ignore_ascii_case("vrf")).unwrap_or(false) && toks.len() >= 2 {
        vrf = Some(toks[1].to_string());
        toks.drain(0..2);
    }
    if toks.len() < 2 {
        return None;
    }
    let prefix = toks[0].to_string();
    let next_hop = toks[1].to_string();
    Some(StaticRouteModel {
        prefix,
        next_hops: vec![next_hop],
        admin_distance: None,
        metric: None,
        tag: None,
        vrf,
        name: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slash_form_ip_route() {
        let r = parse_ip_route("10.0.0.0/24 10.0.0.1").unwrap();
        assert_eq!(r.prefix, "10.0.0.0/24");
        assert_eq!(r.next_hops, vec!["10.0.0.1".to_string()]);
    }

    #[test]
    fn dotted_form_ip_route() {
        let r = parse_ip_route("10.0.0.0 255.255.255.0 10.0.0.1").unwrap();
        assert_eq!(r.prefix, "10.0.0.0/24");
    }

    #[test]
    fn vrf_prefix_ip_route() {
        let r = parse_ip_route("vrf MGMT 0.0.0.0/0 10.0.0.1").unwrap();
        assert_eq!(r.vrf.as_deref(), Some("MGMT"));
        assert_eq!(r.prefix, "0.0.0.0/0");
    }

    #[test]
    fn ipv6_form() {
        let r = parse_ipv6_route("::/0 2001:db8::1").unwrap();
        assert_eq!(r.prefix, "::/0");
    }
}
