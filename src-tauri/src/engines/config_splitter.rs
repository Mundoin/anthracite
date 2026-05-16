//! Config Splitter Engine — V1O-A.
//!
//! Deterministic device-boundary detection over raw config text. Runs
//! BEFORE detection / parse / receipt. Produces text slices with line
//! ranges and provenance metadata. Does not parse, does not detect, does
//! not model.
//!
//! Boundary (per `CONFIG_SPLITTER_CONTRACT.md`):
//!   - Owns:    boundary heuristics, slice id assignment, splitter
//!              warnings, line ranges, confidence per slice.
//!   - Does NOT own: parsing, vendor detection, model population,
//!                   topology, validation, findings.
//!
//! Doctrine: deterministic, no LLM, no randomness, no timestamps. Same
//! bytes in → byte-identical output across runs. Conservative —
//! ambiguity is honest, false-positive splits are not.

use serde::{Deserialize, Serialize};

/// Splitter contract version. Mirrors `_manifest.toml::splitter_version`.
/// Bump whenever the splitter could produce a different
/// `ConfigBatchSplitResult` for any existing fixture. See
/// `docs/architecture/CONFIG_SPLITTER_CONTRACT.md` for the bump policy.
pub const SPLITTER_VERSION: u32 = 1;

/// Hard cap on lines scanned. Inputs beyond this are truncated and an
/// `InputTruncated` warning is emitted. Keeps the splitter bounded on
/// abnormally large pastes.
const MAX_LINES_SCANNED: usize = 100_000;

/// Hard cap on slices produced. Inputs that would exceed this are
/// truncated at the cap and an `UnusuallyLargeBatch` warning is emitted.
const MAX_SLICES: usize = 256;

/// A slice with confidence at or below this is considered low-confidence;
/// the splitter emits a per-slice `LowConfidenceSplit` warning.
const LOW_CONFIDENCE_THRESHOLD: f32 = 0.5;

