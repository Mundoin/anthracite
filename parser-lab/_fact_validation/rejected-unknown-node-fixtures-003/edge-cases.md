# Rejected unknown-node edge cases

- The remote system name may be missing or set to `unknown`.
- The local node may not be resolvable from inventory.
- A neighbour can be physically real but still unsafe to resolve.
- A partial device ID or chassis ID is not enough by itself.
- Rejection should keep the raw evidence for later review.
- Config hints alone must not convert a rejected case into an accepted fact.
