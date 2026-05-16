//! Junos identity area helpers — V1M.

use super::canonical::JunosLine;

/// Resolve `system host-name X` to `X`, or `None` if line shape differs.
pub fn try_host_name(line: &JunosLine) -> Option<String> {
    if line.path.len() == 3
        && line.path[0] == "system"
        && line.path[1] == "host-name"
    {
        Some(line.path[2].clone())
    } else {
        None
    }
}

/// Junos `chassis serial-number X` — not always present but useful when it is.
pub fn try_serial(line: &JunosLine) -> Option<String> {
    if line.path.len() >= 3 && line.path[0] == "chassis" && line.path[1] == "serial-number" {
        Some(line.path[2..].join(" "))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ln(path: &[&str]) -> JunosLine {
        JunosLine::new(
            path.iter().map(|s| s.to_string()).collect(),
            1,
            String::new(),
        )
    }

    #[test]
    fn host_name_extracted() {
        assert_eq!(
            try_host_name(&ln(&["system", "host-name", "router1"])).as_deref(),
            Some("router1")
        );
    }

    #[test]
    fn non_host_name_returns_none() {
        assert!(try_host_name(&ln(&["system", "domain-name", "x"])).is_none());
    }
}
