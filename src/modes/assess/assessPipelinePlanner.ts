/**
 * V1BL — Assess Pipeline Planner.
 *
 * Deterministic local pipeline planner model. No live discovery, no SNMP polling,
 * no config pull, no compliance execution, no PDF generation.
 *
 * Inputs: profile (label, seed source, includes, credentials/snmp/rule/report labels),
 * counts (seed_count, expected_devices, known_platforms).
 *
 * Outputs: 7 immutable pipeline steps in fixed order + next-action priority.
 */

export type AssessSeedSource = "manual" | "discovery_seed_plan" | "crawl_preview";

export interface AssessProfile {
  readonly label: string;
  readonly seed_source: AssessSeedSource;
  readonly include_snmp_poll: boolean;
  readonly include_config_pull: boolean;
  readonly include_compliance_scan: boolean;
  readonly include_topology_map: boolean;
  readonly include_anomaly_flag: boolean;
  readonly include_report_export: boolean;
  readonly credential_profile_label: string; // LABEL only, no secrets
  readonly snmp_profile_label: string; // LABEL only
  readonly rule_pack_label: string;
  readonly report_profile_label: string;
}

export interface AssessProfileCounts {
  readonly seed_count: number;
  readonly expected_devices: number;
  readonly known_platforms: number;
}

export type PipelineStepId =
  | "discovery"
  | "snmp_poll"
  | "config_pull"
  | "compliance_scan"
  | "topology_map"
  | "anomaly_flag"
  | "report_export";

export type StepReadiness =
  | "ready"
  | "missing_input"
  | "deferred_engine"
  | "blocked"
  | "skipped";

