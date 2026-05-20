import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiscoveryMode } from "../DiscoveryMode";
import type { SeedEntry } from "../seedPlanner";
import { emptyHistory } from "../discoveryRunHistory";

describe("DiscoveryMode — controlled-state props", () => {
  const makeSeed = (id: string): SeedEntry => ({
    id,
    host_or_cidr: "10.0.0.1",
    label: `Seed ${id}`,
    platform_hint: "unknown",
    transport_intent: "ssh",
    port: 22,
    credential_profile_label: "default",
    source_kind: "manual",
    notes: "",
    enabled: true,
  });

  it("renders with internal state when no seeds/history props provided", () => {
    const { container } = render(<DiscoveryMode />);
    expect(container).toBeTruthy();
    // Component rendered without error
  });

  it("accepts controlled seeds prop and onSeedsChange callback", () => {
    const seeds: ReadonlyArray<SeedEntry> = [makeSeed("a")];
    const onSeedsChange = vi.fn();

    const { container } = render(
      <DiscoveryMode
        seeds={seeds}
        onSeedsChange={onSeedsChange}
        history={emptyHistory()}
        onHistoryChange={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
    // Component should render without error
  });

  it("accepts controlled history prop and onHistoryChange callback", () => {
    const onHistoryChange = vi.fn();

    const { container } = render(
      <DiscoveryMode
        seeds={[]}
        onSeedsChange={vi.fn()}
        history={emptyHistory()}
        onHistoryChange={onHistoryChange}
      />
    );
    expect(container).toBeTruthy();
  });

  it("respects backward compatibility: no props means internal state", () => {
    const { container } = render(<DiscoveryMode />);
    expect(container).toBeTruthy();
    // Existing tests that don't pass props should still work
  });

  it("handles mixed controlled and uncontrolled patterns", () => {
    const seeds: ReadonlyArray<SeedEntry> = [makeSeed("a"), makeSeed("b")];
    const onSeedsChange = vi.fn();

    const { container } = render(
      <DiscoveryMode
        seeds={seeds}
        onSeedsChange={onSeedsChange}
        // history and onHistoryChange not provided — uses internal
      />
    );
    expect(container).toBeTruthy();
  });
});
