/**
 * V1BE — SSH Field Validation Pack tests.
 *
 * Covers all recommended-next-action branches, sanitization invariants,
 * and Markdown serialization.
 */

import { describe, expect, it } from "vitest";
import type { DiscoveryRunReport, DiscoveryTarget, ServerKeyPin } from "../../../types/discoveryRunner";
import type { FieldReceiptImportSummary } from "../sshFieldReceipt";
import type { EvidenceHandoffPlan } from "../sshEvidenceHandoff";
import {
  buildSshFieldValidationPack,
  toValidationPackMarkdown,
  type SshFieldValidationPackInput,
} from "../sshFieldValidationPack";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_TARGET: DiscoveryTarget = {
  host: "192.0.2.1",
  port: 22,
  username: "admin",
  platform_hint: "iosxe",
  transport: "ssh",
  data_source_label: "lab-router",
};

const OBS_KEY = {
  algorithm: "ssh-ed25519",
  fingerprint_sha256: "SHA256:abc123",
  trust_mode: "tofu_session" as const,
};

const PINNED_KEY: ServerKeyPin = {
  algorithm: "ssh-ed25519",
  fingerprint_sha256: "SHA256:abc123",
  first_seen_at: "2026-05-19T10:00:00Z",
  last_seen_at: "2026-05-19T10:00:00Z",
};

const DIFFERENT_PIN: ServerKeyPin = {
  algorithm: "ssh-ed25519",
  fingerprint_sha256: "SHA256:DIFFERENT",
  first_seen_at: "2026-05-19T09:00:00Z",
  last_seen_at: "2026-05-19T09:00:00Z",
};

const CAPTURED_REPORT: DiscoveryRunReport = {
  target_label: "lab-router",
  platform_hint: "iosxe",
  planned_command_count: 3,
  server_key: OBS_KEY,
  outcome: {
    kind: "captured",
    command_results: [
      {
        command: "show cdp neighbors detail",
        exit_code: 0,
        duration_ms: 120,
        stdout: "neighbor data",
        stderr: "",
        output_truncated: false,
      },
    ],
  },
};

const IMPORTABLE_HANDOFF: EvidenceHandoffPlan = {
  importable_count: 2,
  not_importable_count: 1,
  candidates: [],
};

const NO_HANDOFF: EvidenceHandoffPlan = {
  importable_count: 0,
  not_importable_count: 0,
  candidates: [],
};

function baseInput(
  overrides: Partial<SshFieldValidationPackInput> = {},
): SshFieldValidationPackInput {
  return {
    target: BASE_TARGET,
    report: null,
    serverKeyPin: null,
    handoff: null,
    imports: [],
    ...overrides,
  };
}

function report(
  kind: DiscoveryRunReport["outcome"]["kind"],
  extra: Partial<DiscoveryRunReport> = {},
): DiscoveryRunReport {
  const outcome = (() => {
    switch (kind) {
      case "captured":
        return { kind: "captured" as const, command_results: [] };
      case "auth_failed":
        return { kind: "auth_failed" as const, reason_redacted: "auth error" };
      case "connection_failed":
        return { kind: "connection_failed" as const, reason_redacted: "refused" };
      case "timeout":
        return { kind: "timeout" as const, stage: "connect" };
      case "refused":
        return { kind: "refused" as const, reason: "port closed" };
      case "transport_deferred":
        return { kind: "transport_deferred" as const, reason: "deferred" };
      case "command_failed":
        return {
          kind: "command_failed" as const,
          partial_results: [],
          reason_redacted: "partial fail",
        };
    }
  })();
  return {
    target_label: "lab-router",
    platform_hint: "iosxe",
    planned_command_count: 2,
    ...extra,
    outcome,
  };
}

function doneImport(cmd = "show cdp neighbors detail"): FieldReceiptImportSummary {
  return {
    command: cmd,
    status: "done",
    accepted_evidence_count: 3,
    rejected_count: 0,
    stored_evidence_count: 3,
    evidence_set_id: "evset-1",
    failure_reason: null,
  };
}

function failedImport(cmd = "show cdp neighbors detail"): FieldReceiptImportSummary {
  return {
    command: cmd,
    status: "failed",
    accepted_evidence_count: null,
    rejected_count: null,
    stored_evidence_count: null,
    evidence_set_id: null,
    failure_reason: "parse error",
  };
}

// ---------------------------------------------------------------------------
// target_identity edge cases
// ---------------------------------------------------------------------------

