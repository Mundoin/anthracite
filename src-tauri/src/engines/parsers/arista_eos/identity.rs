//! EOS identity helpers — V1N.

pub fn parse_hostname(args: &str) -> Option<String> {
    let t = args.trim();
    if t.is_empty() {
        None
    } else {
        Some(t.to_string())
    }
}

/// EOS configs sometimes begin with `! device: NAME` style markers.
pub fn parse_device_marker(trimmed: &str) -> Option<String> {
    if let Some(rest) = trimmed.strip_prefix("! device:") {
        let v = rest.trim();
        if v.is_empty() {
            None
        } else {
            Some(v.to_string())
        }
    } else {
        None
    }
}

/// EOS `! boot system flash:/EOS-4.X.X.swi` is a common version anchor.
pub fn parse_eos_version_marker(trimmed: &str) -> Option<String> {
    if let Some(idx) = trimmed.find("EOS-") {
        let rest = &trimmed[idx + 4..];
        let v: String = rest
            .chars()
            .take_while(|c| !c.is_whitespace() && *c != ',')
            .collect();
        if v.is_empty() {
            None
        } else {
            Some(v)
        }
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hostname_basic() {
        assert_eq!(parse_hostname("eos-core").as_deref(), Some("eos-core"));
    }

    #[test]
    fn device_marker() {
        assert_eq!(
            parse_device_marker("! device: dc1-spine-01").as_deref(),
            Some("dc1-spine-01")
        );
    }

    #[test]
    fn version_marker_from_boot() {
        assert_eq!(
            parse_eos_version_marker("! boot system flash:/EOS-4.30.5M.swi")
                .as_deref(),
            Some("4.30.5M.swi")
        );
    }
}
