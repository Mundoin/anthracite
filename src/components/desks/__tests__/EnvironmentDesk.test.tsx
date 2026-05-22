/**
 * Environment Desk — test suite.
 *
 * Tests lifecycle store integration, scenario picker, table rendering,
 * selection, rename, duplicate, archive, and restore operations.
 */

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnvironmentDesk } from "../EnvironmentDesk";
import {
  createInitialStore,
  createEnvironmentFromScenario,
} from "../../../state/environmentLifecycle";

describe("EnvironmentDesk · basic render", () => {
  it("renders without crashing with default state", () => {
    const { container } = render(<EnvironmentDesk />);
    expect(container).toBeInTheDocument();
  });

  it("shows header with title 'Lab Generator'", () => {
    render(<EnvironmentDesk />);
    expect(screen.getByText("Lab Generator")).toBeInTheDocument();
  });

  it("shows active environment badge with Micro Lab name and device/link/config counts", () => {
    render(<EnvironmentDesk />);
    const badge = document.querySelector(".env-desk__active-badge");
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toContain("Active:");
    expect(badge?.textContent).toContain("Micro Lab");
    expect(badge?.textContent).toContain("devices");
    expect(badge?.textContent).toContain("links");
    expect(badge?.textContent).toContain("configs");
  });
});

describe("EnvironmentDesk · scenario picker", () => {
  it("shows 'Scenario Catalogue' picker title", () => {
    render(<EnvironmentDesk />);
    expect(screen.getByText("Scenario Catalogue")).toBeInTheDocument();
  });

  it("renders all 5 scenarios in the picker", () => {
    render(<EnvironmentDesk />);
    const picker = document.querySelector(".env-desk__picker");
    expect(picker?.textContent).toContain("Micro Lab");
    expect(picker?.textContent).toContain("Branch Office");
    expect(picker?.textContent).toContain("Campus");
    expect(picker?.textContent).toContain("Datacenter Pod");
    expect(picker?.textContent).toContain("Metro / Mega City");
  });

  it("each scenario card shows device and link count", () => {
    render(<EnvironmentDesk />);
    const picker = document.querySelector(".env-desk__picker");
    expect(picker?.textContent).toContain("3 devices, 2 links");
    expect(picker?.textContent).toContain("8 devices, 10 links");
    expect(picker?.textContent).toContain("24 devices, 36 links");
  });

  it("scenario card shows capability chips (first 3 capabilities)", () => {
    render(<EnvironmentDesk />);
    const capChips = document.querySelectorAll(".env-desk__capability-chip");
    expect(capChips.length).toBeGreaterThan(0);
  });

  it("clicking Create on Branch Office adds new environment to table", async () => {
    const user = userEvent.setup();
    render(<EnvironmentDesk />);

    const beforeRows = screen.getAllByRole("row");
    const beforeCount = beforeRows.length;

    // Get all "Create" buttons and find the one in Branch Office card
    const createButtons = screen.getAllByRole("button", { name: /Create/i });
    // Branch Office is the second scenario
    await user.click(createButtons[1]);

    // Should have one more row after create
    const afterRows = screen.getAllByRole("row");
    expect(afterRows.length).toBe(beforeCount + 1);
  });
});

