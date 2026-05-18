# huawei-vrp vlan-l2-depth-002 intent

## Extraction expectations

- `vlan batch` membership.
- Access port on VLAN 10.
- Trunk port with native VLAN 99 and allowed VLANs.
- `Vlanif99` management SVI.

## Conservative areas

- `stp edged-port enable` is only a hint.
- Do not infer routing policy from VLAN membership.

