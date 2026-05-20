/**
 * V1BK — Seed Planner UI tests.
 *
 * Covers user-visible behavior: form add, validation surfacing, table
 * render, enable/disable, copy receipt.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeedPlannerPanel, type SeedPlannerClipboard, type SeedPlannerClock } from "../SeedPlannerPanel";

const FIXED_CLOCK: SeedPlannerClock = {
  now: () => "2026-05-20T00:00:00.000Z",
};

function makeClipboard(writeText = vi.fn().mockResolvedValue(undefined)): SeedPlannerClipboard {
  return { writeText };
}

async function fillFormAndAdd(
  user: ReturnType<typeof userEvent.setup>,
  opts: { host: string; port?: string; cred?: string },
): Promise<void> {
  await user.clear(screen.getByTestId("seed-planner-host"));
  await user.type(screen.getByTestId("seed-planner-host"), opts.host);
  if (opts.port !== undefined) {
    const portInputs = screen.getAllByRole("spinbutton");
    await user.clear(portInputs[0]);
    if (opts.port.length > 0) {
      await user.type(portInputs[0], opts.port);
    }
  }
  if (opts.cred !== undefined) {
    const credInput = screen
      .getAllByRole("textbox")
      .find((el) => (el as HTMLInputElement).placeholder === "lab-default");
    if (credInput) {
      await user.clear(credInput);
      if (opts.cred.length > 0) {
        await user.type(credInput, opts.cred);
      }
    }
  }
  await user.click(screen.getByTestId("seed-planner-add"));
}

describe("SeedPlannerPanel", () => {
  it("renders the panel root", () => {
    render(<SeedPlannerPanel clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("seed-planner")).toBeInTheDocument();
  });

  it("renders form and summary on first paint", () => {
    render(<SeedPlannerPanel clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("seed-planner-form")).toBeInTheDocument();
    expect(screen.getByTestId("seed-planner-summary")).toBeInTheDocument();
  });

  it("default next action is add_seed", () => {
    render(<SeedPlannerPanel clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("seed-planner-next-action").textContent).toBe(
      "add_seed",
    );
  });

  it("adding a valid ssh seed renders it in the table", async () => {
    const user = userEvent.setup();
    render(<SeedPlannerPanel clock={FIXED_CLOCK} clipboard={makeClipboard()} />);
    await fillFormAndAdd(user, {
      host: "10.0.0.1",
      port: "22",
      cred: "lab-default",
    });
    expect(screen.getByTestId("seed-planner-table")).toBeInTheDocument();
    expect(screen.getByTestId("seed-planner-active-count").textContent).toBe("1");
  });

  it("invalid port surfaces invalid badge", async () => {
    const user = userEvent.setup();
    render(<SeedPlannerPanel clock={FIXED_CLOCK} clipboard={makeClipboard()} />);
    await fillFormAndAdd(user, {
      host: "10.0.0.1",
      port: "70000",
      cred: "lab-default",
    });
    const issues = screen.getByTestId("seed-planner-issues");
    expect(issues).toBeInTheDocument();
    expect(issues.textContent ?? "").toMatch(/Port 70000/i);
  });

  it("seed missing credential label surfaces issue", async () => {
    const user = userEvent.setup();
    render(<SeedPlannerPanel clock={FIXED_CLOCK} clipboard={makeClipboard()} />);
    await fillFormAndAdd(user, {
      host: "10.0.0.1",
      port: "22",
      cred: "",
    });
    const issues = screen.getByTestId("seed-planner-issues");
    expect(issues.textContent ?? "").toMatch(/Credential profile label is required/i);
  });

  it("copy receipt calls clipboard.writeText with Markdown", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    render(
      <SeedPlannerPanel
        clock={FIXED_CLOCK}
        clipboard={{ writeText }}
      />,
    );
    await user.click(screen.getByTestId("seed-planner-copy"));
    expect(writeText).toHaveBeenCalledOnce();
    const md = String(writeText.mock.calls[0][0]);
    expect(md).toContain("# Discovery Seed Plan");
    expect(md.toLowerCase()).not.toContain("password");
    expect(md.toLowerCase()).not.toContain("private_key");
    expect(md.toLowerCase()).not.toContain("passphrase");
  });

  it("disabling a seed drops it from active count", async () => {
    const user = userEvent.setup();
    render(<SeedPlannerPanel clock={FIXED_CLOCK} clipboard={makeClipboard()} />);
    await fillFormAndAdd(user, {
      host: "10.0.0.1",
      port: "22",
      cred: "lab-default",
    });
    expect(screen.getByTestId("seed-planner-active-count").textContent).toBe("1");
    const toggle = screen.getAllByRole("button", { name: /Disable/i })[0];
    await user.click(toggle);
    expect(screen.getByTestId("seed-planner-active-count").textContent).toBe("0");
  });
});
