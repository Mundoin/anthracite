//! cisco-iosxe identity-area helpers: hostname, version, chassis,
//! serials, last-change marker.

/// Parse `hostname NAME` (rest of line is the name).
pub fn parse_hostname(args: &str) -> Option<String> {
    let name = args.trim();
    if name.is_empty() {
        None
    } else {
        Some(name.to_string())
    }
}

/// Parse `version 17.9` from a line that has already been split into
/// `args`. Returns the raw version string. Normalised form is not
/// derived here.
pub fn parse_version(args: &str) -> Option<String> {
    let v = args.trim();
    if v.is_empty() {
        None
    } else {
        Some(v.to_string())
    }
}

/// Best-effort chassis / model extraction from a "version" comment line
/// like `! Hardware:   ASR1001-X, ...`. Heuristic only.
pub fn parse_chassis_marker(comment: &str) -> Option<String> {
    let t = comment.trim_start_matches('!').trim();
    let lower = t.to_ascii_lowercase();
    if lower.starts_with("hardware:") {
        let after = t.split_once(':').map(|(_, v)| v.trim()).unwrap_or("");
        let chassis = after.split(',').next().unwrap_or("").trim();
        if chassis.is_empty() {
            None
        } else {
            Some(chassis.to_string())
        }
    } else {
        None
    }
}

/// Extract serial number from a comment like
/// `! Processor board ID FOC2300ABCD`.
pub fn parse_serial_marker(comment: &str) -> Option<String> {
    let t = comment.trim_start_matches('!').trim();
    let lower = t.to_ascii_lowercase();
    if lower.starts_with("processor board id") {
        let serial = t
            .split_whitespace()
            .nth(3)
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty());
        return serial;
    }
    None
}

/// Extract last-change marker from `! Last configuration change at …`.
pub fn parse_last_change_marker(comment: &str) -> Option<String> {
    let t = comment.trim_start_matches('!').trim();
    let lower = t.to_ascii_lowercase();
    if lower.starts_with("last configuration change") {
        Some(t.to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hostname_present() {
        assert_eq!(parse_hostname("core-01").as_deref(), Some("core-01"));
    }

    #[test]
    fn hostname_absent_when_blank() {
        assert_eq!(parse_hostname(""), None);
        assert_eq!(parse_hostname("   "), None);
    }

    #[test]
    fn version_present() {
        assert_eq!(parse_version("17.9.3").as_deref(), Some("17.9.3"));
    }

    #[test]
    fn version_absent_when_blank() {
        assert_eq!(parse_version(""), None);
    }

    #[test]
    fn chassis_marker_parsed() {
        assert_eq!(
            parse_chassis_marker("! Hardware:   ASR1001-X, foo bar").as_deref(),
            Some("ASR1001-X")
        );
    }

    #[test]
    fn chassis_marker_absent() {
        assert_eq!(parse_chassis_marker("! some other comment"), None);
    }

    #[test]
    fn serial_marker_parsed() {
        assert_eq!(
            parse_serial_marker("! Processor board ID FOC2300ABCD").as_deref(),
            Some("FOC2300ABCD")
        );
    }

    #[test]
    fn last_change_marker_parsed() {
        let line = "! Last configuration change at 12:30:55 UTC Wed May 14 2026 by admin";
        let got = parse_last_change_marker(line);
        assert!(got.is_some());
        assert!(got.unwrap().contains("Last configuration change"));
    }

    #[test]
    fn hostname_round_trip() {
        let h = parse_hostname("rtr");
        assert_eq!(h.as_deref(), Some("rtr"));
    }
}
