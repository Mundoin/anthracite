# CDP facts edge cases

- CDP enabled on a device does not prove any neighbor exists.
- CDP is Cisco-specific and should not be conflated with LLDP.
- Interface CDP enablement can be asymmetric.
- Descriptions such as `peer-to-core` are hints only.
- The absence of CDP on an interface should remain ambiguous unless the
  config explicitly disables it.
- Do not promote CDP support state into a topology edge without discovery
  data.