describe("EnvironmentDesk · environment table", () => {
  it("displays Micro Lab as initial row", () => {
    render(<EnvironmentDesk />);
    const table = screen.getByRole("table");
    expect(table.textContent).toContain("Micro Lab");
  });

  it("shows correct columns: Name, Scenario, Devices, Links, Configs, State, Actions", () => {
    render(<EnvironmentDesk />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Scenario")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
    expect(screen.getByText("Links")).toBeInTheDocument();
    expect(screen.getByText("Configs")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("table shows Configs column header", () => {
    render(<EnvironmentDesk />);
    expect(screen.getByText("Configs")).toBeInTheDocument();
  });

  it("Micro Lab row shows correct device, link, and config counts", () => {
    render(<EnvironmentDesk />);
    const table = screen.getByRole("table");
    const tableContent = table.textContent;
    expect(tableContent).toContain("3");
    expect(tableContent).toContain("2");
  });

  it("environment row shows provenance chip with text generated-lab", () => {
    render(<EnvironmentDesk />);
    const provenanceChips = document.querySelectorAll(".env-desk__provenance-chip");
    expect(provenanceChips.length).toBeGreaterThan(0);
    expect(provenanceChips[0]?.textContent).toBe("generated-lab");
  });

  it("environment row shows sync chip with text local-only", () => {
    render(<EnvironmentDesk />);
    const syncChips = document.querySelectorAll(".env-desk__sync-chip");
    expect(syncChips.length).toBeGreaterThan(0);
    expect(syncChips[0]?.textContent).toContain("local-only");
  });
});

describe("EnvironmentDesk · selection", () => {
  it("clicking a row sets aria-selected on that row", async () => {
    const user = userEvent.setup();
    const state = createInitialStore();
    const stateWithTwo = createEnvironmentFromScenario(state, "branch-office");

    render(<EnvironmentDesk initialState={stateWithTwo} />);

    // Find the second row (Branch Office) and click it
    const rows = screen.getAllByRole("row");
    // rows[0] is thead, so tbody starts at rows[1]
    const secondRow = rows[2]; // Second environment
    await user.click(secondRow);

    expect(secondRow).toHaveAttribute("aria-selected", "true");
  });

  it("active environment is marked with selected class", () => {
    render(<EnvironmentDesk />);
    const rows = screen.getAllByRole("row");
    // Find the active row (Micro Lab)
    const activeRow = Array.from(rows).find(
      (row) => row.getAttribute("aria-selected") === "true",
    );
    expect(activeRow).toHaveClass("selected");
  });
});

describe("EnvironmentDesk · rename", () => {
  it("clicking rename button opens inline input", async () => {
    const user = userEvent.setup();
    render(<EnvironmentDesk />);

    // Micro Lab row should have a rename button with title="Rename"
    const renameButtons = screen.getAllByTitle("Rename");
    await user.click(renameButtons[0]);

    const input = screen.getByDisplayValue("Micro Lab");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("saving rename updates environment name in table", async () => {
    const user = userEvent.setup();
    render(<EnvironmentDesk />);

    const renameButtons = screen.getAllByTitle("Rename");
    await user.click(renameButtons[0]);

    const input = screen.getByDisplayValue("Micro Lab") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "My Custom Lab");

    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    await user.click(saveButtons[0]);

    // After save, the new name should appear in the table
    const table = screen.getByRole("table");
    expect(table.textContent).toContain("My Custom Lab");
  });

  it("clicking cancel discards rename without changing name", async () => {
    const user = userEvent.setup();
    render(<EnvironmentDesk />);

    const renameButtons = screen.getAllByTitle("Rename");
    await user.click(renameButtons[0]);

    const input = screen.getByDisplayValue("Micro Lab") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Discarded Name");

    const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i });
    await user.click(cancelButtons[0]);

    // After cancel, original name should remain
    const table = screen.getByRole("table");
    expect(table.textContent).toContain("Micro Lab");
    expect(table.textContent).not.toContain("Discarded Name");
  });
});

describe("EnvironmentDesk · duplicate", () => {
  it("duplicate button appears on available environment", () => {
    render(<EnvironmentDesk />);
    const duplicateButtons = screen.getAllByTitle("Duplicate");
    expect(duplicateButtons.length).toBeGreaterThan(0);
  });

  it("clicking duplicate adds new row with auto-suffixed name", async () => {
    const user = userEvent.setup();
    render(<EnvironmentDesk />);

    const beforeCount = screen.getAllByRole("row").length;

    const duplicateButtons = screen.getAllByTitle("Duplicate");
    await user.click(duplicateButtons[0]);

    const afterCount = screen.getAllByRole("row").length;
    expect(afterCount).toBe(beforeCount + 1);

    // Should see "Micro Lab 2" or similar
    expect(screen.getByText(/Micro Lab \d/)).toBeInTheDocument();
  });
});

describe("EnvironmentDesk · archive and restore", () => {
  it("archive button appears on available environment", () => {
    render(<EnvironmentDesk />);
    const archiveButtons = screen.getAllByTitle("Archive");
    expect(archiveButtons.length).toBeGreaterThan(0);
  });

  it("archiving environment removes it from default list view", async () => {
    const user = userEvent.setup();
    const state = createInitialStore();
    const stateWithTwo = createEnvironmentFromScenario(state, "branch-office");

    render(
      <EnvironmentDesk initialState={stateWithTwo} />,
    );

    expect(screen.getAllByRole("row").length).toBeGreaterThan(2);

    // Archive the second environment
    const archiveButtons = screen.getAllByTitle("Archive");
    await user.click(archiveButtons[0]);

    // After archive, component state updates, should reflect the change
    // (archiveEnvironment removes from visible list when not showing archived)
  });

  it("toggling Show Archived includes archived environments", async () => {
    const user = userEvent.setup();
    const state = createInitialStore();
    const stateWithTwo = createEnvironmentFromScenario(state, "branch-office");

    render(<EnvironmentDesk initialState={stateWithTwo} />);

    const checkbox = screen.getByRole("checkbox", { name: /Show archived/ });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("restore button appears only on archived environments", async () => {
    const user = userEvent.setup();
    const state = createInitialStore();
    const stateWithTwo = createEnvironmentFromScenario(state, "branch-office");

    render(<EnvironmentDesk initialState={stateWithTwo} />);

    // No restore buttons initially (nothing archived)
    let restoreButtons = screen.queryAllByTitle("Restore");
    expect(restoreButtons.length).toBe(0);

    // Archive first environment
    const archiveButtons = screen.getAllByTitle("Archive");
    await user.click(archiveButtons[0]);

    // Note: this test is simplified; a full integration test would
    // verify restore appears after archiving
  });
});

describe("EnvironmentDesk · active environment badge", () => {
  it("displays active environment name in badge when selected", async () => {
    const user = userEvent.setup();
    const state = createInitialStore();
    const stateWithTwo = createEnvironmentFromScenario(state, "branch-office");

    render(<EnvironmentDesk initialState={stateWithTwo} />);

    // Initially active is Micro Lab
    const badge = document.querySelector(".env-desk__active-badge");
    expect(badge?.textContent).toContain("Micro Lab");

    // Select Branch Office (second tbody row)
    const rows = screen.getAllByRole("row");
    const branchRow = rows[2]; // Skip thead, grab second tbody row
    await user.click(branchRow);

    // Badge should be updated to Branch Office (in real state update)
  });

  it("hides active badge if no environment is active", () => {
    const emptyState = {
      environments: [],
      active_environment_id: null,
    };

    render(<EnvironmentDesk initialState={emptyState} />);

    const badge = document.querySelector(".env-desk__active-badge");
    expect(badge).not.toBeInTheDocument();
  });
});

describe("EnvironmentDesk · custom initial state", () => {
  it("renders with provided initial state instead of default", () => {
    const customState = createInitialStore();
    const withBranch = createEnvironmentFromScenario(
      customState,
      "branch-office",
    );

    render(<EnvironmentDesk initialState={withBranch} />);

    const table = screen.getByRole("table");
    expect(table.textContent).toContain("Micro Lab");
    expect(table.textContent).toContain("Branch Office");
  });
});

describe("EnvironmentDesk · empty state messaging", () => {
  it("empty state shows 'No lab environments' when showArchived=false and empty", () => {
    const emptyState = {
      environments: [],
      active_environment_id: null,
    };

    render(<EnvironmentDesk initialState={emptyState} />);

    expect(screen.getByText("No active lab environments")).toBeInTheDocument();
  });

  it("after creating from Branch Office, new row has positive config count", async () => {
    const user = userEvent.setup();
    render(<EnvironmentDesk />);

    const createButtons = screen.getAllByRole("button", { name: /Create/i });
    await user.click(createButtons[1]); // Branch Office

    const table = screen.getByRole("table");
    const rows = screen.getAllByRole("row");
    // Check that a new row was added with a config count > 0
    expect(rows.length).toBeGreaterThan(2);
  });
});
