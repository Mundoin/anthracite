//! Parser dispatch boundary.
//!
//! Per V1K PROPOSAL §3.3: the parser command takes a `PlatformRef` and
//! a config string, and dispatches to the per-vendor parser by
//! `platform_id`. Parsers are composable, not chained — detection is the
//! caller's responsibility.

pub mod arista_eos;
pub mod aruba_aoscx;
pub mod cisco_ios;
pub mod cisco_iosxe;
pub mod cisco_nxos;
pub mod fortinet_fortios;
pub mod context;
pub mod nokia_sros;
pub mod paloalto_panos;
pub mod mikrotik_routeros;
pub mod huawei_vrp;
pub mod juniper_junos;
pub mod vyos;
pub mod checkpoint_gaia;
pub mod cisco_iosxr;
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
        "cisco-ios" => Ok(cisco_ios::parse(platform_ref, config_text)),
        "cisco-iosxe" => Ok(cisco_iosxe::parse(platform_ref, config_text)),
        "juniper-junos" => Ok(juniper_junos::parse(platform_ref, config_text)),
        "arista-eos" => Ok(arista_eos::parse(platform_ref, config_text)),
        "cisco-nxos" => Ok(cisco_nxos::parse(platform_ref, config_text)),
        "fortinet-fortios" => Ok(fortinet_fortios::parse(platform_ref, config_text)),
        "aruba-aoscx" => Ok(aruba_aoscx::parse(platform_ref, config_text)),
        "nokia-sros" => Ok(nokia_sros::parse(platform_ref, config_text)),
        "paloalto-panos" => Ok(paloalto_panos::parse(platform_ref, config_text)),
        "huawei-vrp" => Ok(huawei_vrp::parse(platform_ref, config_text)),
        "mikrotik-routeros" => Ok(mikrotik_routeros::parse(platform_ref, config_text)),
        "vyos" => Ok(vyos::parse(platform_ref, config_text)),
        "checkpoint-gaia" => Ok(checkpoint_gaia::parse(platform_ref, config_text)),
        "cisco-iosxr" => Ok(cisco_iosxr::parse(platform_ref, config_text)),
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
        let r = parse_device_config(pref(Some("unknown-vendor-xyz")), "x");
        assert_eq!(
            r.unwrap_err(),
            "unsupported platform: unknown-vendor-xyz"
        );
    }

    #[test]
    fn juniper_junos_platform_id_dispatches_ok() {
        let r = parse_device_config(pref(Some("juniper-junos")), "set system host-name r1\n");
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("r1"));
    }

    #[test]
    fn cisco_ios_platform_id_dispatches_ok() {
        let r = parse_device_config(pref(Some("cisco-ios")), "hostname ios-core-01\nend\n");
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("ios-core-01"));
    }

    #[test]
    fn arista_eos_platform_id_dispatches_ok() {
        let r = parse_device_config(
            pref(Some("arista-eos")),
            "hostname eos-x\nend\n",
        );
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("eos-x"));
    }

    #[test]
    fn aruba_aoscx_platform_id_dispatches_ok() {
        let r = parse_device_config(
            pref(Some("aruba-aoscx")),
            "hostname aoscx-01\n",
        );
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("aoscx-01"));
    }

    #[test]
    fn cisco_nxos_platform_id_dispatches_ok() {
        let r = parse_device_config(
            pref(Some("cisco-nxos")),
            "hostname nxos-x\nend\n",
        );
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("nxos-x"));
    }

    #[test]
    fn known_platform_id_returns_ok() {
        let r = parse_device_config(pref(Some("cisco-iosxe")), "hostname foo\nend\n");
        assert!(r.is_ok());
    }

    #[test]
    fn huawei_vrp_platform_id_dispatches_ok() {
        let r = parse_device_config(
            pref(Some("huawei-vrp")),
            "sysname vrp-test\nreturn\n",
        );
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("vrp-test"));
    }

    #[test]
    fn fortios_platform_id_dispatches_ok() {
        let r = parse_device_config(
            pref(Some("fortinet-fortios")),
            "config system global\n    set hostname \"fg-test\"\nend\n",
        );
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("fg-test"));
    }

    #[test]
    fn nokia_sros_platform_id_dispatches_ok() {
        let r = parse_device_config(
            pref(Some("nokia-sros")),
            "configure system name sros-test\n",
        );
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("sros-test"));
    }

    #[test]
    fn mikrotik_routeros_platform_id_dispatches_ok() {
        let r = parse_device_config(
            pref(Some("mikrotik-routeros")),
            "/system identity set name=ros-core-001\n",
        );
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("ros-core-001"));
    }

    #[test]
    fn paloalto_panos_platform_id_dispatches_ok() {
        let r = parse_device_config(
            pref(Some("paloalto-panos")),
            "set deviceconfig system hostname pa-01\n",
        );
        assert!(r.is_ok());
        assert_eq!(r.unwrap().identity.hostname.as_deref(), Some("pa-01"));
    }
}
