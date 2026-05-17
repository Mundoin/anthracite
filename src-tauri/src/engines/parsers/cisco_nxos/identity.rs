//! NX-OS identity helpers — V1U.

pub fn parse_hostname(args: &str) -> Option<String> {
    let t = args.trim();
    if t.is_empty() {
        None
    } else {
        Some(t.to_string())
    }
}

/// NX-OS running-configs embed `!Command: show running-config` and similar
/// comment markers at the top. Not a version anchor but still useful as
/// a corpus identity signal when no `version` command is present.
pub fn parse_nxos_command_marker(trimmed: &str) -> Option<String> {
    if let Some(rest) = trimmed.strip_prefix("!Command:") {
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

/// NX-OS top-level `version X.X(X)X` line — extract the version token.
pub fn parse_nxos_version(args: &str) -> Option<String> {
    let t = args.trim();
    if t.is_empty() {
        None
    } else {
        Some(t.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hostname_basic() {
        assert_eq!(parse_hostname("nxos-spine-01").as_deref(), Some("nxos-spine-01"));
    }

    #[test]
    fn command_marker() {
        assert_eq!(
            parse_nxos_command_marker("!Command: show running-config").as_deref(),
            Some("show running-config")
        );
    }

    #[test]
    fn version_parses() {
        assert_eq!(parse_nxos_version("9.3(8)").as_deref(), Some("9.3(8)"));
    }
}
