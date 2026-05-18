# Junos LLDP edge cases

- The same remote node may appear on multiple local interfaces during
  aggregation or maintenance.
- Management address can be absent.
- The system name may be stale or generic.
- A routed unit name like `ge-0/0/0.0` needs stable normalization.
- The remote node may remain unknown if inventory correlation fails.
- Self-link candidates should be rejected unless the example explicitly says
  it is synthetic.