describe("buildSshFieldValidationPack — target_identity", () => {
  it("empty host → 'no target selected'", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ target: { ...BASE_TARGET, host: "" } }),
    );
    expect(pack.target_identity).toBe("no target selected");
  });

  it("whitespace-only host → 'no target selected'", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ target: { ...BASE_TARGET, host: "   " } }),
    );
    expect(pack.target_identity).toBe("no target selected");
  });

  it("host present, empty label → no parentheses", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ target: { ...BASE_TARGET, data_source_label: "" } }),
    );
    expect(pack.target_identity).toBe("192.0.2.1:22");
    expect(pack.target_identity).not.toContain("()");
  });

  it("host and label present → 'host:port (label)'", () => {
    const pack = buildSshFieldValidationPack(baseInput());
    expect(pack.target_identity).toBe("192.0.2.1:22 (lab-router)");
  });

  it("non-standard port included in identity", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ target: { ...BASE_TARGET, port: 2222 } }),
    );
    expect(pack.target_identity).toBe("192.0.2.1:2222 (lab-router)");
  });
});

// ---------------------------------------------------------------------------
// next_action rules
// ---------------------------------------------------------------------------

describe("buildSshFieldValidationPack — next_action", () => {
  it("no run → run_ssh_capture", () => {
    const pack = buildSshFieldValidationPack(baseInput());
    expect(pack.next_action).toBe("run_ssh_capture");
  });

  it("transport_deferred → run_ssh_capture", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: report("transport_deferred") }),
    );
    expect(pack.next_action).toBe("run_ssh_capture");
  });

  it("connection_failed → fix_reachability", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: report("connection_failed") }),
    );
    expect(pack.next_action).toBe("fix_reachability");
  });

  it("refused → fix_reachability", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: report("refused") }),
    );
    expect(pack.next_action).toBe("fix_reachability");
  });

  it("timeout → fix_reachability", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: report("timeout") }),
    );
    expect(pack.next_action).toBe("fix_reachability");
  });

  it("auth_failed → fix_auth", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: report("auth_failed") }),
    );
    expect(pack.next_action).toBe("fix_auth");
  });

  it("key changed takes priority over auth failure", () => {
    const r = report("auth_failed", { server_key: OBS_KEY });
    const pack = buildSshFieldValidationPack(
      baseInput({ report: r, serverKeyPin: DIFFERENT_PIN }),
    );
    expect(pack.next_action).toBe("investigate_key_change");
  });

  it("captured + unpinned → pin_server_key", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT, serverKeyPin: null }),
    );
    expect(pack.next_action).toBe("pin_server_key");
  });

  it("captured + matched key → move to evidence work", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({
        report: CAPTURED_REPORT,
        serverKeyPin: PINNED_KEY,
        handoff: IMPORTABLE_HANDOFF,
      }),
    );
    // matched + importable candidates + no imports
    expect(pack.next_action).toBe("import_evidence");
  });

  it("captured + changed key → investigate_key_change", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT, serverKeyPin: DIFFERENT_PIN }),
    );
    expect(pack.next_action).toBe("investigate_key_change");
  });

  it("captured + matched + no importable candidates → review_command_coverage", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({
        report: CAPTURED_REPORT,
        serverKeyPin: PINNED_KEY,
        handoff: NO_HANDOFF,
      }),
    );
    expect(pack.next_action).toBe("review_command_coverage");
  });

  it("captured + importable candidates + successful import → review_topology", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({
        report: CAPTURED_REPORT,
        serverKeyPin: PINNED_KEY,
        handoff: IMPORTABLE_HANDOFF,
        imports: [doneImport()],
      }),
    );
    expect(pack.next_action).toBe("review_topology");
  });

  it("captured + failed import only → inspect_import_error", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({
        report: CAPTURED_REPORT,
        serverKeyPin: PINNED_KEY,
        handoff: IMPORTABLE_HANDOFF,
        imports: [failedImport()],
      }),
    );
    expect(pack.next_action).toBe("inspect_import_error");
  });

  it("partial import (success + failure) → inspect_import_error", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({
        report: CAPTURED_REPORT,
        serverKeyPin: PINNED_KEY,
        handoff: IMPORTABLE_HANDOFF,
        imports: [doneImport("cmd1"), failedImport("cmd2")],
      }),
    );
    expect(pack.next_action).toBe("inspect_import_error");
  });
});

// ---------------------------------------------------------------------------
// Field accuracy
// ---------------------------------------------------------------------------

