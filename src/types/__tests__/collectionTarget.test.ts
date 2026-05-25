/**
 * V1CC — Collection Target model tests.
 */

import { describe, it, expect } from "vitest";
import {
  buildCollectionTarget,
  validateCollectionTarget,
  isSafeReadOnlyTarget,
  DEFAULT_CONTACT_POLICY,
  DEFAULT_SCOPE,
  type CollectionTarget,
} from "../collectionTarget";

function baseTarget(overrides: Partial<CollectionTarget> = {}): CollectionTarget {
  return {
    ...buildCollectionTarget({
      id: "tgt-1",
      name: "Edge router",
      seed: { kind: "hostname", value: "edge-01.example.net" },
      created_at: "2026-05-25T00:00:00Z",
    }),
    ...overrides,
  };
}

describe("buildCollectionTarget defaults", () => {
  it("fills defaults: ssh access, null credential, full default policy + scope", () => {
    const t = baseTarget();
    expect(t.access_methods).toEqual(["ssh"]);
    expect(t.credential_ref).toBeNull();
    expect(t.contact_policy).toEqual(DEFAULT_CONTACT_POLICY);
    expect(t.scope).toEqual(DEFAULT_SCOPE);
    expect(t.enabled).toBe(true);
    expect(t.updated_at).toBe(t.created_at);
    expect(t.last_planned_at).toBeNull();
  });

  it("always forces contact_policy.read_only = true even if caller tries to flip it", () => {
    const t = buildCollectionTarget({
      id: "tgt-x",
      name: "x",
      seed: { kind: "ip", value: "10.0.0.1" },
      created_at: "2026-05-25T00:00:00Z",
      contact_policy: {
        read_only: false as unknown as true,
        max_attempts: 2,
        timeout_ms: 3000,
        allow_neighbor_expansion: false,
        scope_limit: null,
      },
    });
    expect(t.contact_policy.read_only).toBe(true);
  });
});

describe("validateCollectionTarget — happy path", () => {
  it("accepts a minimal default target", () => {
    expect(validateCollectionTarget(baseTarget()).ok).toBe(true);
  });

  it("accepts a target with neighbour expansion + scope_limit", () => {
    const t = baseTarget({
      contact_policy: {
        read_only: true,
        max_attempts: 1,
        timeout_ms: 5000,
        allow_neighbor_expansion: true,
        scope_limit: 24,
      },
    });
    expect(validateCollectionTarget(t).ok).toBe(true);
  });
});

describe("validateCollectionTarget — safety guardrails", () => {
  it("rejects empty id / name / seed value", () => {
    const t = baseTarget({
      id: "",
      name: "",
      seed: { kind: "hostname", value: "" },
    });
    const r = validateCollectionTarget(t);
    expect(r.ok).toBe(false);
    const codes = r.issues.map((i) => i.field);
    expect(codes).toContain("id");
    expect(codes).toContain("name");
    expect(codes).toContain("seed.value");
  });

  it("rejects access_methods that contain an unknown method", () => {
    const t = baseTarget({
      access_methods: ["ssh", "telnet" as never],
    });
    const r = validateCollectionTarget(t);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "invalid_method")).toBe(true);
  });

  it("rejects scope facts that contain an unknown fact", () => {
    const t = baseTarget({ scope: ["inventory", "secrets" as never] });
    const r = validateCollectionTarget(t);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "invalid_scope")).toBe(true);
  });

  it("rejects duplicate scope facts", () => {
    const t = baseTarget({ scope: ["inventory", "inventory"] });
    const r = validateCollectionTarget(t);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "duplicate")).toBe(true);
  });

  it("rejects credential_ref that looks like a plaintext secret", () => {
    const t = baseTarget({ credential_ref: "MyPassword123" });
    const r = validateCollectionTarget(t);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "secret_in_reference")).toBe(true);
  });

  it("rejects credential_ref that is an empty string (use null instead)", () => {
    const t = baseTarget({ credential_ref: "   " });
    const r = validateCollectionTarget(t);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === "credential_ref" && i.code === "empty")).toBe(true);
  });

  it("rejects contact_policy.read_only = false (defence in depth beyond the type)", () => {
    const t = baseTarget({
      contact_policy: {
        read_only: false as unknown as true,
        max_attempts: 1,
        timeout_ms: 5000,
        allow_neighbor_expansion: false,
        scope_limit: null,
      },
    });
    const r = validateCollectionTarget(t);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === "non_read_only")).toBe(true);
  });

  it("rejects max_attempts outside [1, 5]", () => {
    const t = baseTarget({
      contact_policy: { ...DEFAULT_CONTACT_POLICY, max_attempts: 9 },
    });
    const r = validateCollectionTarget(t);
    expect(r.issues.some((i) => i.code === "invalid_attempts")).toBe(true);
  });

  it("rejects timeout_ms outside [250, 60000]", () => {
    const r1 = validateCollectionTarget(
      baseTarget({ contact_policy: { ...DEFAULT_CONTACT_POLICY, timeout_ms: 50 } }),
    );
    const r2 = validateCollectionTarget(
      baseTarget({ contact_policy: { ...DEFAULT_CONTACT_POLICY, timeout_ms: 90_000 } }),
    );
    expect(r1.issues.some((i) => i.code === "invalid_timeout")).toBe(true);
    expect(r2.issues.some((i) => i.code === "invalid_timeout")).toBe(true);
  });

  it("rejects scope_limit when allow_neighbor_expansion is false", () => {
    const t = baseTarget({
      contact_policy: {
        ...DEFAULT_CONTACT_POLICY,
        allow_neighbor_expansion: false,
        scope_limit: 10,
      },
    });
    const r = validateCollectionTarget(t);
    expect(r.issues.some((i) => i.code === "expansion_scope_mismatch")).toBe(true);
  });
});

describe("isSafeReadOnlyTarget", () => {
  it("returns true for the demo-shaped target", () => {
    expect(isSafeReadOnlyTarget(baseTarget())).toBe(true);
  });

  it("returns false for any validation failure", () => {
    expect(isSafeReadOnlyTarget(baseTarget({ name: "" }))).toBe(false);
  });
});
