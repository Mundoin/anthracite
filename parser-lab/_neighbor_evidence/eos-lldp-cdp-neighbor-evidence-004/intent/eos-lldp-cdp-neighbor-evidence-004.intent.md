# EOS LLDP/CDP intent

## eos-lldp-001

- Extract the EOS LLDP fields into a candidate fact.
- Preserve the remote chassis, system name, and port id.
- Likely future OCC touch points: direct fact creation and duplicate merge.
- Stay out of scope: treating management address as the node identity.
- Ambiguity note: LLDP is strong, but the remote node may still need
  inventory validation.

## eos-cdp-note-002

- Extract the EOS CDP output as note-only evidence unless OCC has a clear
  resolution path.
- Keep the MLAG peer-link context separate from link truth.
- Likely future OCC touch points: note-only retention and conservative
  rejection.
- Stay out of scope: promoting CDP into a confirmed edge when the peer is not
  resolved.
- Ambiguity note: the peer-link is real configuration context, but not a
  topology edge by itself.
