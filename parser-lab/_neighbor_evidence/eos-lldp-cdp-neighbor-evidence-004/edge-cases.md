# EOS LLDP/CDP edge cases

- EOS may provide LLDP evidence that is strong enough to resolve the remote
  node.
- CDP evidence can be useful but should not override a weaker or conflicting
  LLDP match without policy.
- The same neighbor can appear in both protocols.
- Management address can be present in one protocol and absent in another.
- If remote-node matching fails, keep the candidate unresolved or reject it
  rather than guessing.
- Self-links should be rejected unless the snippet explicitly marks the
  example synthetic.
