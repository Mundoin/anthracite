# VENDOR_PLATFORM_REGISTRY

First-pass vendor / platform target list for Anthracite V1. This is the
authoritative roster the Vendor Registry Engine (V1H) will encode. Platform
ids are stable identifiers — once shipped, never renamed.

Cisco appears multiple times because IOS, IOS XR, and NX-OS are distinct
config realities, not one platform. The list runs slightly above 15 for that
reason.

## Priority tiers

- **T1** — must work well at L1/L2 before V1 ships. Largest install base, most
  operator demand.
- **T2** — second wave, L1/L2 within V1 timeframe.
- **T3** — best-effort, identify + L1 inventory within V1, deeper later.

## Platforms

| platform id | vendor | OS family | primary role | config style | tier | initial target | notes |
|---|---|---|---|---|---|---|---|
| `cisco-ios` | Cisco | IOS / IOS XE | enterprise router/switch | IOS-classic, indented | T1 | L2 | XE shares syntax with classic IOS; XE-specific features flagged in capability matrix. |
| `cisco-iosxr` | Cisco | IOS XR | SP edge / core router | hierarchical, commit-based | T2 | L2 | Distinct grammar (admin/conf-t). Commit model differs from IOS. |
| `cisco-nxos` | Cisco | NX-OS | DC switch | IOS-like with feature toggles | T1 | L2 | `feature` gating + VPC/VXLAN concepts unique to NX-OS. |
| `juniper-junos` | Juniper | Junos | router / switch / firewall | hierarchical set / curly braces | T1 | L2 | Two render forms (set vs display). Commit-based. |
| `arista-eos` | Arista | EOS | DC switch | IOS-like | T1 | L2 | High syntactic overlap with cisco-ios; semantics diverge on MLAG/EVPN. |
| `mikrotik-routeros` | MikroTik | RouterOS | SMB router / wireless | flat command list with paths | T2 | L1 | Export format very different from CLI live config. |
| `fortinet-fortios` | Fortinet | FortiOS | firewall / SD-WAN | config block / edit / next | T1 | L1 | Vdoms add scoping layer. Policy-heavy. |
| `paloalto-panos` | Palo Alto | PAN-OS | firewall | XML (configd) or set-format | T1 | L1 | XML is authoritative; set-format is operator-friendly view. |
| `huawei-vrp` | Huawei | VRP | router / switch | IOS-like, distinct keywords | T2 | L1 | Keyword divergence from Cisco (e.g. `display` vs `show`). |
| `nokia-sros` | Nokia | SR OS | SP router | hierarchical, model-driven | T2 | L1 | Classic vs MD-CLI variants. |
| `aruba-aoscx` | HPE / Aruba | AOS-CX | DC / campus switch | YANG-aligned hierarchical | T2 | L1 | Newer platform; ArubaOS-Switch (legacy) tracked separately if needed. |
| `aruba-arubaos` | HPE / Aruba | ArubaOS | wireless controller / AP | flat with stanzas | T3 | L0 | Controller config distinct from AOS-CX. |
| `dell-os10` | Dell | OS10 | DC switch | IOS-like (SONiC-adjacent) | T2 | L1 | OS6 / OS9 legacy out of scope for V1. |
| `extreme-exos` | Extreme | EXOS | campus / DC switch | flat command list | T3 | L0 | Stanza-less; parsing relies on command verbs. |
| `extreme-voss` | Extreme | VOSS / VSP | fabric switch | hierarchical | T3 | L0 | SPB / fabric attach concepts unique. |
| `nvidia-cumulus` | NVIDIA | Cumulus Linux | DC switch (Linux) | NCLU / NVUE / file-based | T2 | L1 | Multi-format: /etc/network/interfaces, FRR, NVUE YAML. |
| `vyos` | VyOS | VyOS | open-source router | hierarchical set | T3 | L1 | Junos-like set format. |
| `ubiquiti-edgeos` | Ubiquiti | EdgeOS | SMB router | hierarchical set (Vyatta-derived) | T3 | L0 | Distinct from UniFi controller config. |
| `ubiquiti-unifi` | Ubiquiti | UniFi Network | SMB / prosumer | controller-managed JSON | T3 | L0 | Per-device config derives from controller; provisioning-template-driven. |
| `checkpoint-gaia` | Check Point | Gaia | firewall | clish + dbedit + policy DB | T3 | L0 | Policy lives in management server, not gateway config. Scope V1 = gateway clish only. |

## Maintenance rules

- Adding a platform = new row + new fixture corpus stub.
- Renaming a platform id = forbidden post-ship. Mark deprecated + add successor row.
- Tier changes require a stage receipt explaining why.
- Capability matrix (per-area maturity per platform) lives in the Vendor
  Registry Engine, not in this document.

## Cross-references

- [`VENDOR_ENGINE_PLAN.md`](./VENDOR_ENGINE_PLAN.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
