//! Static route helpers for `ip route` / `ipv6 route`.

use crate::engines::network_model::StaticRouteModel;

use super::ip_addressing::mask_to_prefix_v4;

/// Parse `ip route [vrf NAME] PREFIX MASK NEXTHOP [...]` argument list.
///
/// Returns a populated `StaticRouteModel` or `None` if structurally
/// malformed. Recognises trailing `name NAME`, `tag N`, and a single
/// trailing integer as the admin distance (Cisco IOS-XE convention).
pub fn parse_ip_route(args: &str) -> Option<StaticRouteModel> {
    let toks: Vec<&str> = args.split_whitespace().collect();
    if toks.len() < 3 {
        return None;
    }
    let mut i = 0;
    let mut vrf: Option<String> = None;
    if toks[i].eq_ignore_ascii_case("vrf") {
        i += 1;
        if i >= toks.len() {
            return None;
        }
        vrf = Some(toks[i].to_string());
        i += 1;
    }
    if toks.len() - i < 3 {
        return None;
    }
    let addr = toks[i];
    let mask = toks[i + 1];
    let next_hop = toks[i + 2];
    i += 3;
    let prefix = mask_to_prefix_v4(mask)?;
    let cidr = format!("{addr}/{prefix}");

    let mut name: Option<String> = None;
    let mut tag: Option<u32> = None;
    let mut admin_distance: Option<u32> = None;
    while i < toks.len() {
        match toks[i].to_ascii_lowercase().as_str() {
            "name" => {
                if i + 1 < toks.len() {
                    name = Some(toks[i + 1].to_string());
                    i += 2;
                    continue;
                }
            }
            "tag" => {
                if i + 1 < toks.len() {
                    tag = toks[i + 1].parse().ok();
                    i += 2;
                    continue;
                }
            }
            other => {
                if let Ok(n) = other.parse::<u32>() {
                    admin_distance = Some(n);
                    i += 1;
                    continue;
                }
            }
        }
        i += 1;
    }

    Some(StaticRouteModel {
        prefix: cidr,
        next_hops: vec![next_hop.to_string()],
        admin_distance,
        metric: None,
        tag,
        vrf,
        name,
    })
}

/// Parse `ipv6 route [vrf NAME] PREFIX/LEN NEXTHOP [...]` argument list.
pub fn parse_ipv6_route(args: &str) -> Option<StaticRouteModel> {
    let toks: Vec<&str> = args.split_whitespace().collect();
    if toks.len() < 2 {
        return None;
    }
    let mut i = 0;
    let mut vrf: Option<String> = None;
    if toks[i].eq_ignore_ascii_case("vrf") {
        i += 1;
        if i >= toks.len() {
            return None;
        }
        vrf = Some(toks[i].to_string());
        i += 1;
    }
    if toks.len() - i < 2 {
        return None;
    }
    let prefix = toks[i];
    let next_hop = toks[i + 1];
    i += 2;
    if !prefix.contains('/') {
        return None;
    }

    let mut name: Option<String> = None;
    let mut tag: Option<u32> = None;
    let mut admin_distance: Option<u32> = None;
    while i < toks.len() {
        match toks[i].to_ascii_lowercase().as_str() {
            "name" => {
                if i + 1 < toks.len() {
                    name = Some(toks[i + 1].to_string());
                    i += 2;
                    continue;
                }
            }
            "tag" => {
                if i + 1 < toks.len() {
                    tag = toks[i + 1].parse().ok();
                    i += 2;
                    continue;
                }
            }
            other => {
                if let Ok(n) = other.parse::<u32>() {
                    admin_distance = Some(n);
                    i += 1;
                    continue;
                }
            }
        }
        i += 1;
    }

    Some(StaticRouteModel {
        prefix: prefix.to_string(),
        next_hops: vec![next_hop.to_string()],
        admin_distance,
        metric: None,
        tag,
        vrf,
        name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ip_route_dotted_quad_mask() {
        let r = parse_ip_route("10.0.0.0 255.255.255.0 192.168.1.1").unwrap();
        assert_eq!(r.prefix, "10.0.0.0/24");
        assert_eq!(r.next_hops, vec!["192.168.1.1".to_string()]);
        assert_eq!(r.admin_distance, None);
        assert_eq!(r.vrf, None);
    }

    #[test]
    fn ip_route_with_admin_distance() {
        let r = parse_ip_route("0.0.0.0 0.0.0.0 10.0.0.1 200").unwrap();
        assert_eq!(r.admin_distance, Some(200));
        assert_eq!(r.prefix, "0.0.0.0/0");
    }

    #[test]
    fn ip_route_in_vrf_with_name() {
        let r = parse_ip_route("vrf CUST-A 0.0.0.0 0.0.0.0 10.0.0.1 name uplink").unwrap();
        assert_eq!(r.vrf.as_deref(), Some("CUST-A"));
        assert_eq!(r.name.as_deref(), Some("uplink"));
    }

    #[test]
    fn ip_route_with_tag() {
        let r = parse_ip_route("10.1.0.0 255.255.0.0 192.168.1.1 tag 42").unwrap();
        assert_eq!(r.tag, Some(42));
    }

    #[test]
    fn ipv6_route_prefix_form() {
        let r = parse_ipv6_route("2001:db8::/32 2001:db8:1::1").unwrap();
        assert_eq!(r.prefix, "2001:db8::/32");
        assert_eq!(r.next_hops, vec!["2001:db8:1::1".to_string()]);
    }

    #[test]
    fn ipv6_route_rejects_non_cidr() {
        assert!(parse_ipv6_route("2001:db8:: 2001:db8:1::1").is_none());
    }

    #[test]
    fn ip_route_malformed_returns_none() {
        assert!(parse_ip_route("").is_none());
        assert!(parse_ip_route("only-two tokens").is_none());
    }
}
