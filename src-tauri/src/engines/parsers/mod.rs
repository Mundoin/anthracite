//! Parser dispatch boundary.
//!
//! Per V1K PROPOSAL §3.3: the parser command takes a `PlatformRef` and
//! a config string, and dispatches to the per-vendor parser by
//! `platform_id`. Parsers are composable, not chained — detection is the
//! caller's responsibility.

pub mod cisco_iosxe;
pub mod context;
pub mod normalize;

use crate::engines::network_model::DeviceModel;
use crate::engines::network_model::PlatformRef;

/// Entry point. Returns a populated `DeviceModel` on success, or a
/// controlled error string. Never panics.
pub fn parse_device_config(
    platform_ref: PlatformRef,
    config_text: &str,
) -> Result<DeviceModel, String> {
    let id = platform_ref
        .platform_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "missing platform id".to_string())?;

    match id {
        "cisco-iosxe" => Ok(cisco_iosxe::parse(platform_ref, config_text)),
        other => Err(format!("unsupported platform: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pref(id: Option<&str>) -> PlatformRef {
        PlatformRef {
            platform_id: id.map(|s| s.to_string()),
            vendor: None,
            os_family: None,
            os_version_raw: None,
            os_version_normalized: None,
            detection_confidence: None,
        }
    }

    #[test]
    fn missing_platform_id_returns_err() {
        let r = parse_device_config(pref(None), "hostname foo\n");
        assert_eq!(r.unwrap_err(), "missing platform id");
    }

    #[test]
    fn empty_platform_id_returns_err() {
        let r = parse_device_config(pref(Some("")), "hostname foo\n");
        assert_eq!(r.unwrap_err(), "missing platform id");
    }

    #[test]
    fn whitespace_platform_id_returns_err() {
        let r = parse_device_config(pref(Some("   ")), "hostname foo\n");
        assert_eq!(r.unwrap_err(), "missing platform id");
    }

    #[test]
    fn unknown_platform_id_returns_err() {
        let r = parse_device_config(pref(Some("juniper-junos")), "x");
        assert_eq!(r.unwrap_err(), "unsupported platform: juniper-junos");
    }

    #[test]
    fn known_platform_id_returns_ok() {
        let r = parse_device_config(pref(Some("cisco-iosxe")), "hostname foo\nend\n");
        assert!(r.is_ok());
    }
}
