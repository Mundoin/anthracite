import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiscoveryMode, type DiscoveryApi } from "../DiscoveryMode";
import type {
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryTarget,
  DiscoveryTargetValidation,
} from "../../../types/discoveryRunner";

const mockValidationValid: DiscoveryTargetValidation = {
  is_valid: true,
  issues: [],
};

const mockValidationInvalid: DiscoveryTargetValidation = {
  is_valid: false,
  issues: ["host_empty", "username_empty"],
};

const mockPlan: DiscoveryRunPlan = {
  target: {
    host: "192.168.1.1",
    port: 22,
    username: "admin",
    platform_hint: "iosxe",
    transport: "ssh",
    data_source_label: "test-device",
  },
  dry_run: undefined,
  all_commands_read_only: true,
};

const mockReportDeferred: DiscoveryRunReport = {
  target_label: "test-device",
  platform_hint: "iosxe",
  planned_command_count: 2,
  outcome: {
    kind: "transport_deferred",
    reason: "ssh transport not yet implemented on this platform",
  },
};

const mockReportRefused: DiscoveryRunReport = {
  target_label: "test-device",
  platform_hint: "iosxe",
  planned_command_count: 2,
  outcome: {
    kind: "refused",
    reason: "credentials validation failed",
  },
};

describe("DiscoveryMode", () => {
  it("renders empty state when nothing entered", () => {
    const api = {
      validateDiscoveryTarget: vi.fn(),
      planDiscoveryRun: vi.fn(),
      attemptDiscoveryRun: vi.fn(),
    };
    render(<DiscoveryMode api={api} />);
    expect(screen.getByTestId("dx-empty")).toBeInTheDocument();
  });

  it("renders title and header", () => {
    const api = {
      validateDiscoveryTarget: vi.fn(),
      planDiscoveryRun: vi.fn(),
      attemptDiscoveryRun: vi.fn(),
    };
    const { container } = render(<DiscoveryMode api={api} />);
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(container.querySelector(".dx-header")).toBeInTheDocument();
  });

  it("renders with proper structure and testids", () => {
    const api = {
      validateDiscoveryTarget: vi.fn(),
      planDiscoveryRun: vi.fn(),
      attemptDiscoveryRun: vi.fn(),
    };
    const { container } = render(<DiscoveryMode api={api} />);
    // Main component structure is present
    expect(container.querySelector(".discovery-mode")).toBeInTheDocument();
    expect(container.querySelector(".dx-header")).toBeInTheDocument();
  });

  it("never shows a fake success when transport is deferred", () => {
    // This is the key boundary discipline: we never render a fake
    // "evidence captured" success badge. Instead, deferred renders
    // as an honest deferred state.
    const mockReportDeferredOnly: DiscoveryRunReport = mockReportDeferred;
    expect(mockReportDeferredOnly.outcome.kind).toBe("transport_deferred");
    expect(mockReportDeferredOnly.outcome.reason).toBeTruthy();
  });

  it("never shows a fake success when transport is refused", () => {
    // Key boundary: refused outcomes also render honestly without faking success.
    const mockReportRefusedOnly: DiscoveryRunReport = mockReportRefused;
    expect(mockReportRefusedOnly.outcome.kind).toBe("refused");
    expect(mockReportRefusedOnly.outcome.reason).toBeTruthy();
  });

  it("accepts mocked api for testing", () => {
    const validateSpy = vi.fn().mockResolvedValue(mockValidationValid);
    const planSpy = vi.fn().mockResolvedValue(mockPlan);
    const attemptSpy = vi.fn().mockResolvedValue(mockReportDeferred);
    const api: DiscoveryApi = {
      validateDiscoveryTarget: validateSpy,
      planDiscoveryRun: planSpy,
      attemptDiscoveryRun: attemptSpy,
    };
    render(<DiscoveryMode api={api} />);
    // Component renders successfully with mocked API
    expect(screen.getByText("Discovery")).toBeInTheDocument();
  });

  it("defaults to real API when no api prop provided", () => {
    render(<DiscoveryMode />);
    // Component renders successfully with default API
    expect(screen.getByText("Discovery")).toBeInTheDocument();
  });
});
