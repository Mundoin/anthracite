//! V1AP — Raw neighbour-output import: parse → resolve → persist evidence.
//!
//! Owns: raw text parsing for bounded LLDP/CDP formats, exact inventory
//! resolution (no fuzziness), import orchestration that writes into the
//! V1AO TopologyEvidenceStore.
//!
//! Boundary: topology-owned. Does NOT touch vendor config parsers,
//! DeviceModel, Discovery semantics, or parser-lab.

use crate::engines::discovery::DiscoveryDeviceRecord;
use crate::engines::topology::{TopologyAdjacencyFactSourceKind, TopologyNeighborEvidence};
use crate::engines::topology_evidence_store::{
    TopologyEvidenceStore, TopologyEvidenceStoreError, TopologyEvidenceImportMode,
    apply_evidence_import,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RawNeighborSourceKind {
    Lldp,
    Cdp,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RawNeighborEvidenceImportRequest {
    pub environment_id: String,
    pub local_node: String,              // hostname OR record_id; case-insensitive trim match
    pub source_kind: RawNeighborSourceKind,
    pub platform_hint: Option<String>,   // carried into source_label, not consumed in V1AP
    pub raw_text: String,
    pub source_label: Option<String>,
    pub mode: Option<TopologyEvidenceImportMode>, // V1AR: import mode (defaults to Replace)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RawNeighborParsedEntry {
    pub local_interface: Option<String>,
    pub remote_system_name: Option<String>,
    pub remote_port_id: Option<String>,
    pub remote_chassis_id: Option<String>,
    pub raw_block: String,               // the raw text block this entry came from (for traceability)
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RawNeighborRejectionReason {
    UnresolvedLocal,
    UnresolvedRemote,
    SelfLink,
    UnsupportedFormat,
    ParseEmpty,                          // parser found zero entries (text didn't match format)
    MissingRequiredField,                // remote_system_name absent — can't resolve
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RawNeighborRejectedEntry {
    pub reason: RawNeighborRejectionReason,
    pub detail: String,                  // human-readable: "remote 'router-99' not in inventory"
    pub raw_block: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RawNeighborEvidenceImportResult {
    pub parsed_entries_total: u32,
    pub accepted_evidence_count: u32,
    pub rejected_count: u32,
    pub unresolved_count: u32,           // subset of rejected: UnresolvedRemote + UnresolvedLocal
    pub stored_evidence_count: u32,      // total in store after this import
    pub evidence_set_id: Option<String>, // from store after write
    pub accepted_evidence: Vec<TopologyNeighborEvidence>,
    pub rejected_entries: Vec<RawNeighborRejectedEntry>,
}

// =====================================================================
// Parsers — Cisco IOS-XE LLDP detail
// =====================================================================

fn parse_iosxe_lldp_detail(text: &str) -> Vec<RawNeighborParsedEntry> {
    let mut entries = Vec::new();
    let blocks: Vec<&str> = text.split("------------------------------------------------").collect();

    for block in blocks {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }

        let mut entry = RawNeighborParsedEntry {
            local_interface: None,
            remote_system_name: None,
            remote_port_id: None,
            remote_chassis_id: None,
            raw_block: block.to_string(),
        };

        for line in block.lines() {
            let line_trimmed = line.trim();
            if let Some(val) = line_trimmed.strip_prefix("Local Intf:") {
                entry.local_interface = Some(val.trim().to_string());
            } else if let Some(val) = line_trimmed.strip_prefix("System Name:") {
                entry.remote_system_name = Some(val.trim().to_string());
            } else if let Some(val) = line_trimmed.strip_prefix("Port id:") {
                entry.remote_port_id = Some(val.trim().to_string());
            } else if let Some(val) = line_trimmed.strip_prefix("Port ID:") {
                entry.remote_port_id = Some(val.trim().to_string());
            } else if let Some(val) = line_trimmed.strip_prefix("Chassis id:") {
                entry.remote_chassis_id = Some(val.trim().to_string());
            } else if let Some(val) = line_trimmed.strip_prefix("Chassis ID:") {
                entry.remote_chassis_id = Some(val.trim().to_string());
            }
        }

        // Accept only if remote has identity (system_name OR chassis_id)
        if entry.remote_system_name.is_some() || entry.remote_chassis_id.is_some() {
            entries.push(entry);
        }
    }

    entries
}

// =====================================================================
// Parsers — Cisco IOS-XE CDP detail
// =====================================================================

fn parse_iosxe_cdp_detail(text: &str) -> Vec<RawNeighborParsedEntry> {
    let mut entries = Vec::new();
    let blocks: Vec<&str> = text.split("-------------------------").collect();

    for block in blocks {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }

        let mut entry = RawNeighborParsedEntry {
            local_interface: None,
            remote_system_name: None,
            remote_port_id: None,
            remote_chassis_id: None,
            raw_block: block.to_string(),
        };

        let mut has_device_id = false;

        for line in block.lines() {
            let line_trimmed = line.trim();

            if let Some(val) = line_trimmed.strip_prefix("Device ID:") {
                entry.remote_system_name = Some(val.trim().to_string());
                has_device_id = true;
            } else if let Some(val) = line_trimmed.strip_prefix("Interface:") {
                // Interface line format: "Interface: Gi0/1, Port ID (outgoing port): Gi0/2"
                // or separate lines for Interface and Port ID
                let iface_part = val.trim();
                // Extract local interface (before the comma)
                if let Some(local) = iface_part.split(',').next() {
                    entry.local_interface = Some(local.trim().to_string());
                }
                // Check if Port ID is on the same line
                if let Some(port_part) = iface_part.split("Port ID (outgoing port):").nth(1) {
                    entry.remote_port_id = Some(port_part.trim().to_string());
                }
            } else if let Some(val) = line_trimmed.strip_prefix("Port ID (outgoing port):") {
                entry.remote_port_id = Some(val.trim().to_string());
            }
        }

        // Accept only if we found Device ID
        if has_device_id {
            entries.push(entry);
        }
    }

    entries
}

// =====================================================================
// Parsers — Arista EOS LLDP detail
// =====================================================================

fn parse_eos_lldp_detail(text: &str) -> Vec<RawNeighborParsedEntry> {
    let mut entries = Vec::new();
    let mut current_local_interface: Option<String> = None;
    let mut current_entry: Option<RawNeighborParsedEntry> = None;

    for line in text.lines() {
        let line_trimmed = line.trim();

        // Detect interface header: "Interface Ethernet1 detected 1 LLDP neighbors:"
        if line_trimmed.contains("detected") && line_trimmed.contains("LLDP neighbors") {
            // Save previous entry if any
            if let Some(entry) = current_entry.take() {
                if entry.remote_system_name.is_some() || entry.remote_chassis_id.is_some() {
                    entries.push(entry);
                }
            }

            // Extract interface name: format "Interface Ethernet1 detected 1 LLDP neighbors:"
            if let Some(start_pos) = line_trimmed.find("Interface") {
                let after_interface = &line_trimmed[start_pos + 9..];
                // Split on "detected" and take the part before it
                if let Some(iface_part) = after_interface.split("detected").next() {
                    if let Some(iface_name) = iface_part.trim().split_whitespace().next() {
                        current_local_interface = Some(iface_name.to_string());
                    }
                }
            }
        } else if line_trimmed.is_empty() {
            // Blank line signals end of current neighbor block
            if let Some(entry) = current_entry.take() {
                if entry.remote_system_name.is_some() || entry.remote_chassis_id.is_some() {
                    entries.push(entry);
                }
            }
        } else if line_trimmed.starts_with("Neighbor Device ID:") {
            // Start of a new neighbor block
            let device_id = line_trimmed.strip_prefix("Neighbor Device ID:").unwrap().trim().to_string();
            if let Some(local_iface) = current_local_interface.clone() {
                // Save previous entry if any
                if let Some(entry) = current_entry.take() {
                    if entry.remote_system_name.is_some() || entry.remote_chassis_id.is_some() {
                        entries.push(entry);
                    }
                }
                current_entry = Some(RawNeighborParsedEntry {
                    local_interface: Some(local_iface),
                    remote_system_name: Some(device_id),
                    remote_port_id: None,
                    remote_chassis_id: None,
                    raw_block: line.to_string(),
                });
            }
        } else if let Some(ref mut entry) = current_entry {
            // Inside a neighbor block, capture remaining fields
            if let Some(val) = line_trimmed.strip_prefix("Neighbor Port ID:") {
                entry.remote_port_id = Some(val.trim().to_string());
            } else if let Some(val) = line_trimmed.strip_prefix("Neighbor Chassis ID:") {
                entry.remote_chassis_id = Some(val.trim().to_string());
            }
            entry.raw_block.push('\n');
            entry.raw_block.push_str(line);
        }
    }

    // Don't forget the last entry
    if let Some(entry) = current_entry {
        if entry.remote_system_name.is_some() || entry.remote_chassis_id.is_some() {
            entries.push(entry);
        }
    }

    entries
}

// =====================================================================
// Parsers — Cisco NX-OS LLDP detail
// =====================================================================

fn parse_nxos_lldp_detail(text: &str) -> Vec<RawNeighborParsedEntry> {
    let mut entries = Vec::new();
    // Split on long separator lines (========) or blank lines between blocks

    let mut current_block = String::new();
    for line in text.lines() {
        let trimmed = line.trim();
        // Check for block separator: line of 8+ dashes or equals
        if (trimmed.chars().all(|c| c == '-') || trimmed.chars().all(|c| c == '='))
            && trimmed.len() >= 8
        {
            if !current_block.is_empty() {
                process_nxos_lldp_block(&current_block, &mut entries);
                current_block.clear();
            }
        } else if trimmed.is_empty() {
            if !current_block.is_empty() {
                process_nxos_lldp_block(&current_block, &mut entries);
                current_block.clear();
            }
        } else {
            if !current_block.is_empty() {
                current_block.push('\n');
            }
            current_block.push_str(line);
        }
    }
    if !current_block.is_empty() {
        process_nxos_lldp_block(&current_block, &mut entries);
    }

    entries
}

fn process_nxos_lldp_block(block: &str, entries: &mut Vec<RawNeighborParsedEntry>) {
    let mut entry = RawNeighborParsedEntry {
        local_interface: None,
        remote_system_name: None,
        remote_port_id: None,
        remote_chassis_id: None,
        raw_block: block.to_string(),
    };

    for line in block.lines() {
        let line_trimmed = line.trim();
        // Split on first colon and extract value
        if let Some((key, val)) = line_trimmed.split_once(':') {
            let key = key.trim();
            let val = val.trim();
            match key {
                "System Name" => entry.remote_system_name = Some(val.to_string()),
                "Chassis id" | "Chassis ID" => entry.remote_chassis_id = Some(val.to_string()),
                "Port id" | "Port ID" => entry.remote_port_id = Some(val.to_string()),
                "Local Port id" | "Local Port ID" => entry.local_interface = Some(val.to_string()),
                _ => {}
            }
        }
    }

    // Accept only if remote has identity
    if entry.remote_system_name.is_some() || entry.remote_chassis_id.is_some() {
        entries.push(entry);
    }
}

// =====================================================================
// Parsers — Cisco NX-OS CDP detail
// =====================================================================

fn parse_nxos_cdp_detail(text: &str) -> Vec<RawNeighborParsedEntry> {
    let mut entries = Vec::new();
    let mut current_block = String::new();

    for line in text.lines() {
        let trimmed = line.trim();
        // Detect block separator: line of dashes (----) of length >= 4
        if trimmed.chars().all(|c| c == '-') && trimmed.len() >= 4 {
            if !current_block.is_empty() {
                process_nxos_cdp_block(&current_block, &mut entries);
                current_block.clear();
            }
        } else if !trimmed.is_empty() {
            if !current_block.is_empty() {
                current_block.push('\n');
            }
            current_block.push_str(line);
        }
    }
    if !current_block.is_empty() {
        process_nxos_cdp_block(&current_block, &mut entries);
    }

    entries
}

fn process_nxos_cdp_block(block: &str, entries: &mut Vec<RawNeighborParsedEntry>) {
    let mut entry = RawNeighborParsedEntry {
        local_interface: None,
        remote_system_name: None,
        remote_port_id: None,
        remote_chassis_id: None,
        raw_block: block.to_string(),
    };

    let mut has_device_id = false;

    for line in block.lines() {
        let line_trimmed = line.trim();
        if let Some((key, val)) = line_trimmed.split_once(':') {
            let key = key.trim();
            let val = val.trim();
            match key {
                "Device ID" => {
                    entry.remote_system_name = Some(val.to_string());
                    has_device_id = true;
                }
                "Interface" => {
                    entry.local_interface = Some(val.to_string());
                }
                "Port ID (outgoing port)" => {
                    entry.remote_port_id = Some(val.to_string());
                }
                _ => {}
            }
        }
    }

    if has_device_id {
        entries.push(entry);
    }
}

// =====================================================================
// Parsers — Juniper Junos LLDP neighbors (terse table)
// =====================================================================

fn parse_junos_lldp_neighbors(text: &str) -> Vec<RawNeighborParsedEntry> {
    let mut entries = Vec::new();
    let mut header_found = false;

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Detect header line: contains "Local Interface" and "System Name"
        if trimmed.contains("Local Interface") && trimmed.contains("System Name") {
            header_found = true;
            continue;
        }

        if !header_found {
            continue;
        }

        // Parse data line: columns are whitespace-separated
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let entry = RawNeighborParsedEntry {
            local_interface: Some(parts[0].to_string()),
            remote_chassis_id: Some(parts[2].to_string()),
            remote_port_id: Some(parts[3].to_string()),
            remote_system_name: Some(parts[4].to_string()),
            raw_block: line.to_string(),
        };

        entries.push(entry);
    }

    entries
}

// =====================================================================
// Parsers — Cisco IOS-XR LLDP neighbors detail
// =====================================================================

fn parse_iosxr_lldp_neighbors(text: &str) -> Vec<RawNeighborParsedEntry> {
    let mut entries = Vec::new();
    let mut current_block = String::new();

    for line in text.lines() {
        let trimmed = line.trim();
        // Block separator: line of 8+ dashes or "Local Interface:" starts a new block
        if (trimmed.chars().all(|c| c == '-') && trimmed.len() >= 8)
            || (trimmed.starts_with("Local Interface") && !current_block.is_empty())
        {
            if !current_block.is_empty() {
                process_iosxr_lldp_block(&current_block, &mut entries);
                current_block.clear();
            }
        }
        if !trimmed.is_empty() {
            if !current_block.is_empty() {
                current_block.push('\n');
            }
            current_block.push_str(line);
        }
    }
    if !current_block.is_empty() {
        process_iosxr_lldp_block(&current_block, &mut entries);
    }

    entries
}

fn process_iosxr_lldp_block(block: &str, entries: &mut Vec<RawNeighborParsedEntry>) {
    let mut entry = RawNeighborParsedEntry {
        local_interface: None,
        remote_system_name: None,
        remote_port_id: None,
        remote_chassis_id: None,
        raw_block: block.to_string(),
    };

    for line in block.lines() {
        let line_trimmed = line.trim();
        if let Some((key, val)) = line_trimmed.split_once(':') {
            let key = key.trim();
            let val = val.trim();
            match key {
                "Local Interface" => entry.local_interface = Some(val.to_string()),
                "System Name" => entry.remote_system_name = Some(val.to_string()),
                "Port id" | "Port ID" => entry.remote_port_id = Some(val.to_string()),
                "Chassis id" | "Chassis ID" => entry.remote_chassis_id = Some(val.to_string()),
                _ => {}
            }
        }
    }

    if entry.remote_system_name.is_some() || entry.remote_chassis_id.is_some() {
        entries.push(entry);
    }
}

// =====================================================================
// Parsers — Arista EOS CDP detail
// =====================================================================

fn parse_eos_cdp_detail(text: &str) -> Vec<RawNeighborParsedEntry> {
    let mut entries = Vec::new();
    let mut current_block = String::new();

    for line in text.lines() {
        let trimmed = line.trim();
        // Block separator: line of 4+ dashes
        if trimmed.chars().all(|c| c == '-') && trimmed.len() >= 4 {
            if !current_block.is_empty() {
                process_eos_cdp_block(&current_block, &mut entries);
                current_block.clear();
            }
        } else if !trimmed.is_empty() {
            if !current_block.is_empty() {
                current_block.push('\n');
            }
            current_block.push_str(line);
        }
    }
    if !current_block.is_empty() {
        process_eos_cdp_block(&current_block, &mut entries);
    }

    entries
}

fn process_eos_cdp_block(block: &str, entries: &mut Vec<RawNeighborParsedEntry>) {
    let mut entry = RawNeighborParsedEntry {
        local_interface: None,
        remote_system_name: None,
        remote_port_id: None,
        remote_chassis_id: None,
        raw_block: block.to_string(),
    };

    let mut has_device_id = false;

    for line in block.lines() {
        let line_trimmed = line.trim();
        if let Some((key, val)) = line_trimmed.split_once(':') {
            let key = key.trim();
            let val = val.trim();
            match key {
                "Device ID" => {
                    entry.remote_system_name = Some(val.to_string());
                    has_device_id = true;
                }
                "Interface" => {
                    entry.local_interface = Some(val.to_string());
                }
                "Port ID (outgoing port)" => {
                    entry.remote_port_id = Some(val.to_string());
                }
                _ => {}
            }
        }
    }

    if has_device_id {
        entries.push(entry);
    }
}

// =====================================================================
// Dispatcher
// =====================================================================

pub fn parse_raw_neighbor_output(
    source_kind: RawNeighborSourceKind,
    platform_hint: Option<&str>,
    text: &str,
) -> Vec<RawNeighborParsedEntry> {
    match source_kind {
        RawNeighborSourceKind::Lldp => {
            match platform_hint {
                Some("iosxe") => parse_iosxe_lldp_detail(text),
                Some("eos") => parse_eos_lldp_detail(text),
                Some("nxos") => parse_nxos_lldp_detail(text),
                Some("junos") => parse_junos_lldp_neighbors(text),
                Some("iosxr") => parse_iosxr_lldp_neighbors(text),
                Some("huawei_vrp") | Some("nokia_sros") | Some("fortios") | Some("mikrotik") => Vec::new(),
                None | Some(_) => {
                    // Auto-cascade: try parsers in order, return first non-empty
                    let iosxe_result = parse_iosxe_lldp_detail(text);
                    if !iosxe_result.is_empty() {
                        return iosxe_result;
                    }
                    let eos_result = parse_eos_lldp_detail(text);
                    if !eos_result.is_empty() {
                        return eos_result;
                    }
                    let nxos_result = parse_nxos_lldp_detail(text);
                    if !nxos_result.is_empty() {
                        return nxos_result;
                    }
                    let junos_result = parse_junos_lldp_neighbors(text);
                    if !junos_result.is_empty() {
                        return junos_result;
                    }
                    parse_iosxr_lldp_neighbors(text)
                }
            }
        }
        RawNeighborSourceKind::Cdp => {
            match platform_hint {
                Some("iosxe") => parse_iosxe_cdp_detail(text),
                Some("nxos") => parse_nxos_cdp_detail(text),
                Some("eos") => parse_eos_cdp_detail(text),
                Some(_) => Vec::new(),
                None => {
                    // Auto-cascade: IOS-XE → NX-OS → EOS
                    let iosxe_result = parse_iosxe_cdp_detail(text);
                    if !iosxe_result.is_empty() {
                        return iosxe_result;
                    }
                    let nxos_result = parse_nxos_cdp_detail(text);
                    if !nxos_result.is_empty() {
                        return nxos_result;
                    }
                    parse_eos_cdp_detail(text)
                }
            }
        }
    }
}

// =====================================================================
// Inventory Resolver
// =====================================================================

pub fn resolve_node_id(
    records: &[DiscoveryDeviceRecord],
    needle: &str,
) -> Option<String> {
    let needle_lower = needle.trim().to_lowercase();

    for record in records {
        // Try matching against hostname
        if let Some(hostname) = &record.device_model.identity.hostname {
            if hostname.trim().to_lowercase() == needle_lower {
                return Some(record.id.clone());
            }
        }

        // Try matching against record.id
        if record.id.trim().to_lowercase() == needle_lower {
            return Some(record.id.clone());
        }
    }

    None
}

// =====================================================================
// Import Orchestrator
// =====================================================================

pub fn import_raw_neighbor_output(
    request: &RawNeighborEvidenceImportRequest,
    records: &[DiscoveryDeviceRecord],
    store: &dyn TopologyEvidenceStore,
) -> Result<RawNeighborEvidenceImportResult, TopologyEvidenceStoreError> {
    // Step 1: Resolve local_node
    let local_record_id = resolve_node_id(records, &request.local_node);

    // Step 2: Parse raw text
    let parsed_entries = parse_raw_neighbor_output(request.source_kind, request.platform_hint.as_deref(), &request.raw_text);
    let parsed_entries_total = parsed_entries.len() as u32;

    let mut accepted_evidence = Vec::new();
    let mut rejected_entries = Vec::new();
    let mut unresolved_count = 0u32;

    // Step 3: Handle parse-empty case
    if parsed_entries_total == 0 {
        // Check if this is an unsupported platform
        if let Some(hint) = request.platform_hint.as_deref() {
            if hint == "fortios" || hint == "mikrotik" {
                rejected_entries.push(RawNeighborRejectedEntry {
                    reason: RawNeighborRejectionReason::UnsupportedFormat,
                    detail: format!("Platform '{}' is not supported in V1AQ", hint),
                    raw_block: request.raw_text.chars().take(256).collect(),
                });

                return Ok(RawNeighborEvidenceImportResult {
                    parsed_entries_total,
                    accepted_evidence_count: 0,
                    rejected_count: 1,
                    unresolved_count: 0,
                    stored_evidence_count: 0,
                    evidence_set_id: None,
                    accepted_evidence,
                    rejected_entries,
                });
            }
        }

        rejected_entries.push(RawNeighborRejectedEntry {
            reason: RawNeighborRejectionReason::ParseEmpty,
            detail: "No entries matched the expected format".to_string(),
            raw_block: request.raw_text.chars().take(256).collect(),
        });

        return Ok(RawNeighborEvidenceImportResult {
            parsed_entries_total,
            accepted_evidence_count: 0,
            rejected_count: 1,
            unresolved_count: 0,
            stored_evidence_count: 0,
            evidence_set_id: None,
            accepted_evidence,
            rejected_entries,
        });
    }

    // Step 4: Process each parsed entry
    for entry in parsed_entries {
        // Check for unresolved local
        if local_record_id.is_none() {
            rejected_entries.push(RawNeighborRejectedEntry {
                reason: RawNeighborRejectionReason::UnresolvedLocal,
                detail: format!("Local node '{}' not found in inventory", request.local_node),
                raw_block: entry.raw_block.clone(),
            });
            unresolved_count += 1;
            continue;
        }

        // Check for missing required remote_system_name
        if entry.remote_system_name.is_none() {
            rejected_entries.push(RawNeighborRejectedEntry {
                reason: RawNeighborRejectionReason::MissingRequiredField,
                detail: "Remote system name not found in entry".to_string(),
                raw_block: entry.raw_block.clone(),
            });
            continue;
        }

        let local_id = local_record_id.as_ref().unwrap();
        let remote_name = entry.remote_system_name.as_ref().unwrap();

        // Resolve remote node
        let remote_record_id = resolve_node_id(records, remote_name);
        if remote_record_id.is_none() {
            rejected_entries.push(RawNeighborRejectedEntry {
                reason: RawNeighborRejectionReason::UnresolvedRemote,
                detail: format!("Remote node '{}' not found in inventory", remote_name),
                raw_block: entry.raw_block.clone(),
            });
            unresolved_count += 1;
            continue;
        }

        let remote_id = remote_record_id.unwrap();

        // Check for self-link
        if local_id == &remote_id {
            rejected_entries.push(RawNeighborRejectedEntry {
                reason: RawNeighborRejectionReason::SelfLink,
                detail: format!("Self-link: local '{}' == remote '{}'", local_id, remote_id),
                raw_block: entry.raw_block.clone(),
            });
            continue;
        }

        // Map source_kind
        let source_kind = match request.source_kind {
            RawNeighborSourceKind::Lldp => TopologyAdjacencyFactSourceKind::Lldp,
            RawNeighborSourceKind::Cdp => TopologyAdjacencyFactSourceKind::Cdp,
        };

        // Build source_label
        let source_label = request.source_label.clone().or_else(|| {
            let kind_str = match request.source_kind {
                RawNeighborSourceKind::Lldp => "lldp",
                RawNeighborSourceKind::Cdp => "cdp",
            };
            let platform = request.platform_hint.as_deref().unwrap_or("unknown");
            Some(format!("raw:{}:{}", kind_str, platform))
        });

        // Build evidence
        let evidence = TopologyNeighborEvidence {
            source_kind,
            local_node_id: local_id.clone(),
            local_interface: entry.local_interface.clone(),
            remote_node_id: remote_id,
            remote_interface: entry.remote_port_id.clone(),
            remote_chassis_id: entry.remote_chassis_id.clone(),
            remote_system_name: Some(remote_name.clone()),
            remote_port_id: entry.remote_port_id.clone(),
            source_label,
            evidence_notes: Some(entry.raw_block.chars().take(256).collect()),
        };

        accepted_evidence.push(evidence);
    }

    let accepted_evidence_count = accepted_evidence.len() as u32;
    let rejected_count = rejected_entries.len() as u32;

    // Step 5: Write to store using apply_evidence_import with mode support
    let (stored_evidence_count, evidence_set_id) = if accepted_evidence_count > 0 {
        let mode = request.mode.unwrap_or_default();
        let mutation = apply_evidence_import(
            store,
            &request.environment_id,
            accepted_evidence.clone(),
            mode,
            request.source_label.clone(),
        )?;
        (mutation.final_count, mutation.evidence_set_id)
    } else {
        (0, None)
    };

    Ok(RawNeighborEvidenceImportResult {
        parsed_entries_total,
        accepted_evidence_count,
        rejected_count,
        unresolved_count,
        stored_evidence_count,
        evidence_set_id,
        accepted_evidence,
        rejected_entries,
    })
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engines::network_model::{DeviceModel, DeviceIdentity};
    use std::collections::HashMap;

    // Helper to create a test DiscoveryDeviceRecord
    fn make_record(id: &str, hostname: Option<&str>) -> DiscoveryDeviceRecord {
        DiscoveryDeviceRecord {
            id: id.to_string(),
            environment_id: "test-env".to_string(),
            source_kind: crate::engines::discovery::DiscoveryRecordSourceKind::Manual,
            confidence: None,
            last_seen: None,
            device_model: DeviceModel::minimal(
                DeviceIdentity {
                    hostname: hostname.map(|h| h.to_string()),
                    chassis: None,
                    serial_numbers: vec![],
                    management_ips: vec![],
                    last_change_marker: None,
                },
                Default::default(),
            ),
            source_label: None,
            slice_id: None,
        }
    }

    // Mock store for testing
    struct MockStore {
        data: std::sync::Mutex<HashMap<String, Vec<TopologyNeighborEvidence>>>,
    }

    impl MockStore {
        fn new() -> Self {
            MockStore {
                data: std::sync::Mutex::new(HashMap::new()),
            }
        }
    }

    impl TopologyEvidenceStore for MockStore {
        fn load(&self, environment_id: &str) -> Vec<TopologyNeighborEvidence> {
            self.data
                .lock()
                .unwrap()
                .get(environment_id)
                .cloned()
                .unwrap_or_default()
        }

        fn store(
            &self,
            environment_id: &str,
            evidence: Vec<TopologyNeighborEvidence>,
            source_label: Option<String>,
        ) -> Result<crate::engines::topology_evidence_store::TopologyEvidenceSet, TopologyEvidenceStoreError> {
            let evidence_count = evidence.len() as u32;
            let evidence_set_id = format!("evset-{}-test", environment_id);
            self.data.lock().unwrap().insert(environment_id.to_string(), evidence.clone());
            Ok(crate::engines::topology_evidence_store::TopologyEvidenceSet {
                schema_version: "v1".to_string(),
                environment_id: environment_id.to_string(),
                evidence_set_id,
                source_label,
                evidence_count,
                evidence,
            })
        }

        fn clear(&self, environment_id: &str) -> Result<(), TopologyEvidenceStoreError> {
            self.data.lock().unwrap().remove(environment_id);
            Ok(())
        }
    }

    #[test]
    fn parse_iosxe_lldp_detail_basic() {
        let text = r#"Local Intf: Gi0/1
System Name: router-b
Port id: Gi0/2
Chassis id: 00:11:22:33:44:55

------------------------------------------------

Local Intf: Gi0/3
System Name: router-c
Port id: Gi0/4
Chassis id: aa:bb:cc:dd:ee:ff"#;

        let entries = parse_iosxe_lldp_detail(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].local_interface, Some("Gi0/1".to_string()));
        assert_eq!(entries[0].remote_system_name, Some("router-b".to_string()));
        assert_eq!(entries[0].remote_port_id, Some("Gi0/2".to_string()));
        assert_eq!(entries[1].local_interface, Some("Gi0/3".to_string()));
        assert_eq!(entries[1].remote_system_name, Some("router-c".to_string()));
    }

    #[test]
    fn parse_iosxe_cdp_detail_basic() {
        let text = r#"Device ID: router-b.example.com
Interface: Gi0/1, Port ID (outgoing port): Gi0/2
Platform: cisco WS-C2960

-------------------------

Device ID: router-c
Interface: Gi0/3, Port ID (outgoing port): Gi0/4"#;

        let entries = parse_iosxe_cdp_detail(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].remote_system_name, Some("router-b.example.com".to_string()));
        assert_eq!(entries[0].local_interface, Some("Gi0/1".to_string()));
        assert_eq!(entries[0].remote_port_id, Some("Gi0/2".to_string()));
        assert_eq!(entries[1].remote_system_name, Some("router-c".to_string()));
    }

    #[test]
    fn parse_eos_lldp_detail_basic() {
        let text = r#"Interface Ethernet1 detected 1 LLDP neighbors:
  Neighbor Device ID: router-b
  Neighbor Port ID: Ethernet2
  Neighbor Chassis ID: 00:11:22:33:44:55

Interface Ethernet3 detected 1 LLDP neighbors:
  Neighbor Device ID: router-c
  Neighbor Port ID: Ethernet4"#;

        let entries = parse_eos_lldp_detail(text);
        assert!(entries.len() >= 1);
        assert_eq!(entries[0].local_interface, Some("Ethernet1".to_string()));
        assert_eq!(entries[0].remote_system_name, Some("router-b".to_string()));
        assert_eq!(entries[0].remote_port_id, Some("Ethernet2".to_string()));
    }

    #[test]
    fn parse_returns_empty_on_unrelated_text() {
        let text = "hello world this is not a valid LLDP or CDP output";
        let lldp_entries = parse_iosxe_lldp_detail(text);
        let cdp_entries = parse_iosxe_cdp_detail(text);
        assert_eq!(lldp_entries.len(), 0);
        assert_eq!(cdp_entries.len(), 0);
    }

    #[test]
    fn parse_lldp_skips_blocks_without_identity() {
        let text = r#"Local Intf: Gi0/1
Port id: Gi0/2

------------------------------------------------

Local Intf: Gi0/3
System Name: router-c
Port id: Gi0/4"#;

        let entries = parse_iosxe_lldp_detail(text);
        // First block has no System Name or Chassis ID, should be skipped
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].remote_system_name, Some("router-c".to_string()));
    }

    #[test]
    fn resolve_node_id_exact_hostname_match() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let result = resolve_node_id(&records, "ROUTER-A");
        assert_eq!(result, Some("rec-1".to_string()));
    }

    #[test]
    fn resolve_node_id_exact_record_id_match() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let result = resolve_node_id(&records, "rec-2");
        assert_eq!(result, Some("rec-2".to_string()));
    }

    #[test]
    fn resolve_node_id_no_match_returns_none() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let result = resolve_node_id(&records, "router-zzz");
        assert_eq!(result, None);
    }

    #[test]
    fn resolve_node_id_no_substring_match() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let result = resolve_node_id(&records, "router-a-extra");
        assert_eq!(result, None);
    }

    #[test]
    fn import_iosxe_lldp_accepts_known_remote_writes_to_store() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let text = r#"Local Intf: Gi0/1
