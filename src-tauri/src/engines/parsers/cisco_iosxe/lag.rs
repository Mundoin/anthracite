//! LAG / channel-group helpers.

use crate::engines::network_model::LagMode;

/// Parse `channel-group N [mode active|passive|on]`. Returns
/// `(bundle_id, mode)` where mode is None for bare `channel-group N`
/// without an explicit mode keyword.
pub fn parse_channel_group(args: &str) -> Option<(u16, Option<LagMode>)> {
    let toks: Vec<&str> = args.split_whitespace().collect();
    if toks.is_empty() {
        return None;
    }
    let id: u16 = toks[0].parse().ok()?;
    let mode = if toks.len() >= 3 && toks[1].eq_ignore_ascii_case("mode") {
        match toks[2].to_ascii_lowercase().as_str() {
            "active" => Some(LagMode::Active),
            "passive" => Some(LagMode::Passive),
            "on" => Some(LagMode::Static),
            _ => None,
        }
    } else {
        None
    };
    Some((id, mode))
}

/// Canonical LAG name from bundle id.
pub fn lag_name(id: u16) -> String {
    format!("Port-channel{id}")
}

/// Canonical LAG short form (matches `normalize::normalize_cisco`).
pub fn lag_normalized(id: u16) -> String {
    format!("Po{id}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn channel_group_active() {
        let (id, mode) = parse_channel_group("1 mode active").unwrap();
        assert_eq!(id, 1);
        assert_eq!(mode, Some(LagMode::Active));
    }

    #[test]
    fn channel_group_passive() {
        let (_, mode) = parse_channel_group("2 mode passive").unwrap();
        assert_eq!(mode, Some(LagMode::Passive));
    }

    #[test]
    fn channel_group_on_is_static() {
        let (_, mode) = parse_channel_group("3 mode on").unwrap();
        assert_eq!(mode, Some(LagMode::Static));
    }

    #[test]
    fn channel_group_bare_id_has_no_mode() {
        let (id, mode) = parse_channel_group("4").unwrap();
        assert_eq!(id, 4);
        assert_eq!(mode, None);
    }

    #[test]
    fn channel_group_malformed_returns_none() {
        assert!(parse_channel_group("").is_none());
        assert!(parse_channel_group("not-a-number").is_none());
    }

    #[test]
    fn names_are_canonical() {
        assert_eq!(lag_name(7), "Port-channel7");
        assert_eq!(lag_normalized(7), "Po7");
    }
}
