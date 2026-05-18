# Accepted CDP edge cases

- CDP can be accepted only when the device ID resolves safely.
- The same neighbour can be reported multiple times on different ports.
- IP address may be a management address, not a physical address.
- Capability hints should remain notes, not edge identity.
- A device ID that normalizes back to the local node should be rejected by the
  self-link pack.
- Cisco CDP evidence should not be generalized beyond Cisco devices.