System Name: router-b
Port id: Gi0/2
Chassis id: 00:11:22:33:44:55"#;

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: None,
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result = import_raw_neighbor_output(&request, &records, &store).unwrap();

        assert_eq!(result.parsed_entries_total, 1);
        assert_eq!(result.accepted_evidence_count, 1);
        assert_eq!(result.rejected_count, 0);
        assert_eq!(result.stored_evidence_count, 1);
        assert!(result.evidence_set_id.is_some());

        // Verify store was written
        let stored = store.load("test-env");
        assert_eq!(stored.len(), 1);
    }

    #[test]
    fn import_unresolved_remote_rejected() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let text = r#"Local Intf: Gi0/1
System Name: router-zzz
Port id: Gi0/2"#;

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: None,
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result = import_raw_neighbor_output(&request, &records, &store).unwrap();

        assert_eq!(result.accepted_evidence_count, 0);
        assert_eq!(result.rejected_count, 1);
        assert_eq!(result.unresolved_count, 1);
        assert_eq!(result.stored_evidence_count, 0);
        assert!(result.evidence_set_id.is_none());

        // Verify store was NOT written
        let stored = store.load("test-env");
        assert_eq!(stored.len(), 0);
    }

    #[test]
    fn import_unresolved_local_rejected() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let text = r#"Local Intf: Gi0/1
