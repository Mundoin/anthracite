/**
 * Blueprint Device Identity Resolver — V1BN.
 *
 * Pure resolver. Inspects a GraphReadyTopologyNode's role_hint,
 * vendor, platform_id, and label and returns a richer identity:
 * canonical family code, confidence band, a short reason string,
 * a display label, a role label, and the matching hardware profile
 * id. Used by the role-aware layout dispatcher and by the canvas
 * glyph + passport surfaces so a node labelled `fw-fortinet-001`
 * reads as FW instead of UNK.
 *
 * No DOM, no React, deterministic. Vendor/platform/label matching
 * is keyword-based and conservative; if nothing matches we fall
 * through to the V1BF `familyOf(role_hint)` rule and ultimately
 * to `UNK`.
 */

import type { GraphReadyTopologyNode } from "../topologyReview";
import {
  defaultProfileIdFor,
  familyOf,
  type NodeFamilyCode,
} from "./blueprintGlyph";

export type IdentityConfidence = "high" | "medium" | "low";

export interface Identity {
  /** Canonical family code, drives layout + glyph render. */
  readonly family: NodeFamilyCode;
  /** How confident we are the family is correct. */
  readonly confidence: IdentityConfidence;
  /** Short human reason ("matched vendor 'fortinet' on label"). */
  readonly reason: string;
  /** Operator-friendly label for the device (== node.label). */
  readonly displayLabel: string;
  /** Operator-friendly role text ("Firewall", "Router", "Server", …). */
  readonly roleLabel: string;
  /** Hardware profile id (matches `hardwareProfiles.ts`). */
  readonly profileId: string;
}

interface Rule {
  family: NodeFamilyCode;
  /** Operator-facing label. */
  roleLabel: string;
  /** Keywords matched anywhere in haystack (case-insensitive). */
  keywords: readonly string[];
}

// Order matters — specific keywords first so e.g. `core-router`
// resolves to CORE-RT, not generic EDGE-RT.
const RULES: readonly Rule[] = [
  {
    family: "FW",
    roleLabel: "Firewall",
    keywords: [
      "fw-",
      "firewall",
      "fortinet",
      "fortigate",
      "paloalto",
      "palo alto",
      "pan-",
      "asa",
      "checkpoint",
      "sophos",
    ],
  },
  {
    family: "CORE-RT",
    roleLabel: "Core router",
    keywords: [
      "core-",
      "cr-",
      "backbone",
      "asr",
      "asr1k",
      "ncs",
      "core router",
      "core-router",
    ],
  },
  {
    family: "WAP",
    roleLabel: "Wireless AP",
    keywords: [
      "ap-",
      "wap-",
      "aruba",
      "wifi",
      "wireless",
      "meraki-mr",
      "unifi-ap",
      "cisco-aironet",
    ],
  },
  {
    family: "DIST-SW",
    roleLabel: "Distribution switch",
    keywords: [
      "dist-",
      "distribution",
      "catalyst-6",
      "catalyst 6",
      "nexus-9",
      "nexus 9",
      "agg-",
      "aggregation",
    ],
  },
  {
    family: "ACC-SW",
    roleLabel: "Access switch",
    keywords: [
      "sw-",
      "switch",
      "access",
      "catalyst",
      "nexus",
      "arista",
      "extreme",
      "meraki-ms",
    ],
  },
  {
    family: "EDGE-RT",
    roleLabel: "Edge router",
    keywords: [
      "rtr-",
      "router",
      "edge-",
      "wan-",
      "isr",
      "isr4k",
      "juniper",
      "mikrotik",
      "fritzbox",
      "fritz!box",
    ],
  },
  {
    family: "SRV",
    roleLabel: "Endpoint",
    keywords: [
      "srv-",
      "server",
      "host-",
      "vm-",
      "compute",
      "esxi",
      "cam-",
      "camera",
      "axis",
      "endpoint",
    ],
  },
];

function isVirtual(haystack: string): boolean {
  return (
    haystack.includes("virtual") ||
    haystack.includes("vrouter") ||
    haystack.startsWith("vm-") ||
    haystack.includes("vmx") ||
    haystack.includes("vsrx")
  );
}

/**
 * Pure resolver. Tries vendor/label/platform keyword matching first;
 * falls through to the V1BF `familyOf(role_hint)` rule.
 */
export function resolveIdentity(node: GraphReadyTopologyNode): Identity {
  const labelLower = (node.label || "").toLowerCase();
  const vendorLower = (node.vendor || "").toLowerCase();
  const platformLower = (node.platform_id || "").toLowerCase();
  const idLower = node.id.toLowerCase();
  const hintLower = (node.role_hint || "").toLowerCase();

  const haystack = `${idLower} ${labelLower} ${vendorLower} ${platformLower} ${hintLower}`;
  const virtual = isVirtual(haystack);

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (haystack.includes(kw)) {
        const profileId = defaultProfileIdFor(rule.family, { virtual });
        return {
          family: rule.family,
          confidence: hintLower ? "high" : "medium",
          reason: `matched '${kw}' on ${node.id}`,
          displayLabel: node.label || node.id,
          roleLabel: rule.roleLabel,
          profileId,
        };
      }
    }
  }

  // Fall through to V1BF role_hint rule (familyOf). If that also
  // returns UNK we keep UNK and let the canvas render the quiet `?`.
  const hintFamily = familyOf(node);
  if (hintFamily !== "UNK") {
    return {
      family: hintFamily,
      confidence: "high",
      reason: `role_hint '${node.role_hint}'`,
      displayLabel: node.label || node.id,
      roleLabel: roleLabelFor(hintFamily),
      profileId: defaultProfileIdFor(hintFamily, { virtual }),
    };
  }

  return {
    family: "UNK",
    confidence: "low",
    reason: "no role / vendor / label match",
    displayLabel: node.label || node.id,
    roleLabel: "Unclassified",
    profileId: defaultProfileIdFor("UNK", { virtual }),
  };
}

function roleLabelFor(family: NodeFamilyCode): string {
  switch (family) {
    case "FW":
      return "Firewall";
    case "CORE-RT":
      return "Core router";
    case "EDGE-RT":
      return "Edge router";
    case "DIST-SW":
      return "Distribution switch";
    case "ACC-SW":
      return "Access switch";
    case "WAP":
      return "Wireless AP";
    case "SRV":
      return "Endpoint";
    case "UNK":
      return "Unclassified";
  }
}
