# Modes and Engines Map — Anthracite V1

> Companion to `ANTHRACITE_V1_SOURCE_OF_TRUTH.md`.
> Modes are operator surfaces. Engines own logic.
> A mode is only allowed to consume engines listed for it here. Adding a
> consumption relationship requires editing this file first.

Engine names below match `ENGINE_AND_API_BOUNDARIES.md`.

---

## HOME / WELCOME / Environment Command Centre

**Purpose.** The front door. Operator opens Anthracite into this surface,
not into topology. Selects environment, sees recent activity, posture
summary, and launches a mode.

**Workflows.**
- Environment selection and switching.
- Operator session bootstrap (AAA / audit identity).
- Recent activity, recent assessments, recent investigations summary.
- Quick search (Cortex Command Engine surface).
- Mode launcher.

**Consumes.** Environment Engine, AAA/RBAC/Audit Engine, Inventory Engine
(summary only), Cortex Command Engine, Reporting Engine (recent reports
list).

**Inputs.** Configured environments, operator identity.
**Outputs.** Active environment context, operator session, navigation
intent to a mode.

**Cross-mode dependencies.** Provides environment context to every other
mode. Other modes assume HOME has already set environment + session.

---

## BUILD / Architect's Desk

**Purpose.** Author and shape network intent. Compose vendor-aware design
artifacts, candidate configurations, and structural changes before they
hit OPERATE.

**Workflows.**
- Browse/edit inventory and intended structure.
- Draft candidate configurations.
- Validate drafts against compliance rules.
- Hand off artifacts to ASSESS or FORGE.

**Consumes.** Inventory Engine, Vendor Model Engine, Config Generation
Engine, Compliance Engine, Forge / Knowledge Engine (read), Reporting
Engine.

**Inputs.** Environment context (from HOME), inventory, vendor models,
operator-authored intent.
**Outputs.** Candidate configurations, design artifacts, validation
findings.

**Cross-mode dependencies.** OPERATE and ASSESS consume BUILD artifacts.
FORGE may consume drafts to template.

---

## OPERATE / War Room

**Purpose.** Live operations. Live posture of the environment, surfaced
events, controlled changes, day-to-day operator workflow.

**Workflows.**
- Live monitoring of devices, links, services.
- Event review and acknowledgement.
- Controlled config push/pull and diff.
- Sentinel anomaly review.
- Targeted handoff to DIAGNOSE.

**Consumes.** Monitoring/Polling Engine, Topology Engine, Sentinel Engine,
Config Pull/Diff Engine, Inventory Engine, AAA/RBAC/Audit Engine,
Reporting Engine, Cortex Command Engine.

**Inputs.** Live polling data, device state, sentinel signals.
**Outputs.** Operator actions (audited), change records, handoff packages
to DIAGNOSE / ASSESS.

**Cross-mode dependencies.** Feeds DIAGNOSE with evidence packages. Reads
BUILD-authored intent for compliance comparison.

---

## DIAGNOSE / INVESTIGATE / Forensic Lab

**Purpose.** Structured investigation. Capture evidence, run rule-driven
hypotheses, narrow root cause, produce a reportable finding.

**Workflows.**
- Open a case from an OPERATE event or manual entry.
- Collect evidence (configs, topology slice, polling snapshot,
  Sentinel signal trail).
- Run rule-based hypothesis evaluation.
- Record narrative, attach artifacts.
- Hand finding to Reporting or Forge.

**Consumes.** Diagnostic/Hypothesis Engine, Topology Engine, Monitoring/
Polling Engine, Config Pull/Diff Engine, Sentinel Engine, Inventory
Engine, Reporting Engine, AAA/RBAC/Audit Engine.

**Inputs.** Case scope, evidence snapshots, rule catalogue.
**Outputs.** Case record, hypothesis verdict, finding artifact.

**Cross-mode dependencies.** Cases originate in OPERATE or ASSESS.
Findings feed INTELLIGENCE and Reporting.

---

## INTELLIGENCE / Forge Library

**Purpose.** Browse the operator's knowledge base. Vendor model facts,
saved playbooks, published findings, reference artifacts.

**Workflows.**
- Browse / search library entries.
- Read vendor model details.
- Open published findings, playbooks, design notes.

**Consumes.** Forge / Knowledge Engine, Vendor Model Engine, Reporting
Engine (read), Cortex Command Engine.

**Inputs.** Library content.
**Outputs.** Read-only intelligence surface; navigation handoffs to BUILD
or FORGE.

**Cross-mode dependencies.** Reads artifacts produced by FORGE, DIAGNOSE,
and ASSESS.

---

## FORGE / Interactive Protocol Workshop

**Purpose.** Interactive authoring of protocols, playbooks, and
template-driven generated artifacts.

**Workflows.**
- Compose protocol/playbook drafts.
- Parameterise against vendor model + inventory.
- Generate artifacts deterministically.
- Publish to the Forge / Knowledge library.

**Consumes.** Forge / Knowledge Engine, Vendor Model Engine, Config
Generation Engine, Compliance Engine (validate), Inventory Engine,
Reporting Engine.

**Inputs.** Operator-authored drafts, vendor model, inventory.
**Outputs.** Published artifacts, deterministic generated outputs.

**Cross-mode dependencies.** Publishes to INTELLIGENCE. May read BUILD
drafts.

---

## ASSESS / One-Button Assessment

**Purpose.** Orchestrated end-to-end assessment of the environment. Runs
discovery, polling snapshot, compliance, diagnostic rules, and reporting
as a single workflow.

**Workflows.**
- Trigger assessment for the active environment.
- Orchestrate Discovery → Topology → Monitoring snapshot → Compliance →
  Diagnostic rules → Reporting.
- Produce a single composite assessment report.
- Hand off open cases to DIAGNOSE.

**Consumes.** Assessment Engine (orchestrator), plus everything it
orchestrates: Discovery Engine, Topology Engine, Monitoring/Polling
Engine, Inventory Engine, Vendor Model Engine, Compliance Engine,
Diagnostic/Hypothesis Engine, Config Pull/Diff Engine, Reporting Engine,
AAA/RBAC/Audit Engine.

**Inputs.** Environment context, assessment policy.
**Outputs.** Assessment report, open cases handed to DIAGNOSE.

**Top-bar status surface.** Whether ASSESS exposes a persistent top-bar
status indicator alongside the mode rail is **left open**. To be decided
once visual law and mode shell are prototyped. Until then, ASSESS is a
mode entry and a workflow only.

**Cross-mode dependencies.** Consumes nearly everything. Produces
artifacts read by INTELLIGENCE, DIAGNOSE, and Reporting.

---

## Cross-cutting

- **AAA / RBAC / Audit Engine** is consumed by every mode that records an
  operator action or surfaces protected data. Treated as ambient.
- **Cortex Command Engine** is the command/search surface available across
  HOME, OPERATE, and INTELLIGENCE. Deterministic command palette in V1.
- **Reporting Engine** is consumed wherever an artifact must be persisted
  for later reference (DIAGNOSE findings, ASSESS reports, FORGE outputs).
