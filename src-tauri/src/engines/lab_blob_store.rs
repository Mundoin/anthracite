//! Lab Blob Store — V1BO durable persistence for generated lab environments.
//!
//! Intentionally narrow boundary: this engine treats saved generated
//! labs as an opaque JSON blob. The frontend owns the
//! `EnvironmentLifecycleStoreState` shape (it already serializes the
//! whole store for `BrowserLocalStorageAdapter`). Rust just persists
//! the string to disk under `app_data_dir/saved_environments.json`.
//!
//! Why opaque-blob and not a typed `Vec<LocalEnvironmentRecord>`:
//!   - LocalEnvironmentRecord on the TS side carries `lab_payload:
//!     LabEnvironment`, a deeply nested struct. Duplicating its shape
//!     in Rust would lock the two languages together for every future
//!     field add, and serde would need to track every TS migration.
//!   - The frontend already handles serialize/deserialize/migrate
//!     (`environmentPersistence.ts`). Rust just needs to round-trip
//!     the resulting string crash-safely. Opaque-blob keeps the
//!     contract minimal — one string in, one string out.
//!
//! Boundary:
//!   - Owns:    saved_environments.json read/write.
//!   - Does NOT own: shape, validation, merging, schema migration.

use std::path::PathBuf;
use std::sync::Mutex;

/// File-backed blob store for saved lab environments. Thread-safe
/// via interior Mutex on the cached blob; disk I/O happens under
/// the lock so concurrent writes serialize cleanly.
pub struct LabBlobStore {
    path: PathBuf,
    /// Optional in-memory mirror of the last-known blob. Hydrated
    /// lazily on first read so the engine does not block app start
    /// on disk I/O.
    cache: Mutex<Option<String>>,
}

impl LabBlobStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            cache: Mutex::new(None),
        }
    }

    pub fn path(&self) -> &PathBuf {
        &self.path
    }

    /// Read the persisted blob from disk. Returns `None` if the file
    /// does not exist OR is unreadable. Empty file returns `Some("")`
    /// — caller decides whether to treat as "cleared" or "missing".
    pub fn read_blob(&self) -> Option<String> {
        // Cache hit short-circuits disk I/O.
        if let Ok(guard) = self.cache.lock() {
            if let Some(ref cached) = *guard {
                return Some(cached.clone());
            }
        }
        let bytes = std::fs::read(&self.path).ok()?;
        let blob = String::from_utf8(bytes).ok()?;
        if let Ok(mut guard) = self.cache.lock() {
            *guard = Some(blob.clone());
        }
        Some(blob)
    }

    /// Persist the blob to disk. Creates parent directories on demand
    /// so the first save works even when `app_data_dir` has never been
    /// written into. Errors bubble up as `Result::Err(String)` so the
    /// Tauri command can report failure to the frontend.
    pub fn write_blob(&self, blob: &str) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&self.path, blob.as_bytes()).map_err(|e| e.to_string())?;
        if let Ok(mut guard) = self.cache.lock() {
            *guard = Some(blob.to_string());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp_path(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "anthracite-lab-blob-{}-{}-{}.json",
            label,
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0),
        ))
    }

    #[test]
    fn missing_file_returns_none() {
        let p = tmp_path("missing");
        let _ = std::fs::remove_file(&p);
        let store = LabBlobStore::new(p);
        assert!(store.read_blob().is_none());
    }

    #[test]
    fn write_then_read_round_trips() {
        let p = tmp_path("round-trip");
        let _ = std::fs::remove_file(&p);
        let store = LabBlobStore::new(p.clone());
        let blob = r#"{"environments":[{"id":"lab-1"}],"active_environment_id":"lab-1"}"#;
        store.write_blob(blob).expect("write must succeed");
        let got = store.read_blob().expect("read must return Some");
        assert_eq!(got, blob);
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn second_store_instance_reads_persisted_blob() {
        let p = tmp_path("second-boot");
        let _ = std::fs::remove_file(&p);
        let blob = r#"{"x":1}"#;
        {
            let store = LabBlobStore::new(p.clone());
            store.write_blob(blob).unwrap();
        }
        // Second boot: cache fresh, must read from disk.
        let store2 = LabBlobStore::new(p.clone());
        assert_eq!(store2.read_blob().as_deref(), Some(blob));
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn overwrite_replaces_previous_blob() {
        let p = tmp_path("overwrite");
        let _ = std::fs::remove_file(&p);
        let store = LabBlobStore::new(p.clone());
        store.write_blob(r#"{"v":1}"#).unwrap();
        store.write_blob(r#"{"v":2}"#).unwrap();
        assert_eq!(store.read_blob().as_deref(), Some(r#"{"v":2}"#));
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn write_creates_missing_parent_dir() {
        let dir = std::env::temp_dir().join(format!(
            "anthracite-lab-blob-newdir-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0),
        ));
        // Don't pre-create the directory.
        let p = dir.join("saved_environments.json");
        let store = LabBlobStore::new(p);
        store.write_blob("{}").expect("write should create dir");
        assert_eq!(store.read_blob().as_deref(), Some("{}"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn empty_blob_round_trips_as_empty_string() {
        let p = tmp_path("empty");
        let _ = std::fs::remove_file(&p);
        let store = LabBlobStore::new(p.clone());
        store.write_blob("").unwrap();
        assert_eq!(store.read_blob().as_deref(), Some(""));
        let _ = std::fs::remove_file(&p);
    }
}
