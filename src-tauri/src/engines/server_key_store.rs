use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// A pinned server-key record for one `host:port` identity.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerKeyPin {
    pub algorithm: String,
    pub fingerprint_sha256: String,
    /// ISO 8601; set on first pin, preserved on re-pin.
    pub first_seen_at: String,
    /// ISO 8601; updated on every pin/re-pin.
    pub last_seen_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ServerKeyPinFile {
    schema_version: String,
    pins: HashMap<String, ServerKeyPin>,
}

impl Default for ServerKeyPinFile {
    fn default() -> Self {
        Self {
            schema_version: "v1".to_string(),
            pins: HashMap::new(),
        }
    }
}

pub struct ServerKeyStore {
    path: PathBuf,
}

impl ServerKeyStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    fn load(&self) -> ServerKeyPinFile {
        if !self.path.exists() {
            return ServerKeyPinFile::default();
        }
        match std::fs::read_to_string(&self.path) {
            Ok(text) => match serde_json::from_str::<ServerKeyPinFile>(&text) {
                Ok(f) if f.schema_version == "v1" => f,
                _ => ServerKeyPinFile::default(),
            },
            Err(_) => ServerKeyPinFile::default(),
        }
    }

    fn save(&self, file: &ServerKeyPinFile) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(file).map_err(|e| e.to_string())?;
        std::fs::write(&self.path, json).map_err(|e| e.to_string())
    }

    pub fn get_pin(&self, host: &str, port: u16) -> Option<ServerKeyPin> {
        let key = format!("{}:{}", host, port);
        self.load().pins.get(&key).cloned()
    }

    /// Upsert: preserves `first_seen_at` on re-pin; sets it fresh on first pin.
    pub fn set_pin(
        &self,
        host: &str,
        port: u16,
        algorithm: &str,
        fingerprint_sha256: &str,
        now: &str,
    ) -> Result<ServerKeyPin, String> {
        let key = format!("{}:{}", host, port);
        let mut file = self.load();
        let first_seen_at = file
            .pins
            .get(&key)
            .map(|p| p.first_seen_at.clone())
            .unwrap_or_else(|| now.to_string());
        let pin = ServerKeyPin {
            algorithm: algorithm.to_string(),
            fingerprint_sha256: fingerprint_sha256.to_string(),
            first_seen_at,
            last_seen_at: now.to_string(),
        };
        file.pins.insert(key, pin.clone());
        self.save(&file)?;
        Ok(pin)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_store() -> (ServerKeyStore, TempDir) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("server_keys.json");
        (ServerKeyStore::new(path), dir)
    }

    #[test]
    fn get_pin_returns_none_when_no_file() {
        let (store, _dir) = make_store();
        assert!(store.get_pin("10.0.0.1", 22).is_none());
    }

    #[test]
    fn set_pin_and_get_pin_round_trip() {
        let (store, _dir) = make_store();
        let pin = store
            .set_pin("10.0.0.1", 22, "ssh-ed25519", "SHA256:abc", "2026-05-19T00:00:00Z")
            .unwrap();
        assert_eq!(pin.algorithm, "ssh-ed25519");
        assert_eq!(pin.fingerprint_sha256, "SHA256:abc");
        assert_eq!(pin.first_seen_at, "2026-05-19T00:00:00Z");
        assert_eq!(pin.last_seen_at, "2026-05-19T00:00:00Z");

        let loaded = store.get_pin("10.0.0.1", 22).unwrap();
        assert_eq!(loaded.fingerprint_sha256, "SHA256:abc");
    }

    #[test]
    fn re_pin_preserves_first_seen_at() {
        let (store, _dir) = make_store();
        store
            .set_pin("10.0.0.1", 22, "ssh-ed25519", "SHA256:abc", "2026-05-19T00:00:00Z")
            .unwrap();
        let updated = store
            .set_pin("10.0.0.1", 22, "ssh-ed25519", "SHA256:xyz", "2026-05-20T00:00:00Z")
            .unwrap();
        assert_eq!(updated.first_seen_at, "2026-05-19T00:00:00Z");
        assert_eq!(updated.last_seen_at, "2026-05-20T00:00:00Z");
        assert_eq!(updated.fingerprint_sha256, "SHA256:xyz");
    }

    #[test]
    fn different_host_port_keys_are_independent() {
        let (store, _dir) = make_store();
        store
            .set_pin("10.0.0.1", 22, "ssh-ed25519", "SHA256:aaa", "2026-05-19T00:00:00Z")
            .unwrap();
        store
            .set_pin("10.0.0.2", 22, "ssh-rsa", "SHA256:bbb", "2026-05-19T00:00:00Z")
            .unwrap();
        let a = store.get_pin("10.0.0.1", 22).unwrap();
        let b = store.get_pin("10.0.0.2", 22).unwrap();
        assert_eq!(a.fingerprint_sha256, "SHA256:aaa");
        assert_eq!(b.fingerprint_sha256, "SHA256:bbb");
    }

    #[test]
    fn corrupt_file_returns_empty_gracefully() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("server_keys.json");
        std::fs::write(&path, b"not-valid-json").unwrap();
        let store = ServerKeyStore::new(path);
        assert!(store.get_pin("host", 22).is_none());
    }

    #[test]
    fn schema_version_mismatch_returns_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("server_keys.json");
        std::fs::write(
            &path,
            br#"{"schema_version":"v99","pins":{}}"#,
        )
        .unwrap();
        let store = ServerKeyStore::new(path);
        assert!(store.get_pin("host", 22).is_none());
    }

    #[test]
    fn serialized_file_is_valid_json_with_schema_version() {
        let (store, _dir) = make_store();
        store
            .set_pin("10.0.0.1", 22, "ssh-ed25519", "SHA256:abc", "2026-05-19T00:00:00Z")
            .unwrap();
        let text = std::fs::read_to_string(&store.path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&text).unwrap();
        assert_eq!(parsed["schema_version"], "v1");
        assert!(parsed["pins"]["10.0.0.1:22"].is_object());
    }
}
