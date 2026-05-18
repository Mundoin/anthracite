# CDP neighbor-table edge cases

- CDP can be enabled with no live neighbor.
- Device ID may be absent or generic.
- An IP address may identify a management plane, not the physical peer.
- The same neighbor can be reported on multiple interfaces during failure or
  duplication events.
- A self-link candidate should be rejected unless the snippet says it is
  synthetic.
- Cisco-only CDP data should not be generalized beyond Cisco devices.
