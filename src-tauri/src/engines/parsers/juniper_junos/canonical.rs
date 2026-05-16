//! Junos canonical line representation — V1M.
//!
//! Both Junos config styles (brace and set) lower to the same sequence
//! of `JunosLine` records before any area parser runs. This is the
//! single convergence point that makes "same semantic config → same
//! `DeviceModel`" achievable across the two styles.
//!
//! A `JunosLine` is a path-token vector + the original line number +
//! the raw source line. Path tokens are intentionally untyped strings;
//! area parsers pattern-match against expected prefixes.
//!
//! Examples (both lex to the same path):
//!
//!   brace:  `set` form:
//!   `interfaces {                set interfaces ge-0/0/0 unit 0
//!     ge-0/0/0 {                   family inet address 10.0.0.1/24
//!       unit 0 {
//!         family inet {
//!           address 10.0.0.1/24;
//!         }
//!       }
//!     }
//!   }`
//!
//! Both yield `JunosLine { path: ["interfaces", "ge-0/0/0", "unit",
//! "0", "family", "inet", "address", "10.0.0.1/24"], ... }`.
//!
//! Determinism rules:
//! - List values like `vlan members [ v10 v20 ]` expand to one
//!   `JunosLine` per element, in source order.
//! - Quoted string values keep their content but lose the surrounding
//!   quotes.
//! - Comments (`#...`, `/* ... */`) are stripped before tokenisation.

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JunosLine {
    pub path: Vec<String>,
    pub line_number: u64,
    pub raw: String,
}

impl JunosLine {
    pub fn new(path: Vec<String>, line_number: u64, raw: String) -> Self {
        Self {
            path,
            line_number,
            raw,
        }
    }

    /// True when `self.path` begins with the given prefix.
    pub fn path_starts_with(&self, prefix: &[&str]) -> bool {
        if self.path.len() < prefix.len() {
            return false;
        }
        prefix
            .iter()
            .zip(self.path.iter())
            .all(|(a, b)| *a == b.as_str())
    }
}
