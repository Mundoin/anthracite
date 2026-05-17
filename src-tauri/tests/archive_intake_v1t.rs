/// V1T density test — archive intake over the 24-device mixed corpus.
///
/// Structural assertions only — no byte-equality snapshot. The 4 canonical
/// protocol fixtures with full byte-equality snapshots live in
/// archive_intake_corpus.rs. This file proves the engine handles a larger
/// realistic mixed archive (3 vendors, mixed directory depth, 24 configs)
/// without dropping entries or emitting unexpected errors.

#[cfg(test)]
mod v1t_archive_intake {
    use anthracite_lib::engines::archive_intake::{self, ArchiveEntryStatus, ArchiveKind};
    use std::path::PathBuf;

    fn corpus_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("corpora")
            .join("v1t-mixed-24")
    }

    fn load_and_intake() -> anthracite_lib::engines::archive_intake::ArchiveIntakeResult {
        let archive_path = corpus_dir().join("archive.zip");
        let bytes = std::fs::read(&archive_path).unwrap_or_else(|e| {
            panic!(
                "v1t-mixed-24 archive missing at {}: {e}",
                archive_path.display()
            )
        });
        archive_intake::archive_intake(&bytes, ArchiveKind::Zip)
            .expect("archive_intake succeeds on v1t-mixed-24")
    }

    #[test]
    fn extracts_all_24_configs() {
        let result = load_and_intake();

        assert_eq!(
            result.extracted_count, 24,
            "expected 24 extracted; got {}",
            result.extracted_count
        );
        assert_eq!(
            result.entry_count, 24,
            "expected 24 total entries; got {}",
            result.entry_count
        );
        assert_eq!(
            result.skipped_count, 0,
            "expected 0 skipped; got {}",
            result.skipped_count
        );
        assert!(
            result.warnings.is_empty(),
            "expected no warnings; got {} warning(s)",
            result.warnings.len()
        );
    }

    #[test]
    fn all_entries_have_extracted_status() {
        let result = load_and_intake();

        for entry in &result.entries {
            assert!(
                matches!(entry.status, ArchiveEntryStatus::Extracted),
                "entry '{}' has non-extracted status: {:?}",
                entry.path,
                entry.status
            );
        }
    }

    #[test]
    fn all_entries_have_raw_text() {
        let result = load_and_intake();

        for entry in &result.entries {
            assert!(
                entry.raw_text.is_some(),
                "extracted entry '{}' missing raw_text",
                entry.path
            );
            assert!(
                !entry.raw_text.as_deref().unwrap_or("").is_empty(),
                "extracted entry '{}' has empty raw_text",
                entry.path
            );
        }
    }

    #[test]
    fn entry_paths_cover_all_three_vendors() {
        let result = load_and_intake();
        let paths: Vec<&str> = result.entries.iter().map(|e| e.path.as_str()).collect();

        let has_cisco = paths.iter().any(|p| p.starts_with("cisco-"));
        let has_junos = paths.iter().any(|p| p.starts_with("junos/"));
        let has_arista = paths.iter().any(|p| p.starts_with("arista/"));

        assert!(has_cisco, "no flat cisco-* entries found; paths: {paths:?}");
        assert!(has_junos, "no junos/ prefixed entries found; paths: {paths:?}");
        assert!(has_arista, "no arista/ prefixed entries found; paths: {paths:?}");
    }

    #[test]
    fn mixed_directory_layout_preserved() {
        let result = load_and_intake();

        let flat_count = result
            .entries
            .iter()
            .filter(|e| !e.path.contains('/'))
            .count();
        let nested_count = result
            .entries
            .iter()
            .filter(|e| e.path.contains('/'))
            .count();

        assert_eq!(flat_count, 8, "expected 8 flat cisco entries; got {flat_count}");
        assert_eq!(
            nested_count, 16,
            "expected 16 nested junos+arista entries; got {nested_count}"
        );
    }

    #[test]
    fn is_deterministic_across_two_runs() {
        let archive_path = corpus_dir().join("archive.zip");
        let bytes = std::fs::read(&archive_path).expect("v1t archive present");

        let r1 = archive_intake::archive_intake(&bytes, ArchiveKind::Zip).expect("run 1");
        let r2 = archive_intake::archive_intake(&bytes, ArchiveKind::Zip).expect("run 2");

        let paths1: Vec<&str> = r1.entries.iter().map(|e| e.path.as_str()).collect();
        let paths2: Vec<&str> = r2.entries.iter().map(|e| e.path.as_str()).collect();

        assert_eq!(paths1, paths2, "entry order must be stable");
        assert_eq!(r1.extracted_count, r2.extracted_count);
        assert_eq!(r1.entry_count, r2.entry_count);
    }
}
