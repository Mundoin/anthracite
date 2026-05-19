import { describe, expect, it } from "vitest";
import {
  buildFieldReceipt,
  FIELD_RECEIPT_SCHEMA_VERSION,
  importDoneSummary,
  importFailedSummary,
  toReceiptJSON,
  toReceiptMarkdown,
} from "../sshFieldReceipt";
import { buildEvidenceHandoff } from "../sshEvidenceHandoff";
import type {
  CommandExecutionResult,
  DiscoveryRunOutcome,
  DiscoveryRunReport,
  DiscoveryTarget,
  ServerKeyObservation,
} from "../../../types/discoveryRunner";
import type { RawNeighborEvidenceImportResult } from "../../../types/topology";

const TARGET: DiscoveryTarget = {
  host: "10.0.0.1",
  port: 22,
  username: "admin",
  platform_hint: "iosxe",
  transport: "ssh",
  data_source_label: "lab-spine-01",
};

const PINNED_TS = "2026-05-19T13:00:00.000Z";

function cr(
  command: string,
  stdout: string,
  exit: number | null = 0,
  truncated = false,
): CommandExecutionResult {
  return {
    command,
    exit_code: exit,
    duration_ms: 10,
    stdout,
    stderr: "",
    output_truncated: truncated,
  };
}

function report(
  outcome: DiscoveryRunOutcome,
  server_key: ServerKeyObservation | null = null,
): DiscoveryRunReport {
  return {
    target_label: TARGET.data_source_label,
    platform_hint: TARGET.platform_hint,
    planned_command_count: 1,
    outcome,
    server_key,
  };
}

const OBSERVED_KEY: ServerKeyObservation = {
  algorithm: "ssh-ed25519",
  fingerprint_sha256: "SHA256:test-fingerprint-base64nopad",
  trust_mode: "tofu_session",
};

const APPROVED = ["show lldp neighbors detail", "show version"];

describe("buildFieldReceipt", () => {
  it("returns a captured receipt with sanitized command summaries", () => {
    const r = report({
      kind: "captured",
      command_results: [
        cr("show lldp neighbors detail", "Local Intf: Gi0/1\n"),
        cr("show version", "Cisco IOS XE Software"),
      ],
    });
    const handoff = buildEvidenceHandoff(TARGET, r);
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff,
      imports: [],
      generated_at: PINNED_TS,
    });
    expect(receipt.schema_version).toBe(FIELD_RECEIPT_SCHEMA_VERSION);
    expect(receipt.generated_at).toBe(PINNED_TS);
    expect(receipt.outcome.kind).toBe("captured");
    expect(receipt.command_summaries).toHaveLength(2);
    expect(receipt.command_summaries[0]).toMatchObject({
      command: "show lldp neighbors detail",
      exit_code: 0,
      duration_ms: 10,
      stdout_byte_length: "Local Intf: Gi0/1\n".length,
      stderr_byte_length: 0,
      output_truncated: false,
    });
    expect(receipt.handoff.importable_count).toBe(1);
    expect(receipt.imports).toEqual([]);
    expect(receipt.redaction.applied).toBe(true);
  });

  it("builds receipts for auth_failed / connection_failed / timeout / command_failed", () => {
    const cases: DiscoveryRunOutcome[] = [
      { kind: "auth_failed", reason_redacted: "authentication rejected" },
      { kind: "connection_failed", reason_redacted: "host unreachable" },
      { kind: "timeout", stage: "connect" },
      {
        kind: "command_failed",
        reason_redacted: "channel closed",
        partial_results: [cr("show lldp neighbors", "partial")],
      },
    ];
    for (const outcome of cases) {
      const r = report(outcome);
      const handoff = buildEvidenceHandoff(TARGET, r);
      const receipt = buildFieldReceipt({
        target: TARGET,
        approved_commands: APPROVED,
        report: r,
        handoff,
        imports: [],
        generated_at: PINNED_TS,
      });
      expect(receipt.outcome.kind).toBe(outcome.kind);
      if (outcome.kind === "auth_failed") {
        expect(receipt.outcome.detail).toBe("authentication rejected");
      }
      if (outcome.kind === "connection_failed") {
        expect(receipt.outcome.detail).toBe("host unreachable");
      }
      if (outcome.kind === "timeout") {
        expect(receipt.outcome.detail).toBe("stage:connect");
      }
      if (outcome.kind === "command_failed") {
        expect(receipt.command_summaries).toHaveLength(1);
        expect(receipt.outcome.detail).toBe("channel closed");
      }
    }
  });

  it("includes import summaries when operator imported a candidate", () => {
    const r = report({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "data")],
    });
    const importResult: RawNeighborEvidenceImportResult = {
      parsed_entries_total: 3,
      accepted_evidence_count: 2,
      rejected_count: 1,
      unresolved_count: 0,
      stored_evidence_count: 2,
      evidence_set_id: "es-7",
      accepted_evidence: [],
      rejected_entries: [],
    };
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [
        importDoneSummary("show lldp neighbors detail", importResult),
        importFailedSummary("show lldp neighbors detail", "store offline"),
      ],
      generated_at: PINNED_TS,
    });
    expect(receipt.imports).toHaveLength(2);
    expect(receipt.imports[0]?.status).toBe("done");
    expect(receipt.imports[0]?.accepted_evidence_count).toBe(2);
    expect(receipt.imports[0]?.evidence_set_id).toBe("es-7");
    expect(receipt.imports[1]?.status).toBe("failed");
    expect(receipt.imports[1]?.failure_reason).toBe("store offline");
  });

  it("is deterministic for the same input + pinned timestamp", () => {
    const r = report({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "abc")],
    });
    const a = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const b = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    expect(toReceiptJSON(a)).toBe(toReceiptJSON(b));
    expect(toReceiptMarkdown(a)).toBe(toReceiptMarkdown(b));
  });
});

