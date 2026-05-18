# vlan-l2-depth-002 edge cases

- Voice VLAN should not be collapsed into access VLAN.
- Native VLAN on a trunk is distinct from a tagged member list.
- VLAN ranges may appear in comma and hyphen/range forms.
- IOS-XR `l2transport` and `BVI` termination should stay distinct.
- RouterOS bridge VLAN filtering can include the bridge itself as a
  tagged member.
- SR OS service-based L2 syntax is not a flat switchport model.
- Note-only management/security lines should stay conservative.