export interface PipelineStep {
  readonly id: PipelineStepId;
  readonly label: string;
  readonly order: number; // 1..7
  readonly readiness: StepReadiness;
  readonly missing_inputs: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

export type AssessPipelineNextAction =
  | "add_seeds"
  | "attach_credentials"
  | "attach_snmp_profile"
  | "choose_rule_pack"
  | "choose_report_profile"
  | "ready_for_future_assessment_run";

export interface AssessPipelinePlanSummary {
  readonly profile: AssessProfile;
  readonly counts: AssessProfileCounts;
  readonly steps: ReadonlyArray<PipelineStep>; // always 7, ordered
  readonly missing_inputs: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly next_action: AssessPipelineNextAction;
  readonly generated_at: string;
}

export const ASSESS_PIPELINE_NEXT_ACTION_DETAILS: Record<
  AssessPipelineNextAction,
  string
> = {
  add_seeds:
    "No seeds provided. Add seeds via Discovery seed plan, crawl preview, or manual seed list.",
  attach_credentials:
    "Config Pull is enabled but no credential profile is attached.",
  attach_snmp_profile:
    "SNMP Poll is enabled but no SNMP profile is attached.",
  choose_rule_pack:
    "Compliance Scan is enabled but no rule pack is selected.",
  choose_report_profile:
    "Report is enabled but no report profile is selected.",
  ready_for_future_assessment_run:
    "Pipeline configuration is complete. Ready to run assessment (when engines are wired).",
};

/**
 * Compute readiness and missing inputs for a single step.
 */
function evaluateStep(
  stepId: PipelineStepId,
  profile: AssessProfile,
  counts: AssessProfileCounts,
): { readiness: StepReadiness; missing_inputs: ReadonlyArray<string>; notes: ReadonlyArray<string> } {

  switch (stepId) {
    case "discovery":
      if (counts.seed_count === 0) {
        return {
          readiness: "missing_input",
          missing_inputs: ["Seeds (via Discovery seed plan / crawl preview)"],
          notes: [],
        };
      }
      return {
        readiness: "deferred_engine",
        missing_inputs: [],
        notes: ["discovery execution engine not wired"],
      };

    case "snmp_poll":
      if (!profile.include_snmp_poll) {
        return { readiness: "skipped", missing_inputs: [], notes: [] };
      }
      if (!profile.snmp_profile_label) {
        return {
          readiness: "missing_input",
          missing_inputs: ["SNMP profile label"],
          notes: [],
        };
      }
      return {
        readiness: "deferred_engine",
        missing_inputs: [],
        notes: ["SNMP poller deferred"],
      };

    case "config_pull":
      if (!profile.include_config_pull) {
        return { readiness: "skipped", missing_inputs: [], notes: [] };
      }
      if (!profile.credential_profile_label) {
        return {
          readiness: "missing_input",
          missing_inputs: ["Credential profile label"],
          notes: [],
        };
      }
      return {
        readiness: "deferred_engine",
        missing_inputs: [],
        notes: [],
      };

    case "compliance_scan":
      if (!profile.include_compliance_scan) {
        return { readiness: "skipped", missing_inputs: [], notes: [] };
      }
      if (!profile.rule_pack_label) {
        return {
          readiness: "missing_input",
          missing_inputs: ["Rule pack label"],
          notes: [],
        };
      }
      return {
        readiness: "deferred_engine",
        missing_inputs: [],
        notes: [],
      };

    case "topology_map":
      if (!profile.include_topology_map) {
        return { readiness: "skipped", missing_inputs: [], notes: [] };
      }
      return {
        readiness: "deferred_engine",
        missing_inputs: [],
        notes: [],
      };

    case "anomaly_flag":
      if (!profile.include_anomaly_flag) {
        return { readiness: "skipped", missing_inputs: [], notes: [] };
      }
      return {
        readiness: "deferred_engine",
        missing_inputs: [],
        notes: [],
      };

    case "report_export":
      if (!profile.include_report_export) {
        return { readiness: "skipped", missing_inputs: [], notes: [] };
      }
      if (!profile.report_profile_label) {
        return {
          readiness: "deferred_engine",
          missing_inputs: [],
          notes: ["Report profile label not set — defaulting to summary report"],
        };
      }
      return {
        readiness: "deferred_engine",
        missing_inputs: [],
        notes: [],
      };
  }
}

/**
 * Build the complete 7-step pipeline plan.
 */
export function buildAssessPipelinePlan(
  profile: AssessProfile,
  counts: AssessProfileCounts,
  generated_at: string,
): AssessPipelinePlanSummary {
  const stepIds: readonly PipelineStepId[] = [
    "discovery",
    "snmp_poll",
    "config_pull",
    "compliance_scan",
    "topology_map",
    "anomaly_flag",
    "report_export",
  ];

  const stepLabels: Record<PipelineStepId, string> = {
    discovery: "Discovery",
    snmp_poll: "SNMP Poll",
    config_pull: "Config Pull",
    compliance_scan: "Compliance Scan",
    topology_map: "Topology Map",
    anomaly_flag: "Anomaly Flag",
    report_export: "Report",
  };

  const steps: PipelineStep[] = [];
  const allMissingInputs = new Set<string>();
  const warnings: string[] = [];

  for (let i = 0; i < stepIds.length; i++) {
    const id = stepIds[i];
    const { readiness, missing_inputs, notes } = evaluateStep(id, profile, counts);

    steps.push({
      id,
      label: stepLabels[id],
      order: i + 1,
      readiness,
      missing_inputs,
      notes,
    });

    missing_inputs.forEach((inp) => allMissingInputs.add(inp));

    // Collect warnings (non-blocking notes for report_export)
    if (id === "report_export" && profile.include_report_export && !profile.report_profile_label) {
      warnings.push("Report profile label not set — defaulting to summary report");
    }
  }

  // Determine next action (priority order)
  let nextAction: AssessPipelineNextAction = "ready_for_future_assessment_run";

  if (counts.seed_count === 0) {
    nextAction = "add_seeds";
  } else if (profile.include_config_pull && !profile.credential_profile_label) {
    nextAction = "attach_credentials";
  } else if (profile.include_snmp_poll && !profile.snmp_profile_label) {
    nextAction = "attach_snmp_profile";
  } else if (profile.include_compliance_scan && !profile.rule_pack_label) {
    nextAction = "choose_rule_pack";
  } else if (profile.include_report_export && !profile.report_profile_label) {
    nextAction = "choose_report_profile";
  }

  return {
    profile,
    counts,
    steps: steps as readonly PipelineStep[],
    missing_inputs: Array.from(allMissingInputs).sort(),
    warnings,
    next_action: nextAction,
    generated_at,
  };
}

/**
 * Convert pipeline plan to Markdown with secret guard.
 */
export function toAssessPipelinePlanMarkdown(summary: AssessPipelinePlanSummary): string {
  const { profile, counts, steps, missing_inputs, warnings, next_action } = summary;

  // Secret guard: redact sensitive keywords in labels
  const redactSecrets = (text: string): string =>
    text.replace(
      /password|private_key|passphrase|secret/gi,
      "[REDACTED]",
    );

  const includes = [
    profile.include_snmp_poll && "SNMP Poll",
    profile.include_config_pull && "Config Pull",
    profile.include_compliance_scan && "Compliance Scan",
    profile.include_topology_map && "Topology Map",
    profile.include_anomaly_flag && "Anomaly Flag",
    profile.include_report_export && "Report Export",
  ]
    .filter(Boolean)
    .join(", ");

  const profileSection = `## Profile

**Label:** ${redactSecrets(profile.label)}
**Seed Source:** ${profile.seed_source}
**Includes:** ${includes || "(none — discovery only)"}`;

  const countsSection = `## Counts

- Seeds: ${counts.seed_count}
- Expected Devices: ${counts.expected_devices}
- Known Platforms: ${counts.known_platforms}`;

  const stepsTableHeader = `## Pipeline Steps

| Order | Step | Readiness | Missing Inputs | Notes |
|-------|------|-----------|----------------|-------|`;

  const stepsTableRows = steps
    .map(
      (step) =>
        `| ${step.order} | ${step.label} | ${step.readiness} | ${step.missing_inputs.join("; ") || "(none)"} | ${step.notes.join("; ") || "(none)"} |`,
    )
    .join("\n");

  const stepsTable = [stepsTableHeader, stepsTableRows].join("\n");

  const missingSection =
    missing_inputs.length > 0
      ? `## Missing Inputs\n\n${missing_inputs.map((inp) => `- ${inp}`).join("\n")}`
      : "";

  const warningsSection =
    warnings.length > 0
      ? `## Warnings\n\n${warnings.map((w) => `- ${w}`).join("\n")}`
      : "";

  const nextActionDetail = ASSESS_PIPELINE_NEXT_ACTION_DETAILS[next_action];
  const nextActionSection = `## Next Action

**${next_action.replace(/_/g, " ").toUpperCase()}**

${nextActionDetail}`;

  const honestyFooter = `> Local pipeline plan only — no live discovery, no config pull, no SNMP polling, no compliance execution, no PDF generated.`;

  const sections = [
    "# Assess Pipeline Plan",
    "",
    profileSection,
    "",
    countsSection,
    "",
    stepsTable,
    "",
    missingSection && missingSection + "\n",
    warningsSection && warningsSection + "\n",
    nextActionSection,
    "",
    honestyFooter,
  ]
    .filter((s) => s !== "")
    .join("\n");

  return sections;
}
