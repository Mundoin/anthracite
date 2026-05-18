# Rejected self-link edge cases

- The remote system name may equal the local hostname.
- A device ID may normalize to the local node after case folding.
- The remote port may also match the local interface.
- A bundle peer-link can be mistaken for a real remote device if the note is
  weak.
- Self-link rejection should survive duplicate evidence from more than one
  protocol.
- Config hints must not override a self-link rejection.
