import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { BatchRunExport } from "../../../types/batchRunExport";
import { AssessPanel } from "../AssessPanel";
import type { LoadResult } from "../loadBatchRunJson";

function makeArtifact(): BatchRunExport {
  return {
    export_version: 1,
    kind: "batch_run_export",
    batch_run_status: "complete",
    source: { kind: "paste" },
    summary: {
      total_count: 0,
      parsed_count: 0,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 0,
      clean_count: 0,
      severity_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    },
    generated_by: { app_name: "Anthracite", stage: "V1R" },
    versions: {
      validator_versions: [],
      rule_pack_versions: [],
      parser_versions: [],
      registry_versions: [],
    },
    devices: [],
    omitted: {
      raw_config_text: "omitted_by_default",
      detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt",
      finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt",
      device_model: "omitted_use_receipt_summary",
      timestamps: "omitted_for_determinism",
      batch_run_epoch: "omitted_frontend_control_only",
    },
  };
}

function okLoader(filename = "run.json") {
  return vi.fn(
    async (): Promise<LoadResult> => ({
      kind: "ok",
      artifact: makeArtifact(),
      filename,
    }),
  );
}

function errorLoader(reason: LoadResult extends { reason: infer R } ? R : never, message = "boom") {
  return vi.fn(
    async (): Promise<LoadResult> => ({
      kind: "error",
      reason: reason as never,
      message,
    }),
  );
}

function cancelledLoader() {
  return vi.fn(async (): Promise<LoadResult> => ({ kind: "cancelled" }));
}

describe("AssessPanel", () => {
  it("empty → click open → loader ok → loaded view renders", async () => {
    const loader = okLoader("happy.json");
    render(<AssessPanel loader={loader} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open assessment file" }),
    );
    await waitFor(() =>
      expect(loader).toHaveBeenCalled(),
    );
    await waitFor(() =>
      expect(screen.getByText("happy.json")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Close assessment" }),
    ).toBeInTheDocument();
  });

  it("empty → click open → loader cancelled → stay on empty (no error view)", async () => {
    const loader = cancelledLoader();
    render(<AssessPanel loader={loader} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open assessment file" }),
    );
    await waitFor(() => expect(loader).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: "Open assessment file" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Could not load file.")).not.toBeInTheDocument();
  });

  it("empty → click open → loader error → error view renders", async () => {
    const loader = errorLoader("invalid_json", "Unexpected token");
    render(<AssessPanel loader={loader} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open assessment file" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Could not load file.")).toBeInTheDocument(),
    );
    expect(screen.getByText("Unexpected token")).toBeInTheDocument();
  });

  it("loaded → click Close assessment → returns to empty", async () => {
    const loader = okLoader();
    render(<AssessPanel loader={loader} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open assessment file" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close assessment" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Close assessment" }),
    );
    expect(
      screen.getByRole("button", { name: "Open assessment file" }),
    ).toBeInTheDocument();
  });

  it("error → click Try another file → loader ok → loaded view renders", async () => {
    let attempt = 0;
    const loader = vi.fn(
      async (): Promise<LoadResult> => {
        attempt += 1;
        if (attempt === 1) {
          return { kind: "error", reason: "invalid_json", message: "x" };
        }
        return {
          kind: "ok",
          artifact: makeArtifact(),
          filename: "retry.json",
        };
      },
    );
    render(<AssessPanel loader={loader} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open assessment file" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Could not load file.")).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Try another file" }),
    );
    await waitFor(() =>
      expect(screen.getByText("retry.json")).toBeInTheDocument(),
    );
  });
});
