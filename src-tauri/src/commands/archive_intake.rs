//! Tauri command boundary for the V1O-B Archive Intake Engine.
//!
//! Single command: `archive_intake`. Accepts raw archive bytes plus
//! an operator-supplied kind hint, returns a structured
//! `ArchiveIntakeResult` with extracted text entries and typed
//! warnings. `Err` is reserved for unrecognised headers and the
//! empty-bytes case; ordinary conditions (kind mismatch, corrupt
//! archive, oversize, decode failures) land in warnings, not Err.
//!
//! Byte-transport gate (Task 0 of the V1O-B prompt): verified at
//! command + unit-test level via the temporary
//! `archive_intake_echo_bytes` command that previously lived in
//! this module. The echo command was removed before the final
//! report per acceptance criterion #1. Tauri 2.x marshals
//! `Uint8Array` → `Vec<u8>` via the raw IPC body; the byte content
//! is unmangled. A runtime IPC roundtrip in `pnpm tauri dev` is the
//! recommended pre-release sanity check.

use crate::engines::archive_intake::{
    self, ArchiveIntakeResult, ArchiveKind,
};

#[tauri::command]
pub fn archive_intake(
    bytes: Vec<u8>,
    kind_hint: ArchiveKind,
) -> Result<ArchiveIntakeResult, String> {
    archive_intake::archive_intake(&bytes, kind_hint)
}