describe("buildSshFieldValidationPack — fields", () => {
  it("target_identity includes host, port, and label", () => {
    const pack = buildSshFieldValidationPack(baseInput());
    expect(pack.target_identity).toBe("192.0.2.1:22 (lab-router)");
  });

  it("no run → run_outcome null, planned_command_count null", () => {
    const pack = buildSshFieldValidationPack(baseInput());
    expect(pack.run_outcome).toBeNull();
    expect(pack.planned_command_count).toBeNull();
  });

  it("server key fields populated when observed", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT }),
    );
    expect(pack.server_key_observed).toBe(true);
    expect(pack.server_key_algorithm).toBe("ssh-ed25519");
    expect(pack.server_key_fingerprint).toBe("SHA256:abc123");
    expect(pack.server_key_pin_status).toBe("unpinned");
  });

  it("no server key → observed false, key fields null", () => {
    const r: DiscoveryRunReport = {
      ...CAPTURED_REPORT,
      server_key: null,
    };
    const pack = buildSshFieldValidationPack(baseInput({ report: r }));
    expect(pack.server_key_observed).toBe(false);
    expect(pack.server_key_algorithm).toBeNull();
    expect(pack.server_key_fingerprint).toBeNull();
    expect(pack.server_key_pin_status).toBeNull();
  });

  it("matched pin → pin_already_completed true, pin_action_available false", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT, serverKeyPin: PINNED_KEY }),
    );
    expect(pack.pin_already_completed).toBe(true);
    expect(pack.pin_action_available).toBe(false);
  });

  it("unpinned → pin_action_available true, pin_already_completed false", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT }),
    );
    expect(pack.pin_action_available).toBe(true);
    expect(pack.pin_already_completed).toBe(false);
  });

  it("changed → pin_action_available true", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT, serverKeyPin: DIFFERENT_PIN }),
    );
    expect(pack.pin_action_available).toBe(true);
  });

  it("import counts accurate", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({
        report: CAPTURED_REPORT,
        serverKeyPin: PINNED_KEY,
        handoff: IMPORTABLE_HANDOFF,
        imports: [doneImport("c1"), doneImport("c2"), failedImport("c3")],
      }),
    );
    expect(pack.import_attempt_count).toBe(3);
    expect(pack.import_success_count).toBe(2);
    expect(pack.import_failure_count).toBe(1);
  });

  it("handoff candidate counts reflect handoff plan", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({
        report: CAPTURED_REPORT,
        serverKeyPin: PINNED_KEY,
        handoff: IMPORTABLE_HANDOFF,
      }),
    );
    expect(pack.importable_candidate_count).toBe(2);
    expect(pack.not_importable_candidate_count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Sanitization — Markdown must not contain secrets or raw output
// ---------------------------------------------------------------------------

describe("toValidationPackMarkdown — sanitization", () => {
  it("Markdown does not contain raw stdout/stderr content", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT }),
    );
    const md = toValidationPackMarkdown(pack);
    // CAPTURED_REPORT stdout is "neighbor data" — must not appear
    expect(md).not.toContain("neighbor data");
  });

  it("Markdown does not contain password placeholder or credential words", () => {
    const pack = buildSshFieldValidationPack(baseInput());
    const md = toValidationPackMarkdown(pack);
    expect(md).not.toMatch(/password/i);
    expect(md).not.toMatch(/private_key/i);
    expect(md).not.toMatch(/passphrase/i);
  });

  it("Markdown contains target identity and next_action", () => {
    const pack = buildSshFieldValidationPack(baseInput());
    const md = toValidationPackMarkdown(pack);
    expect(md).toContain("192.0.2.1:22 (lab-router)");
    expect(md).toContain("run_ssh_capture");
  });

  it("Markdown includes fingerprint when key observed", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT }),
    );
    const md = toValidationPackMarkdown(pack);
    expect(md).toContain("SHA256:abc123");
  });

  it("Markdown includes pin status line when key observed", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT }),
    );
    const md = toValidationPackMarkdown(pack);
    expect(md).toContain("Pin status");
    expect(md).toContain("unpinned");
  });

  it("Markdown includes recommended next action detail", () => {
    const pack = buildSshFieldValidationPack(
      baseInput({ report: CAPTURED_REPORT, serverKeyPin: DIFFERENT_PIN }),
    );
    const md = toValidationPackMarkdown(pack);
    expect(md).toContain("investigate_key_change");
    expect(md).toContain("Investigate host identity");
  });
});
