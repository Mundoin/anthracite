# Mixed LLDP/CDP edge cases

- One protocol may have a full remote system name while the other only has a
  device ID.
- The same edge can appear with a different port label in each protocol.
- The EOS example is intentionally note-only and should not be overread as a
  real CDP config pattern.
- A weak source should not create a second edge if a stronger source already
  resolved the pair.