System Name: router-b
Port id: Gi0/2"#;

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "ghost-node".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: None,
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result = import_raw_neighbor_output(&request, &records, &store).unwrap();

        assert_eq!(result.accepted_evidence_count, 0);
        assert_eq!(result.rejected_count, 1);
        assert_eq!(result.unresolved_count, 1);
    }

    #[test]
    fn import_self_link_rejected() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let text = r#"Local Intf: Gi0/1
System Name: router-a
Port id: Gi0/2"#;

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: None,
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result = import_raw_neighbor_output(&request, &records, &store).unwrap();

        assert_eq!(result.accepted_evidence_count, 0);
        assert_eq!(result.rejected_count, 1);
        assert_eq!(result.rejected_entries[0].reason, RawNeighborRejectionReason::SelfLink);
    }

    #[test]
    fn import_malformed_text_returns_parse_empty() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let text = "blah blah this is not valid";

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: None,
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result = import_raw_neighbor_output(&request, &records, &store).unwrap();

        assert_eq!(result.parsed_entries_total, 0);
        assert_eq!(result.accepted_evidence_count, 0);
        assert_eq!(result.rejected_count, 1);
        assert_eq!(result.rejected_entries[0].reason, RawNeighborRejectionReason::ParseEmpty);
    }

    #[test]
    fn import_replace_semantics_does_not_accumulate() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
            make_record("rec-3", Some("router-c")),
        ];

        // Round 1: import 2 evidence
        let text1 = r#"Local Intf: Gi0/1
