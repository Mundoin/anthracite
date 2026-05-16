# ANTHRACITE — FINDING CONFIDENCE MODEL v1

**Status:** Active | **Introduced:** Session 34 Stage 3 | **Applies to:** All CON-00x rules, future finding sources

---

## 1. FINDING MODEL

```python
class ConsistencyFinding:
    rule_id: str
    severity: SeverityLevel          # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence: float                # [0.0, 1.0]
    visibility: VisibilityLevel      # VISIBLE, SUPPRESSED
    visibility_reason: str | None    # why suppressed (or None if visible)
    evidence_refs: list[str]         # block_id, interface_id, peer_ip, topology_node_id
    metadata: dict[str, Any] = {}
```

**Core guarantee:** confidence, severity, and visibility are independent axes.
- A finding can be critical-severity but low-confidence → suppressed.
- A finding can be high-confidence but info-severity → visible but quiet.
- A finding can be high-confidence but hidden by operator policy → suppressed with reason.

---

## 2. SIGNAL STRENGTH

```
HARD       — deterministic lookup, binary match/no-match (e.g. IP in index)
DERIVED    — computed from HARD signals (e.g. BFS reachability)
HEURISTIC  — regex, pattern match, semantic comparison
```

Constraints:
- HARD valid standalone
- DERIVED requires ≥1 HARD signal as input
- HEURISTIC requires ≥1 HARD or DERIVED signal as input

---

## 3. CONFIDENCE COMPOSITION

```
confidence = clamp(base_signal + modifiers, 0.0, 1.0)
```

### Base signal ranges:
```
HARD:       0.7–1.0
DERIVED:    0.5–0.7
HEURISTIC:  0.3–0.5
```

### Modifiers:

**a) CON-002 match_type:**
```
EXACT:  +0.30    (normalized equality after delimiter collapse)
ALIAS:  +0.15    (resolved via alias_map)
WEAK:   +0.05    (token overlap only — suppressed by default)
```

**b) CON-003 extraction:**
```
modifier = (parse_confidence - 0.5) * 0.4
```
Where parse_confidence comes from BGPPeerRef.parse_confidence.

**c) Correlation (bounded):**
Apply iff:
- Same domain (device/interface/tunnel)
- ≥1 HARD signal in the correlation set
```
max_bonus = 0.25 * base_signal
```

**d) Topology weighting (optional):**
```
core:  +0.10
spof:  +0.15
edge:  +0.00
```

---

## 4. VISIBILITY GATING

### Per-rule thresholds:
```python
RULE_THRESHOLDS = {
    "CON-002": 0.75,   # semantic/heuristic — needs more proof
    "CON-003": 0.60,   # extraction quality varies by vendor
    "CON-005": 0.70,   # hard structural lookup
}
```

### Global floor:
```python
GLOBAL_MIN_CONFIDENCE = 0.50
```

### Logic:
```python
if confidence < RULE_THRESHOLDS.get(rule_id, GLOBAL_MIN_CONFIDENCE):
    visibility = SUPPRESSED
    visibility_reason = "below_threshold"
elif confidence < GLOBAL_MIN_CONFIDENCE:
    visibility = SUPPRESSED
    visibility_reason = "below_global_floor"
else:
    visibility = VISIBLE
    visibility_reason = None
```

---

## 5. SPECIAL CASES

**CON-005 known external peer:**
```
if peer in known_external_peers:
    visibility = SUPPRESSED
    visibility_reason = "known_external_peer"
```
Finding is still created and retained internally — traceable in debug output.

**CON-002 weak match:**
```
if match_type == WEAK:
    visibility = SUPPRESSED
    visibility_reason = "weak_match"
```

**Policy override (future — Session 35 Exception Management):**
```
visibility = SUPPRESSED
visibility_reason = "policy_hidden"
```

---

## 6. CON-003 STRUCTURED EXTRACTION

```python
@dataclass
class BGPPeerRef:
    peer_ip: str
    peer_asn: int | None
    source_block_id: str
    source_vendor: str
    parse_confidence: float    # [0.0, 1.0]
```

Rules:
- Findings inherit parse_confidence from the extraction that produced them
- Ambiguous parses degrade confidence via the modifier formula
- No parse_confidence → treat as HEURISTIC (base 0.3–0.5)
- Extraction confidence levels:
  - Clean `neighbor X.X.X.X remote-as NNNNN` match → 1.0
  - Partial match (IP found, ASN ambiguous) → 0.6
  - Suspected but ambiguous syntax → 0.4
- Only parse_confidence ≥ 0.6 drives strong findings

---

## 7. CON-002 MATCH CLASSIFICATION

```
EXACT   — normalized equality after _normalize_device_ref()
ALIAS   — resolved via alias_map lookup
WEAK    — token overlap only (partial substring match)
```

Rules:
- EXACT: highest trust, confidence gets +0.30
- ALIAS: medium trust, confidence gets +0.15
- WEAK: low trust, confidence gets +0.05, suppressed by default
- WEAK never standalone driver of a visible finding

---

## 8. CON-005 CLASSIFICATION

```
Case A: resolvable mismatch         → VISIBLE finding
Case B: unresolvable + known_external → SUPPRESSED (visibility_reason="known_external_peer")
Case C: unresolvable + unknown       → VISIBLE finding
```

Case B produces a finding internally for audit traceability — never silent skip.

---

## 9. EVIDENCE TRACEABILITY

`evidence_refs` must include identifiers sufficient for offline audit:
- block_id (config block that triggered the check)
- interface_id (interface involved)
- peer_ip (BGP/tunnel peer address)
- topology_node_id (graph node name)

Requirement: no recomputation required to explain any finding.

---

## 10. DETERMINISM

- No randomness
- No hidden state
- Identical input → identical output
- Confidence is purely a function of input data + rule logic

---

## 11. GUARANTEES

- Confidence independent from severity
- Visibility independent from severity
- Suppressed findings retained internally (never discarded)
- All suppression paths carry visibility_reason
- Every finding traceable via evidence_refs without recomputation
