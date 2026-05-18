# Interface normalization edge cases

- `Port-channel1`, `port-channel1`, and `Port-Channel1` should normalize to
  one canonical form.
- Junos unit notation must keep the logical unit visible.
- IOS-XR and SR OS examples may be illustrative synthetic evidence payloads
  when the raw command shape is not available.
- Normalization should not alter the remote node identity.
- A normalization change should not create a new edge if the pair is already
  resolved.