System Name: router-b
Port id: Gi0/2

------------------------------------------------

Local Intf: Gi0/3
System Name: router-c
Port id: Gi0/4"#;

        let request1 = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: None,
            raw_text: text1.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result1 = import_raw_neighbor_output(&request1, &records, &store).unwrap();
        assert_eq!(result1.stored_evidence_count, 2);

        // Round 2: import 1 different evidence (should replace, not accumulate)
        let text2 = r#"Local Intf: Gi0/1
System Name: router-c
Port id: Gi0/2"#;

        let request2 = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: None,
            raw_text: text2.to_string(),
            source_label: None,
            mode: None,
        };

        let result2 = import_raw_neighbor_output(&request2, &records, &store).unwrap();
        assert_eq!(result2.stored_evidence_count, 1);

        // Verify store contains exactly 1 evidence, not 3
        let stored = store.load("test-env");
        assert_eq!(stored.len(), 1);
    }

    #[test]
    fn import_environment_isolation() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("router-b")),
        ];

        let text = r#"Local Intf: Gi0/1
System Name: router-b
Port id: Gi0/2"#;

        let request_a = RawNeighborEvidenceImportRequest {
            environment_id: "env-a".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: None,
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let _ = import_raw_neighbor_output(&request_a, &records, &store).unwrap();

        // Load from env_b (should be empty)
        let stored_b = store.load("env-b");
        assert_eq!(stored_b.len(), 0);
    }

    // ──── V1AQ — Vendor Coverage Expansion Tests ────

    #[test]
    fn parse_nxos_lldp_detail_basic() {
        let text = r#"Chassis id: 00aa.bbcc.ddee
Port id: Eth1/1
Local Port id: Ethernet1/2
Port Description: <none>
System Name: nxos-switch-b
System Description: Cisco NX-OS

========================================

Chassis id: aabb.ccdd.eeff
Port id: Eth2/1
Local Port id: Ethernet2/2
System Name: nxos-switch-c"#;

        let entries = parse_nxos_lldp_detail(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].local_interface, Some("Ethernet1/2".to_string()));
        assert_eq!(entries[0].remote_system_name, Some("nxos-switch-b".to_string()));
        assert_eq!(entries[0].remote_chassis_id, Some("00aa.bbcc.ddee".to_string()));
        assert_eq!(entries[1].remote_system_name, Some("nxos-switch-c".to_string()));
    }

    #[test]
    fn parse_nxos_lldp_skips_blocks_without_identity() {
        let text = r#"Port id: Eth1/1
Local Port id: Ethernet1/2

========================================

System Name: nxos-switch-b
Port id: Eth2/1
Chassis id: aabb.ccdd.eeff"#;

        let entries = parse_nxos_lldp_detail(text);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].remote_system_name, Some("nxos-switch-b".to_string()));
    }

    #[test]
    fn parse_nxos_cdp_detail_basic() {
        let text = r#"Device ID: nxos-switch-b
Interface: Ethernet1/2
Port ID (outgoing port): Ethernet1/1
Platform: cisco Nexus7000

----

Device ID: nxos-switch-c
Interface: Ethernet2/2
Port ID (outgoing port): Ethernet2/1"#;

        let entries = parse_nxos_cdp_detail(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].remote_system_name, Some("nxos-switch-b".to_string()));
        assert_eq!(entries[0].local_interface, Some("Ethernet1/2".to_string()));
        assert_eq!(entries[0].remote_port_id, Some("Ethernet1/1".to_string()));
    }

    #[test]
    fn parse_junos_lldp_neighbors_basic_terse_table() {
        let text = r#"Local Interface    Parent Interface  Chassis Id          Port info          System Name
ge-0/0/0           -                 00:11:22:33:44:55   ge-0/0/1           router-b
ge-0/0/1           -                 aa:bb:cc:dd:ee:ff   xe-2/0/0           router-c"#;

        let entries = parse_junos_lldp_neighbors(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].local_interface, Some("ge-0/0/0".to_string()));
        assert_eq!(entries[0].remote_chassis_id, Some("00:11:22:33:44:55".to_string()));
        assert_eq!(entries[0].remote_port_id, Some("ge-0/0/1".to_string()));
        assert_eq!(entries[0].remote_system_name, Some("router-b".to_string()));
        assert_eq!(entries[1].remote_system_name, Some("router-c".to_string()));
    }

    #[test]
    fn parse_junos_lldp_skips_header_line() {
        let text = r#"Local Interface    Parent Interface  Chassis Id          Port info          System Name
ge-0/0/0           -                 00:11:22:33:44:55   ge-0/0/1           router-b"#;

        let entries = parse_junos_lldp_neighbors(text);
        // Should have exactly 1 entry (header not counted)
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].remote_system_name, Some("router-b".to_string()));
    }

    #[test]
    fn parse_iosxr_lldp_neighbors_basic() {
        let text = r#"Local Interface: GigabitEthernet0/0/0/1
Chassis id: 0011.2233.4455
Port id: GigabitEthernet0/0/0/2
Port Description: uplink
System Name: iosxr-b
System Description: Cisco IOS-XR

------------------------------------------------

Local Interface: GigabitEthernet0/0/0/3
Chassis id: aabb.ccdd.eeff
Port id: GigabitEthernet0/0/0/4
System Name: iosxr-c"#;

        let entries = parse_iosxr_lldp_neighbors(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].local_interface, Some("GigabitEthernet0/0/0/1".to_string()));
        assert_eq!(entries[0].remote_system_name, Some("iosxr-b".to_string()));
        assert_eq!(entries[0].remote_chassis_id, Some("0011.2233.4455".to_string()));
    }

    #[test]
    fn parse_eos_cdp_detail_basic() {
        let text = r#"Device ID: eos-switch-b
Interface: Ethernet1
Port ID (outgoing port): Ethernet2
Platform: Arista EOS

----

Device ID: eos-switch-c
Interface: Ethernet3
Port ID (outgoing port): Ethernet4"#;

        let entries = parse_eos_cdp_detail(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].remote_system_name, Some("eos-switch-b".to_string()));
        assert_eq!(entries[0].local_interface, Some("Ethernet1".to_string()));
        assert_eq!(entries[0].remote_port_id, Some("Ethernet2".to_string()));
    }

    #[test]
    fn dispatcher_routes_by_platform_hint_lldp() {
        let iosxe_text = r#"Local Intf: Gi0/1
System Name: router-b
Port id: Gi0/2
Chassis id: 00:11:22:33:44:55"#;

        let eos_text = r#"Interface Ethernet1 detected 1 LLDP neighbors:
  Neighbor Device ID: router-b
  Neighbor Port ID: Ethernet2"#;

        let nxos_text = r#"System Name: nxos-b
Chassis id: 00aa.bbcc.ddee
Local Port id: Ethernet1/2
Port id: Eth1/1"#;

        // IOS-XE hint
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Lldp, Some("iosxe"), iosxe_text);
        assert!(!result.is_empty());
        assert_eq!(result[0].remote_system_name, Some("router-b".to_string()));

        // EOS hint
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Lldp, Some("eos"), eos_text);
        assert!(!result.is_empty());
        assert_eq!(result[0].remote_system_name, Some("router-b".to_string()));

        // NX-OS hint
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Lldp, Some("nxos"), nxos_text);
        assert!(!result.is_empty());
        assert_eq!(result[0].remote_system_name, Some("nxos-b".to_string()));
    }

    #[test]
    fn dispatcher_routes_by_platform_hint_cdp() {
        let iosxe_text = r#"Device ID: router-b
Interface: Gi0/1, Port ID (outgoing port): Gi0/2"#;

        let nxos_text = r#"Device ID: nxos-b
Interface: Ethernet1/2
Port ID (outgoing port): Ethernet1/1"#;

        // IOS-XE hint
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Cdp, Some("iosxe"), iosxe_text);
        assert!(!result.is_empty());
        assert_eq!(result[0].remote_system_name, Some("router-b".to_string()));

        // NX-OS hint
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Cdp, Some("nxos"), nxos_text);
        assert!(!result.is_empty());
        assert_eq!(result[0].remote_system_name, Some("nxos-b".to_string()));
    }

    #[test]
    fn dispatcher_fortios_returns_empty() {
        let text = "some fortios output";
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Lldp, Some("fortios"), text);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn dispatcher_mikrotik_returns_empty() {
        let text = "some mikrotik output";
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Lldp, Some("mikrotik"), text);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn dispatcher_unknown_cdp_platform_returns_empty() {
        let text = "some unknown cdp output";
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Cdp, Some("unknown_platform"), text);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn dispatcher_lldp_auto_cascade_picks_first_match() {
        let iosxe_text = r#"Local Intf: Gi0/1
System Name: router-b
Port id: Gi0/2
Chassis id: 00:11:22:33:44:55"#;

        // No hint: should cascade and pick IOS-XE parser
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Lldp, None, iosxe_text);
        assert!(!result.is_empty());
        assert_eq!(result[0].remote_system_name, Some("router-b".to_string()));
    }

    #[test]
    fn dispatcher_cdp_auto_cascade_picks_first_match() {
        let iosxe_text = r#"Device ID: router-b
Interface: Gi0/1, Port ID (outgoing port): Gi0/2"#;

        // No hint: should cascade and pick IOS-XE parser
        let result = parse_raw_neighbor_output(RawNeighborSourceKind::Cdp, None, iosxe_text);
        assert!(!result.is_empty());
        assert_eq!(result[0].remote_system_name, Some("router-b".to_string()));
    }

    #[test]
    fn import_nxos_lldp_writes_to_store() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
            make_record("rec-2", Some("nxos-b")),
            make_record("rec-3", Some("nxos-c")),
        ];

        let text = r#"Chassis id: 00aa.bbcc.ddee
