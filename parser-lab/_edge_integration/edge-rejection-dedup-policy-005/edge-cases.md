# Edge rejection and dedup edge cases

- LLDP and CDP may both describe the same link.
- One source may have a remote system name while another only has a port id.
- The local interface may be known while the remote node remains unknown.
- A self-link candidate should not become a real edge.
- Two different remote nodes on the same local interface should trigger a
  conflict note instead of a silent merge.
- Manual review can support a candidate, but it should not erase a rejection
  reason without OCC policy.
