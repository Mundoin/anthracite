# Evidence-to-node resolution edge cases

- The remote system name may be missing.
- The remote node may normalize to the wrong inventory object.
- A stale LLDP or CDP report may conflict with newer evidence.
- Two protocols may report the same link with slightly different names.
- A self-link candidate should be rejected.
- A duplicate report should be merged into one canonical fact if the remote
  node is still resolvable.