System Name: nxos-b
Local Port id: Ethernet1/2
Port id: Eth1/1

========================================

Chassis id: aabb.ccdd.eeff
System Name: nxos-c
Local Port id: Ethernet2/2
Port id: Eth2/1"#;

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: Some("nxos".to_string()),
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result = import_raw_neighbor_output(&request, &records, &store).unwrap();

        assert_eq!(result.parsed_entries_total, 2);
        assert_eq!(result.accepted_evidence_count, 2);
        assert_eq!(result.rejected_count, 0);
        assert_eq!(result.stored_evidence_count, 2);

        let stored = store.load("test-env");
        assert_eq!(stored.len(), 2);
    }

    #[test]
    fn import_unsupported_fortios_emits_unsupported_format_rejection() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
        ];

        let text = "FortiOS neighbor output";

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: Some("fortios".to_string()),
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result = import_raw_neighbor_output(&request, &records, &store).unwrap();

        assert_eq!(result.accepted_evidence_count, 0);
        assert_eq!(result.rejected_count, 1);
        assert_eq!(result.rejected_entries[0].reason, RawNeighborRejectionReason::UnsupportedFormat);
        assert!(result.rejected_entries[0].detail.contains("fortios"));
        assert_eq!(result.stored_evidence_count, 0);

        let stored = store.load("test-env");
        assert_eq!(stored.len(), 0);
    }

    #[test]
    fn import_unsupported_mikrotik_emits_unsupported_format_rejection() {
        let records = vec![
            make_record("rec-1", Some("router-a")),
        ];

        let text = "MikroTik neighbor output";

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "test-env".to_string(),
            local_node: "router-a".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: Some("mikrotik".to_string()),
            raw_text: text.to_string(),
            source_label: None,
            mode: None,
        };

        let store = MockStore::new();
        let result = import_raw_neighbor_output(&request, &records, &store).unwrap();

        assert_eq!(result.accepted_evidence_count, 0);
        assert_eq!(result.rejected_count, 1);
        assert_eq!(result.rejected_entries[0].reason, RawNeighborRejectionReason::UnsupportedFormat);
        assert!(result.rejected_entries[0].detail.contains("mikrotik"));
        assert_eq!(result.stored_evidence_count, 0);
    }

    // ──── V1AR — Import mode and merge semantics tests ────

    #[test]
    fn raw_import_with_mode_append_threads_through_apply() {
        use tempfile::TempDir;
        let temp_dir = TempDir::new().expect("temp dir");
        let store = crate::engines::topology_evidence_store::JsonFileTopologyEvidenceStore::new(
            temp_dir.path().to_path_buf(),
        );

        // Pre-populate store with one evidence
        let pre_existing = vec![TopologyNeighborEvidence {
            source_kind: TopologyAdjacencyFactSourceKind::Lldp,
            local_node_id: "device-1".to_string(),
            local_interface: None,
            remote_node_id: "device-2".to_string(),
            remote_interface: None,
            remote_chassis_id: None,
            remote_system_name: Some("router-2".to_string()),
            remote_port_id: None,
            source_label: None,
            evidence_notes: None,
        }];
        let _ = store.store("env-test", pre_existing, None);

        let records = vec![
            make_record("device-1", Some("router-1")),
            make_record("device-2", Some("router-2")),
        ];

        // LLDP text for iosxe parser (cisco iosxe lldp detail format with separator)
        let lldp_text = "Local Intf: Gi0/1\nSystem Name: router-2\nPort id: Gi0/2\n\nChassis id: aabbccddeeff";
        let request = RawNeighborEvidenceImportRequest {
            environment_id: "env-test".to_string(),
            local_node: "router-1".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: Some("iosxe".to_string()),
            raw_text: lldp_text.to_string(),
            source_label: None,
            mode: Some(TopologyEvidenceImportMode::Append),
        };

        let result = import_raw_neighbor_output(&request, &records, &store)
            .expect("import should succeed");

        // Should append, so final count = 1 (pre-existing) + 1 (new) = 2
        assert_eq!(result.accepted_evidence_count, 1);
        assert_eq!(result.stored_evidence_count, 2);
    }

    #[test]
    fn raw_import_with_mode_merge_dedup_via_apply() {
        // Test merge dedup at the apply_evidence_import level, not through raw orchestrator.
        // This isolates the mode threading logic from parser complexity.
        use crate::engines::topology_evidence_store::{merge_topology_evidence, apply_evidence_import};
        use tempfile::TempDir;
        let temp_dir = TempDir::new().expect("temp dir");
        let store = crate::engines::topology_evidence_store::JsonFileTopologyEvidenceStore::new(
            temp_dir.path().to_path_buf(),
        );

        // Pre-populate with one LLDP link
        let pre_existing = vec![TopologyNeighborEvidence {
            source_kind: TopologyAdjacencyFactSourceKind::Lldp,
            local_node_id: "device-1".to_string(),
            local_interface: Some("Gi0/1".to_string()),
            remote_node_id: "device-2".to_string(),
            remote_interface: None,
            remote_chassis_id: Some("aabbccdd".to_string()),
            remote_system_name: Some("router-2".to_string()),
            remote_port_id: Some("Gi0/2".to_string()),
            source_label: Some("lldp-old".to_string()),
            evidence_notes: None,
        }];
        let _ = store.store("env-test", pre_existing, None);

        // Incoming with same 5-tuple but different metadata
        let incoming = vec![TopologyNeighborEvidence {
            source_kind: TopologyAdjacencyFactSourceKind::Lldp,
            local_node_id: "device-1".to_string(),
            local_interface: Some("Gi0/1".to_string()),
            remote_node_id: "device-2".to_string(),
            remote_interface: None,
            remote_chassis_id: Some("eeff0011".to_string()),  // Different chassis
            remote_system_name: Some("router-2".to_string()),
            remote_port_id: Some("Gi0/2".to_string()),
            source_label: Some("lldp-new".to_string()),
            evidence_notes: None,
        }];

        // Apply with Merge mode
        let result = apply_evidence_import(
            &store,
            "env-test",
            incoming,
            crate::engines::topology_evidence_store::TopologyEvidenceImportMode::Merge,
            None,
        ).expect("apply should succeed");

        // Should merge, not add: final count = 1, ignored_duplicate_count = 1
        assert_eq!(result.final_count, 1);
        assert_eq!(result.ignored_duplicate_count, 1);
    }

    #[test]
    fn raw_import_with_no_mode_defaults_to_replace() {
        use tempfile::TempDir;
        let temp_dir = TempDir::new().expect("temp dir");
        let store = crate::engines::topology_evidence_store::JsonFileTopologyEvidenceStore::new(
            temp_dir.path().to_path_buf(),
        );

        // Pre-populate with old data
        let pre_existing = vec![
            TopologyNeighborEvidence {
                source_kind: TopologyAdjacencyFactSourceKind::Lldp,
                local_node_id: "device-1".to_string(),
                local_interface: None,
                remote_node_id: "device-2".to_string(),
                remote_interface: None,
                remote_chassis_id: None,
                remote_system_name: Some("router-2".to_string()),
                remote_port_id: None,
                source_label: None,
                evidence_notes: None,
            },
            TopologyNeighborEvidence {
                source_kind: TopologyAdjacencyFactSourceKind::Lldp,
                local_node_id: "device-1".to_string(),
                local_interface: None,
                remote_node_id: "device-3".to_string(),
                remote_interface: None,
                remote_chassis_id: None,
                remote_system_name: Some("router-3".to_string()),
                remote_port_id: None,
                source_label: None,
                evidence_notes: None,
            },
        ];
        let _ = store.store("env-test", pre_existing, None);

        let records = vec![
            make_record("device-1", Some("router-1")),
            make_record("device-2", Some("router-2")),
        ];

        // New LLDP import with just one device
        let lldp_text = "Local Intf: Gi0/1\nSystem Name: router-2\nPort id: Gi0/2\nChassis id: aabbccdd";
        let request = RawNeighborEvidenceImportRequest {
            environment_id: "env-test".to_string(),
            local_node: "router-1".to_string(),
            source_kind: RawNeighborSourceKind::Lldp,
            platform_hint: Some("iosxe".to_string()),
            raw_text: lldp_text.to_string(),
            source_label: None,
            mode: None,  // No mode specified → should default to Replace
        };

        let result = import_raw_neighbor_output(&request, &records, &store)
            .expect("import should succeed");

        // Replace mode: final count = 1 (just the new one, old 2 are replaced)
        assert_eq!(result.accepted_evidence_count, 1);
        assert_eq!(result.stored_evidence_count, 1);
    }

    #[test]
    fn raw_import_zero_accepted_no_store_mutation_regardless_of_mode() {
        let store = crate::engines::topology_evidence_store::NullTopologyEvidenceStore;
        // Pre-populate
        let pre_existing = vec![TopologyNeighborEvidence {
            source_kind: TopologyAdjacencyFactSourceKind::Lldp,
            local_node_id: "device-1".to_string(),
            local_interface: None,
            remote_node_id: "device-2".to_string(),
            remote_interface: None,
            remote_chassis_id: None,
            remote_system_name: Some("router-2".to_string()),
            remote_port_id: None,
            source_label: None,
            evidence_notes: None,
        }];
        let _ = store.store("env-test", pre_existing, None);

        let records = vec![
            make_record("device-1", Some("router-1")),
            // Note: device-2 NOT in records, so remote resolution will fail
        ];

        let request = RawNeighborEvidenceImportRequest {
            environment_id: "env-test".to_string(),
            local_node: "router-1".to_string(),
            source_kind: RawNeighborSourceKind::Cdp,
            platform_hint: Some("ios".to_string()),
            raw_text: "Device ID: router-2\nInterface: Gi0/1, Port ID (outgoing port): Gi0/2".to_string(),
            source_label: None,
            mode: Some(TopologyEvidenceImportMode::Merge),  // Even with Merge mode
        };

        let result = import_raw_neighbor_output(&request, &records, &store)
            .expect("import should succeed");

        // Zero accepted → no store mutation (V1AP safety guard).
        // stored_evidence_count should be 0, not the pre-existing count.
        assert_eq!(result.accepted_evidence_count, 0);
        assert_eq!(result.rejected_count, 1);
        assert_eq!(result.stored_evidence_count, 0);
    }
}
