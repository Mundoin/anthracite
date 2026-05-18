# static-route-depth-003 edge cases

- Cisco IOS-XE can express VRF-bound static routes inline.
- IOS-XR static routes are often nested under `router static`.
- Huawei uses `preference` where other vendors may use `distance`.
- RouterOS separates `dst-address`, `gateway`, and optional `distance`.
- FortiOS can bind static routes to a device and/or VRF-like context.
- SR OS may express the same concept as `static-route-entry`.
- Note-only management/security lines should stay conservative.

