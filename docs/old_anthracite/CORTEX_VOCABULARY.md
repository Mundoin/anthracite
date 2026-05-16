# ANTHRACITE — Cortex Command Vocabulary

Canonical reference for all Cortex commands (Ctrl+K). Source of truth is `_CORTEX_HELP` in `anthracite/ui/cortex_bar.py`.

---

## NAVIGATION

| Command | Description |
|---|---|
| `<device>` | Navigate to device on canvas, open context panel |
| `<site>` | Navigate to site cluster |
| `<role>` | Navigate to first device with that role |
| `<interface>` | Navigate to device owning that interface |
| `creds` | Open Credential Manager |
| `credentials` | Open Credential Manager |

---

## VERBS

| Command | Description |
|---|---|
| `isolate <term>` | Dim all nodes except matches |
| `find <term>` | Highlight matches, scroll to first |
| `show <term>` | Filter view to matching category |

---

## MODE SWITCHING

| Command | Description |
|---|---|
| `build` | Switch to BUILD mode |
| `operate` | Switch to OPERATE mode |
| `diagnose` | Switch to DIAGNOSE mode |
| `library` | Switch to LIBRARY mode |
| `mode` | Show current mode in status bar |
| `terminal` | Toggle terminal overlay |
| `terminal <device>` | Open terminal session for device |

---

## TOPOLOGY

| Command | Description |
|---|---|
| `inventory` | Open Inventory dialog |
| `blocking` | Isolate devices with STP blocking ports |
| `breach` | Isolate devices with Sentinel breach alerts |

---

## PATH TRACING

| Command | Description |
|---|---|
| `path <src> <dst>` | L2 path trace between two devices |
| `path <src>` | Enter path trace mode from source (click dst) |
| `trace <dst> from <src>` | L3 forwarding path trace |
| `trace <dst> from <src> vrf <n>` | L3 trace in specific VRF |

---

## ROUTE TABLES

| Command | Description |
|---|---|
| `refresh routes` | Collect route tables from all devices |
| `refresh routes <device>` | Collect route table from one device |

---

## GOLDEN BASELINES

| Command | Description |
|---|---|
| `baseline list` | Show all baseline profiles |
| `baseline show <name>` | Show profile details |
| `baseline check <device>` | Evaluate device against baseline |
| `baseline remove <name>` | Delete profile (archived to history) |
| `baseline status` | Fleet baseline coverage summary |

---

## LIVE CONFIG

| Command | Description |
|---|---|
| `pulls` | Show fleet-wide pull count |
| `pulls <device>` | Show last 5 pull timestamps for device |
| `deploy <device>` | Open Deploy tab for device |
| `rollback <device>` | Trigger rollback for last verified deploy |
| `poll` | Show polling summary (schedules, active, drift events) |
| `poll start <device>` | Enable scheduled polling for device (optional interval in minutes) |
| `poll stop <device>` | Disable scheduled polling for device |

---

## DISCOVERY

| Command | Description |
|---|---|
| `discover` | Show blind discovery usage |
| `discover <ip>` | Open Blind Discovery dialog pre-filled with IP |

---

## THE FORGE

| Command | Description |
|---|---|
| `forge` | Open THE FORGE — interactive protocol workshop |
| `learn` | Open THE FORGE protocol learning engine |
| `learn <protocol>` | Open specific protocol module (e.g., `learn ospf`) |
| `learn <protocol> <vendor>` | Open protocol with vendor pre-selected (e.g., `learn ospf juniper`) |
| `compare` | Open THE FORGE comparator (all protocols) |
| `compare <protocol>` | Open comparator for a specific protocol (e.g., `compare ospf`) |
| `drill` | Start a drill session (due cards, all protocols) |
| `drill <protocol>` | Start a drill session for a specific protocol (e.g., `drill ospf`) |
| `drill <protocol> <vendor>` | Drill filtered by protocol and vendor (e.g., `drill ospf cisco`) |
| `drill weak` | Start a weak-cards drill session |
| `drill today` | Start a due-today drill session |
| `forge <protocol>` | Open THE FORGE canvas for a protocol (e.g., `forge ospf`) |
| `forge <protocol> <vendor>` | Open canvas with specific vendor (e.g., `forge ospf cisco`) |
| `forge <protocol> <vendor> <mode>` | Open canvas in mode: `watch`, `build`, `debug`, `translate` |
| `forge <protocol> <vendor> translate` | Open translation challenge (vendor-to-vendor) |
| `journal` | Open the Forge Journal |
| `journal <protocol>` | Open journal filtered by protocol |

---

*Total: 44 commands across 9 categories.*