describe("receipt sanitization invariants", () => {
  it("never contains raw stdout / stderr text in any serialized form", () => {
    const SENSITIVE = "RAW-OUTPUT-MARKER-XYZ-789";
    const r = report({
      kind: "captured",
      command_results: [
        cr("show lldp neighbors detail", `${SENSITIVE} Local Intf: Gi0/1`),
      ],
    });
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const json = toReceiptJSON(receipt);
    const md = toReceiptMarkdown(receipt);
    expect(json).not.toContain(SENSITIVE);
    expect(md).not.toContain(SENSITIVE);
  });

  it("never contains the word 'password' / 'private_key' / 'passphrase' as content", () => {
    // Receipt structure never emits these field names because they're
    // not part of any receipt-side type. This test would catch a
    // future regression that accidentally includes them.
    const r = report({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "data")],
    });
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const json = toReceiptJSON(receipt);
    // "password" and "passphrase" must NOT appear as keys or values.
    // (The list of omitted fields uses "password" / "private_key_pem"
    // / "passphrase" as values, so we expect them to appear ONLY in
    // the `fields_omitted` array. Verify by counting occurrences and
    // ensuring they only show up in the redaction section.)
    expect(json).toContain('"fields_omitted"');
    expect(json.split("\n").filter((line) => /\bpassword\b/.test(line)).length)
      .toBeLessThanOrEqual(1);
    expect(
      json.split("\n").filter((line) => /\bpassphrase\b/.test(line)).length,
    ).toBeLessThanOrEqual(1);
    expect(
      json.split("\n").filter((line) => /\bprivate_key_pem\b/.test(line)).length,
    ).toBeLessThanOrEqual(1);
  });

  it("includes operator-provided host / username verbatim (already product-visible)", () => {
    const r = report({
      kind: "captured",
      command_results: [],
    });
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const md = toReceiptMarkdown(receipt);
    expect(md).toContain("10.0.0.1");
    expect(md).toContain("admin");
    expect(md).toContain("lab-spine-01");
  });
});

