# Interface normalization intent

## norm-iosxe-001

- Extract the IOS-XE interface and normalize the Port-channel spelling.
- Preserve the raw spelling in notes so OCC can audit the normalization.
- Likely future OCC touch points: canonical interface keying and accepted
  fact creation.
- Stay out of scope: changing the remote node identity.
- Ambiguity note: the same interface may appear with multiple casing variants.

## norm-nxos-002

- Extract the NX-OS interface and keep the lower-case port-channel spelling
  stable.
- Likely future OCC touch points: vendor-specific normalization and dedup.
- Stay out of scope: treating normalization as a topology change.
- Ambiguity note: raw spelling should remain available for audit.

## norm-junos-003

- Extract the Junos unit and normalize the local interface in a stable way.
- Likely future OCC touch points: unit handling and accepted fact creation.
- Stay out of scope: stripping away the logical unit.
- Ambiguity note: the unit suffix is part of the meaningful interface shape.

## norm-eos-004

- Extract the EOS interface and preserve the original `Port-Channel1` form.
- Likely future OCC touch points: canonical keying and source-label retention.
- Stay out of scope: splitting the same edge because of hyphen/case details.
- Ambiguity note: EOS naming is already close to the canonical form.

## norm-iosxr-005

- Extract the synthetic IOS-XR interface normalization payload.
- Likely future OCC touch points: XR interface depth handling and canonical
  keying.
- Stay out of scope: treating the illustrative payload as a real command
  output.
- Ambiguity note: this section exists to demonstrate normalization shape.

## norm-sros-006

- Extract the synthetic SR OS interface normalization payload.
- Likely future OCC touch points: SR OS port naming and canonical keying.
- Stay out of scope: treating the illustrative payload as a real command
  output.
- Ambiguity note: this section exists to demonstrate normalization shape.
