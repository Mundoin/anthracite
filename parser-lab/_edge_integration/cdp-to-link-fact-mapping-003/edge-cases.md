# CDP mapping edge cases

- CDP is Cisco-only and should not be generalized to other vendors.
- CDP can be enabled without a live neighbor.
- Missing device-id should lower confidence sharply.
- A device-id that normalizes to the local node should be rejected as a
  self-link unless the note says the example is synthetic.
- Duplicate CDP records for the same endpoint pair should merge.
- CDP on a trunk member does not automatically mean the remote endpoint is
  the bundle itself.