describe("toReceiptMarkdown", () => {
  it("renders sections: target / commands / server key / handoff / imports / redaction", () => {
    const r = report({
      kind: "captured",
      command_results: [cr("show lldp neighbors detail", "data")],
    });
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const md = toReceiptMarkdown(receipt);
    expect(md).toContain("# SSH Field Smoke Receipt");
    expect(md).toContain("## Target");
    expect(md).toContain("## Approved commands");
    expect(md).toContain("## Command results");
    expect(md).toContain("## Server key trust");
    expect(md).toContain("## Evidence handoff");
    expect(md).toContain("## Imports");
    expect(md).toContain("## Redaction");
  });
});

describe("server_key_trust (V1BC)", () => {
  it("captured + observed key → server_key_trust.observed = true with fingerprint", () => {
    const r = report(
      {
        kind: "captured",
        command_results: [cr("show lldp neighbors detail", "data")],
      },
      OBSERVED_KEY,
    );
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    expect(receipt.server_key_trust.observed).toBe(true);
    if (receipt.server_key_trust.observed) {
      expect(receipt.server_key_trust.algorithm).toBe("ssh-ed25519");
      expect(receipt.server_key_trust.fingerprint_sha256).toBe(
        "SHA256:test-fingerprint-base64nopad",
      );
      expect(receipt.server_key_trust.trust_mode).toBe("tofu_session");
      expect(receipt.server_key_trust.persistence_note).toMatch(/TOFU/);
      expect(receipt.server_key_trust.persistence_note).toMatch(/not persisted/);
    }
  });

  it("missing server_key → observed = false with honest no-key note", () => {
    const r = report({ kind: "connection_failed", reason_redacted: "host unreachable" }, null);
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    expect(receipt.server_key_trust.observed).toBe(false);
    if (!receipt.server_key_trust.observed) {
      expect(receipt.server_key_trust.note).toMatch(/No server key/);
    }
  });

  it("auth_failed retains observed server key (handshake reached host-key step)", () => {
    const r = report(
      { kind: "auth_failed", reason_redacted: "authentication rejected" },
      OBSERVED_KEY,
    );
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    expect(receipt.server_key_trust.observed).toBe(true);
  });

  it("fingerprint appears in Markdown body when observed", () => {
    const r = report(
      { kind: "captured", command_results: [cr("show lldp neighbors detail", "data")] },
      OBSERVED_KEY,
    );
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const md = toReceiptMarkdown(receipt);
    expect(md).toContain("SHA256:test-fingerprint-base64nopad");
    expect(md).toContain("ssh-ed25519");
    expect(md).toContain("tofu_session");
  });

  it("Markdown renders observed:no path without leaking a fingerprint", () => {
    const r = report({ kind: "connection_failed", reason_redacted: "host unreachable" }, null);
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const md = toReceiptMarkdown(receipt);
    expect(md).toContain("Observed**: no");
    expect(md).not.toContain("SHA256:");
  });

  it("credentials still absent when server key is present", () => {
    const r = report(
      { kind: "captured", command_results: [cr("show lldp neighbors detail", "data")] },
      OBSERVED_KEY,
    );
    const receipt = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const json = toReceiptJSON(receipt);
    // password / private_key / passphrase must remain only in fields_omitted.
    expect(
      json.split("\n").filter((line) => /\bpassword\b/.test(line)).length,
    ).toBeLessThanOrEqual(1);
    expect(
      json.split("\n").filter((line) => /\bprivate_key_pem\b/.test(line)).length,
    ).toBeLessThanOrEqual(1);
    expect(
      json.split("\n").filter((line) => /\bpassphrase\b/.test(line)).length,
    ).toBeLessThanOrEqual(1);
  });

  it("is deterministic with identical server_key + pinned timestamp", () => {
    const r = report(
      { kind: "captured", command_results: [cr("show lldp neighbors detail", "abc")] },
      OBSERVED_KEY,
    );
    const a = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    const b = buildFieldReceipt({
      target: TARGET,
      approved_commands: APPROVED,
      report: r,
      handoff: buildEvidenceHandoff(TARGET, r),
      imports: [],
      generated_at: PINNED_TS,
    });
    expect(toReceiptJSON(a)).toBe(toReceiptJSON(b));
    expect(toReceiptMarkdown(a)).toBe(toReceiptMarkdown(b));
  });
});
