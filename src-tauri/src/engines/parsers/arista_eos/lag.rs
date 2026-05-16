//! EOS LAG helpers — V1N.

use crate::engines::network_model::LagMode;

/// EOS `channel-group N mode active|passive|on` — parse `(N, mode)`.
pub fn parse_channel_group(args: &str) -> Option<(u32, Option<LagMode>)> {
    let mut toks = args.split_whitespace();
    let id: u32 = toks.next()?.parse().ok()?;
    let mut mode: Option<LagMode> = None;
    while let Some(t) = toks.next() {
        if t.eq_ignore_ascii_case("mode") {
            mode = match toks.next().map(|s| s.to_ascii_lowercase()).as_deref() {
                Some("active") => Some(LagMode::Active),
                Some("passive") => Some(LagMode::Passive),
                Some("on") => Some(LagMode::Static),
                _ => None,
            };
        }
    }
    Some((id, mode))
}

pub fn lag_name(id: u32) -> String {
    format!("Port-Channel{id}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_id_and_mode() {
        assert_eq!(
            parse_channel_group("10 mode active"),
            Some((10, Some(LagMode::Active)))
        );
        assert_eq!(
            parse_channel_group("5 mode on"),
            Some((5, Some(LagMode::Static)))
        );
    }
}
