# LLDP neighbor-table edge cases

- A neighbor table can show the same pair more than once.
- Management address may be missing.
- System name may be absent even when chassis and port are present.
- A stale report should not overwrite a newer resolved fact without OCC
  policy.
- The remote node may remain unknown if inventory correlation fails.
- Self-link candidates should be rejected unless the snippet says the example
  is synthetic or loopback-based.
