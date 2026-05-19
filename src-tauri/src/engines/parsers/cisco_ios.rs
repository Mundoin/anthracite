//! cisco-ios parser — V1BC initial.
//!
//! The Cisco IOS family shares the same canonical L1/L2 parser surface
//! as the IOS-XE baseline. This wrapper keeps a distinct platform id
//! and parser-version contract while reusing the IOS-XE parse core.

use crate::engines::network_model::{DeviceModel, PlatformRef};

pub const PARSER_VERSION: u32 = 1;

/// Parse a cisco-ios config blob. Returns a populated `DeviceModel`.
/// Never panics.
pub fn parse(platform_ref: PlatformRef, config_text: &str) -> DeviceModel {
    let mut model = crate::engines::parsers::cisco_iosxe::parse(platform_ref, config_text);
    model.evidence.parser_version = Some(PARSER_VERSION.to_string());
    model
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_keeps_cisco_ios_platform_and_version() {
        let model = parse(
            PlatformRef {
                platform_id: Some("cisco-ios".to_string()),
                vendor: Some("Cisco".to_string()),
                os_family: Some("IOS / IOS XE".to_string()),
                os_version_raw: None,
                os_version_normalized: None,
                detection_confidence: Some(0.9),
            },
            "hostname ios-core-01\nend\n",
        );

        assert_eq!(model.platform.platform_id.as_deref(), Some("cisco-ios"));
        assert_eq!(model.evidence.parser_version.as_deref(), Some("1"));
        assert_eq!(model.identity.hostname.as_deref(), Some("ios-core-01"));
    }
}
