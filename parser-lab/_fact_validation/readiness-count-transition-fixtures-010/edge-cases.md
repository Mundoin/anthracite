# Readiness count transition edge cases

- A batch can move from none_available to partial before all evidence is
  resolved.
- A batch can regress if a conflict or stale set is discovered later.
- Rejected evidence should still be counted.
- Unresolved evidence should not be silently folded into accepted counts.
- Readiness should depend on accepted fact coverage, not just raw snippet
  count.