// =====================================================================
// Public result types
// =====================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct ConfigBatchSplitResult {
    pub slices: Vec<ConfigSlice>,
    pub method: SplitMethod,
    pub warnings: Vec<BatchWarning>,
    pub total_line_count: u64,
    pub scanned_line_count: u64,
    pub splitter_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct ConfigSlice {
    pub slice_id: String,
    pub line_start: u64,
    pub line_end: u64,
    pub raw_text: String,
    pub confidence: f32,
    pub hint: SliceHint,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SplitMethod {
    ExplicitSeparator { pattern: String },
    Heuristic,
    SingleConfig,
    NoSplitPossible,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SliceHint {
    None,
    HostnamePresent { hostname: String },
    VendorHeaderDetected { header: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum BatchWarning {
    EmptyInput,
    WhitespaceOnly,
    InputTruncated { scanned: u64, total: u64 },
    NoSplitPossible,
    NoSeparatorsFound,
    AmbiguousBoundary { near_line: u64 },
    EmptySliceProduced { slice_id: String },
    LowConfidenceSplit { slice_id: String },
    UnusuallyLargeBatch { device_count: u64 },
}

// =====================================================================
// Engine entry point
// =====================================================================

pub fn split_config_batch(config_text: &str) -> ConfigBatchSplitResult {
    let mut warnings: Vec<BatchWarning> = Vec::new();
    let splitter_version = SPLITTER_VERSION.to_string();

    // Empty / whitespace-only short circuit.
    if config_text.is_empty() {
        warnings.push(BatchWarning::EmptyInput);
        return ConfigBatchSplitResult {
            slices: Vec::new(),
            method: SplitMethod::NoSplitPossible,
            warnings,
            total_line_count: 0,
            scanned_line_count: 0,
            splitter_version,
        };
    }
    if config_text.trim().is_empty() {
        warnings.push(BatchWarning::WhitespaceOnly);
        let total = config_text.lines().count() as u64;
        return ConfigBatchSplitResult {
            slices: Vec::new(),
            method: SplitMethod::NoSplitPossible,
            warnings,
            total_line_count: total,
            scanned_line_count: total,
            splitter_version,
        };
    }

    let all_lines: Vec<&str> = config_text.lines().collect();
    let total_line_count = all_lines.len() as u64;
    let lines: Vec<&str> = all_lines
        .iter()
        .take(MAX_LINES_SCANNED)
        .copied()
        .collect();
    let scanned_line_count = lines.len() as u64;
    if total_line_count > MAX_LINES_SCANNED as u64 {
        warnings.push(BatchWarning::InputTruncated {
            scanned: scanned_line_count,
            total: total_line_count,
        });
    }

    // Pass 1: explicit separators.
    let separators = scan_explicit_separators(&lines);
    if !separators.is_empty() {
        let (mut slices, mut s_warnings) = build_explicit_slices(&lines, &separators);
        finalize_caps(&mut slices, &mut s_warnings);
        emit_low_confidence_warnings(&slices, &mut s_warnings);
        warnings.extend(s_warnings);
        let pattern = separators.first().map(|s| s.pattern_label.to_string()).unwrap_or_default();
        return ConfigBatchSplitResult {
            slices,
            method: SplitMethod::ExplicitSeparator { pattern },
            warnings,
            total_line_count,
            scanned_line_count,
            splitter_version,
        };
    }

    // Pass 2: heuristic boundary detection.
    let boundaries = scan_heuristic_boundaries(&lines);
    if !boundaries.is_empty() {
        let (mut slices, mut s_warnings) = build_heuristic_slices(&lines, &boundaries);
        finalize_caps(&mut slices, &mut s_warnings);
        emit_low_confidence_warnings(&slices, &mut s_warnings);
        for b in &boundaries {
            if b.confidence < 0.6 {
                s_warnings.push(BatchWarning::AmbiguousBoundary {
                    near_line: b.line_number,
                });
            }
        }
        warnings.extend(s_warnings);
        return ConfigBatchSplitResult {
            slices,
            method: SplitMethod::Heuristic,
            warnings,
            total_line_count,
            scanned_line_count,
            splitter_version,
        };
    }

    // Pass 3: no-split fallback — single config.
    let hint = first_hostname(&lines)
        .map(|h| SliceHint::HostnamePresent { hostname: h })
        .unwrap_or(SliceHint::None);
    let single = ConfigSlice {
        slice_id: slice_id(0),
        line_start: 1,
        line_end: scanned_line_count,
        raw_text: rejoin(&lines),
        confidence: 1.0,
        hint,
    };
    // SingleConfig is the legitimate happy-path fallback — no extra
    // warning. `NoSeparatorsFound` stays in the warning vocabulary for
    // future explicit-only modes; not emitted on the trivial path.
    ConfigBatchSplitResult {
        slices: vec![single],
        method: SplitMethod::SingleConfig,
        warnings,
        total_line_count,
        scanned_line_count,
        splitter_version,
    }
}

// =====================================================================
// Pass 1 — explicit separator scan
// =====================================================================

#[derive(Debug, Clone)]
struct ExplicitSeparator {
    line_idx: usize, // 0-based index into `lines`
    hostname: Option<String>,
    pattern_label: &'static str,
}

/// Recognised explicit-separator vocabulary (documented in
/// `CONFIG_SPLITTER_CONTRACT.md`). Case-insensitive on the "device" /
/// "hostname" keywords; whitespace tolerant.
fn scan_explicit_separators(lines: &[&str]) -> Vec<ExplicitSeparator> {
    let mut out: Vec<ExplicitSeparator> = Vec::new();
    for (idx, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if let Some(host) = match_hash_device_separator(trimmed) {
            out.push(ExplicitSeparator {
                line_idx: idx,
                hostname: host,
                pattern_label: "hash-device",
            });
            continue;
        }
        if let Some(host) = match_banner_equals_separator(trimmed) {
            out.push(ExplicitSeparator {
                line_idx: idx,
                hostname: host,
                pattern_label: "banner-equals",
            });
            continue;
        }
        if let Some(host) = match_script_hostname_header(trimmed) {
            out.push(ExplicitSeparator {
                line_idx: idx,
                hostname: host,
                pattern_label: "script-hostname",
            });
            continue;
        }
    }
    out
}

/// `### device: hostname ###` (hash count ≥ 3 on both sides;
/// case-insensitive on "device"; colon optional; hostname required).
fn match_hash_device_separator(trimmed: &str) -> Option<Option<String>> {
    if !trimmed.starts_with("###") || !trimmed.ends_with("###") {
        return None;
    }
    let inner = trimmed.trim_start_matches('#').trim_end_matches('#').trim();
    let lowered = inner.to_ascii_lowercase();
    let prefix = if let Some(rest) = lowered.strip_prefix("device:") {
        rest.len()
    } else if let Some(rest) = lowered.strip_prefix("device") {
        rest.len()
    } else {
        return None;
    };
    let after_keyword = &inner[inner.len() - prefix..];
    let host = after_keyword
        .trim()
        .split_whitespace()
        .next()
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty());
    Some(host)
}

/// `! ===== hostname =====` (leading `!` optional; equals run ≥ 3 on
/// both sides; hostname optional but expected).
fn match_banner_equals_separator(trimmed: &str) -> Option<Option<String>> {
    let after_bang = trimmed.strip_prefix('!').map(str::trim_start).unwrap_or(trimmed);
    if !after_bang.starts_with("===") || !after_bang.ends_with("===") {
        return None;
    }
    let inner = after_bang.trim_start_matches('=').trim_end_matches('=').trim();
    if inner.is_empty() {
        return Some(None);
    }
    let host = inner.split_whitespace().next().map(|s| s.to_string());
    Some(host)
}

/// `# hostname: xyz` (script-style header; hostname required).
fn match_script_hostname_header(trimmed: &str) -> Option<Option<String>> {
    let after_hash = trimmed.strip_prefix('#')?.trim_start();
    let lowered_prefix = after_hash.to_ascii_lowercase();
    let payload = if let Some(rest) = lowered_prefix.strip_prefix("hostname:") {
        Some(&after_hash[after_hash.len() - rest.len()..])
    } else if let Some(rest) = lowered_prefix.strip_prefix("hostname ") {
        Some(&after_hash[after_hash.len() - rest.len() - 1..])
    } else {
        None
    }?;
    let host = payload
        .trim()
        .split_whitespace()
        .next()
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty());
    host.map(Some)
}

fn build_explicit_slices(
    lines: &[&str],
    separators: &[ExplicitSeparator],
) -> (Vec<ConfigSlice>, Vec<BatchWarning>) {
    let mut slices: Vec<ConfigSlice> = Vec::new();
    let mut warnings: Vec<BatchWarning> = Vec::new();

    // Optional preamble: lines before the first separator. If non-blank,
    // include as slice-0; if all-blank, skip silently.
    let first_sep_idx = separators[0].line_idx;
    if first_sep_idx > 0 {
        let pre = &lines[0..first_sep_idx];
        if pre.iter().any(|l| !l.trim().is_empty()) {
            let hint = first_hostname(pre)
                .map(|h| SliceHint::HostnamePresent { hostname: h })
                .unwrap_or(SliceHint::None);
            slices.push(ConfigSlice {
                slice_id: slice_id(slices.len()),
                line_start: 1,
                line_end: first_sep_idx as u64,
                raw_text: rejoin(pre),
                confidence: 0.5,
                hint,
            });
        }
    }

    for (i, sep) in separators.iter().enumerate() {
        let next_idx = separators.get(i + 1).map(|s| s.line_idx).unwrap_or(lines.len());
        // Content starts at the line AFTER the separator.
        let content_start = sep.line_idx + 1;
        let content_end = next_idx; // exclusive
        let body = if content_start <= content_end {
            &lines[content_start..content_end]
        } else {
            &lines[0..0]
        };
        let is_empty = body.iter().all(|l| l.trim().is_empty());
        let slice_id_str = slice_id(slices.len());
        let hint = sep
            .hostname
            .clone()
            .map(|h| SliceHint::HostnamePresent { hostname: h })
            .or_else(|| first_hostname(body).map(|h| SliceHint::HostnamePresent { hostname: h }))
            .unwrap_or(SliceHint::None);
        // line_start = sep line+1 if there is content, else the separator
        // line itself so the slice keeps a real position. line_end follows
        // the body length.
        let (line_start, line_end) = if is_empty {
            ((sep.line_idx as u64) + 1, (sep.line_idx as u64) + 1)
        } else {
            (
                (content_start as u64) + 1,
                (content_start as u64) + (body.len() as u64),
            )
        };
        slices.push(ConfigSlice {
            slice_id: slice_id_str.clone(),
            line_start,
            line_end,
            raw_text: rejoin(body),
            confidence: 1.0,
            hint,
        });
        if is_empty {
            warnings.push(BatchWarning::EmptySliceProduced {
                slice_id: slice_id_str,
            });
        }
    }
    (slices, warnings)
}

// =====================================================================
// Pass 2 — heuristic boundary detection
// =====================================================================

#[derive(Debug, Clone)]
struct HeuristicBoundary {
    line_idx: usize,
    line_number: u64,
    confidence: f32,
}

/// Window (in non-blank lines) within which a config-end marker
/// counts as a "strong predecessor" for a hostname boundary. Real
/// configs typically have a short preamble (`service timestamps`,
/// `boot-start-marker`, `boot-end-marker`, `version`, …) between an
/// `end` line and the next device's `hostname` line.
const STRONG_END_LOOKBACK_LINES: usize = 6;

fn scan_heuristic_boundaries(lines: &[&str]) -> Vec<HeuristicBoundary> {
    let mut boundaries: Vec<HeuristicBoundary> = Vec::new();
    let mut seen_any_hostname = false;
    // Distance (in non-blank lines) since the last strong end marker.
    // `None` = no strong end marker seen yet.
    let mut nonblank_since_strong: Option<usize> = None;
    let mut last_was_blank = false;

    for (idx, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        let is_blank = trimmed.is_empty();
        let is_strong_end = is_strong_end_marker(trimmed);
        let is_hostname = extract_hostname_signal(trimmed).is_some();

        if is_hostname {
            if seen_any_hostname {
                let confidence = if nonblank_since_strong
                    .map(|d| d <= STRONG_END_LOOKBACK_LINES)
                    .unwrap_or(false)
                {
                    0.7
                } else if last_was_blank {
                    0.4
                } else {
                    0.3
                };
                boundaries.push(HeuristicBoundary {
                    line_idx: idx,
                    line_number: (idx as u64) + 1,
                    confidence,
                });
            }
            seen_any_hostname = true;
        }

        // Update tracking AFTER processing this line, so the hostname
        // line itself is not counted against the strong-end window.
        if is_strong_end {
            nonblank_since_strong = Some(0);
        } else if !is_blank {
            nonblank_since_strong = nonblank_since_strong.map(|d| d + 1);
        }
        last_was_blank = is_blank;
    }
    boundaries
}

fn is_strong_end_marker(trimmed: &str) -> bool {
    matches!(trimmed, "end" | "}" | "commit")
        || trimmed.starts_with("!Command:")
        || trimmed.starts_with("! Command:")
        || trimmed.starts_with("## Last commit")
        || trimmed.starts_with("## Last changed")
}

fn extract_hostname_signal(trimmed: &str) -> Option<String> {
    // Cisco IOS / IOS-XE / Arista EOS: `hostname X`
    if let Some(rest) = trimmed.strip_prefix("hostname ") {
        let host = rest.split_whitespace().next().unwrap_or("");
        if !host.is_empty() {
            return Some(host.to_string());
        }
    }
    // Juniper Junos set-style: `set system host-name X`
    if let Some(rest) = trimmed.strip_prefix("set system host-name ") {
        let host = rest
            .trim_end_matches(';')
            .split_whitespace()
            .next()
            .unwrap_or("");
        if !host.is_empty() {
            return Some(host.to_string());
        }
    }
    // Juniper Junos brace-style: `host-name X;` (inside `system { ... }`)
    if let Some(rest) = trimmed.strip_prefix("host-name ") {
        let host = rest
            .trim_end_matches(';')
            .split_whitespace()
            .next()
            .unwrap_or("");
        if !host.is_empty() {
            return Some(host.to_string());
        }
    }
    // Huawei VRP: `sysname X`
    if let Some(rest) = trimmed.strip_prefix("sysname ") {
        let host = rest.split_whitespace().next().unwrap_or("");
        if !host.is_empty() {
            return Some(host.to_string());
        }
    }
    None
}

fn build_heuristic_slices(
    lines: &[&str],
    boundaries: &[HeuristicBoundary],
) -> (Vec<ConfigSlice>, Vec<BatchWarning>) {
    let mut slices: Vec<ConfigSlice> = Vec::new();
    let mut warnings: Vec<BatchWarning> = Vec::new();
    let mut cuts: Vec<usize> = vec![0];
    cuts.extend(boundaries.iter().map(|b| b.line_idx));
    cuts.push(lines.len());
    let mut confidences: Vec<f32> = vec![1.0];
    confidences.extend(boundaries.iter().map(|b| b.confidence));

    for window_idx in 0..(cuts.len() - 1) {
        let start = cuts[window_idx];
        let end = cuts[window_idx + 1];
        if start >= end {
            continue;
        }
        let body = &lines[start..end];
        if body.iter().all(|l| l.trim().is_empty()) {
            continue;
        }
        let slice_id_str = slice_id(slices.len());
        let confidence = confidences.get(window_idx).copied().unwrap_or(0.5);
        let hint = first_hostname(body)
            .map(|h| SliceHint::HostnamePresent { hostname: h })
            .unwrap_or(SliceHint::None);
        slices.push(ConfigSlice {
            slice_id: slice_id_str.clone(),
            line_start: (start as u64) + 1,
            line_end: (start as u64) + (body.len() as u64),
            raw_text: rejoin(body),
            confidence,
            hint,
        });
        if confidence <= LOW_CONFIDENCE_THRESHOLD {
            warnings.push(BatchWarning::LowConfidenceSplit {
                slice_id: slice_id_str,
            });
        }
    }
    (slices, warnings)
}

// =====================================================================
// Common helpers
// =====================================================================

fn slice_id(idx: usize) -> String {
    format!("slice-{idx}")
}

/// Re-join a slice of lines with `\n` and append a trailing `\n` so the
/// raw_text round-trips cleanly through the parser command (which
/// itself accepts trailing newlines without issue).
fn rejoin(lines: &[&str]) -> String {
    if lines.is_empty() {
        return String::new();
    }
    let mut out = String::with_capacity(lines.iter().map(|l| l.len() + 1).sum());
    for line in lines {
        out.push_str(line);
        out.push('\n');
    }
    out
}

fn first_hostname(lines: &[&str]) -> Option<String> {
    for line in lines {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Some(h) = extract_hostname_signal(trimmed) {
            return Some(h);
        }
    }
    None
}

fn finalize_caps(slices: &mut Vec<ConfigSlice>, warnings: &mut Vec<BatchWarning>) {
    if slices.len() > MAX_SLICES {
        let device_count = slices.len() as u64;
        slices.truncate(MAX_SLICES);
        warnings.push(BatchWarning::UnusuallyLargeBatch { device_count });
    }
}

fn emit_low_confidence_warnings(slices: &[ConfigSlice], warnings: &mut Vec<BatchWarning>) {
    for s in slices {
        if s.confidence <= LOW_CONFIDENCE_THRESHOLD {
            // De-dup: skip if heuristic already emitted for this slice.
            let already = warnings.iter().any(|w| matches!(
                w,
                BatchWarning::LowConfidenceSplit { slice_id } if slice_id == &s.slice_id
            ));
            if !already {
                warnings.push(BatchWarning::LowConfidenceSplit {
                    slice_id: s.slice_id.clone(),
                });
            }
        }
    }
}

// =====================================================================
// Tests
// =====================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_returns_empty_warning_no_slices() {
        let r = split_config_batch("");
        assert!(r.slices.is_empty());
        assert!(matches!(r.method, SplitMethod::NoSplitPossible));
        assert!(r.warnings.contains(&BatchWarning::EmptyInput));
    }

    #[test]
    fn whitespace_only_returns_whitespace_warning() {
        let r = split_config_batch("   \n\t\n  \n");
        assert!(r.slices.is_empty());
        assert!(matches!(r.method, SplitMethod::NoSplitPossible));
        assert!(r.warnings.contains(&BatchWarning::WhitespaceOnly));
    }

    #[test]
    fn single_line_input_returns_single_config_one_slice() {
        let r = split_config_batch("hostname r1\n");
        assert_eq!(r.slices.len(), 1);
        assert!(matches!(r.method, SplitMethod::SingleConfig));
        assert_eq!(r.slices[0].slice_id, "slice-0");
    }

    #[test]
    fn two_configs_with_hash_device_separator_split_into_two() {
        let cfg = "### device: r1 ###\nhostname r1\nend\n### device: r2 ###\nhostname r2\nend\n";
        let r = split_config_batch(cfg);
        assert!(matches!(r.method, SplitMethod::ExplicitSeparator { .. }));
        assert_eq!(r.slices.len(), 2);
        assert_eq!(r.slices[0].slice_id, "slice-0");
        assert_eq!(r.slices[1].slice_id, "slice-1");
    }

    #[test]
    fn three_configs_concatenated_no_separator_heuristic_split() {
        let cfg = "hostname r1\ninterface Gig0\nend\nhostname r2\ninterface Gig0\nend\nhostname r3\nend\n";
        let r = split_config_batch(cfg);
        assert!(matches!(r.method, SplitMethod::Heuristic));
        assert_eq!(r.slices.len(), 3);
        assert!(r.slices[0].slice_id == "slice-0");
        assert!(r.slices[1].slice_id == "slice-1");
        assert!(r.slices[2].slice_id == "slice-2");
    }

    #[test]
    fn slice_ids_are_stable_across_repeated_calls() {
        let cfg = "### device: a ###\nhostname a\n### device: b ###\nhostname b\n";
        let a = split_config_batch(cfg);
        let b = split_config_batch(cfg);
        let c = split_config_batch(cfg);
        assert_eq!(a, b);
        assert_eq!(b, c);
    }

    #[test]
    fn ambiguous_boundary_low_confidence_emits_warning() {
        // Two hostnames separated only by a blank line — weak signal.
        let cfg = "hostname r1\ninterface Gig0\n\nhostname r2\ninterface Gig0\n";
        let r = split_config_batch(cfg);
        assert!(matches!(r.method, SplitMethod::Heuristic));
        assert!(r
            .warnings
            .iter()
            .any(|w| matches!(w, BatchWarning::AmbiguousBoundary { .. })));
    }

    #[test]
    fn empty_section_between_separators_emits_warning() {
        let cfg = "### device: r1 ###\nhostname r1\nend\n### device: r2 ###\n### device: r3 ###\nhostname r3\n";
        let r = split_config_batch(cfg);
        assert!(matches!(r.method, SplitMethod::ExplicitSeparator { .. }));
        // 3 slices: r1, empty(r2), r3
        assert_eq!(r.slices.len(), 3);
        assert!(r
            .warnings
            .iter()
            .any(|w| matches!(w, BatchWarning::EmptySliceProduced { .. })));
    }

    #[test]
    fn fifty_slice_input_produces_unique_ordered_slice_ids() {
        let mut cfg = String::new();
        for i in 0..50 {
            cfg.push_str(&format!("### device: r{i} ###\nhostname r{i}\nend\n"));
        }
        let r = split_config_batch(&cfg);
        assert_eq!(r.slices.len(), 50);
        for (i, s) in r.slices.iter().enumerate() {
            assert_eq!(s.slice_id, format!("slice-{i}"));
        }
    }

    #[test]
    fn split_result_round_trips_through_serde() {
        let cfg = "### device: r1 ###\nhostname r1\nend\n### device: r2 ###\nhostname r2\nend\n";
        let r = split_config_batch(cfg);
        let s1 = serde_json::to_string(&r).unwrap();
        let back: ConfigBatchSplitResult = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&back).unwrap();
        assert_eq!(s1, s2);
    }

    #[test]
    fn junos_set_style_concat_detected_via_heuristic() {
        let cfg = "set system host-name a\nset interfaces ge-0/0/0\ncommit\nset system host-name b\nset interfaces ge-0/0/0\n";
        let r = split_config_batch(cfg);
        assert!(matches!(r.method, SplitMethod::Heuristic));
        assert_eq!(r.slices.len(), 2);
    }
}
