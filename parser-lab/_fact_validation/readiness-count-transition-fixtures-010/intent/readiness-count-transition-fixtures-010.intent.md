# Readiness count transition intent

## transition-none-001

- Capture the state where no accepted facts are available yet.
- Likely future OCC touch points: readiness gating and rejection accounting.
- Stay out of scope: calling the batch ready because evidence exists.
- Ambiguity note: rejected and unresolved items still count as evidence.

## transition-partial-002

- Capture the intermediate state where some facts are accepted but coverage is
  incomplete.
- Likely future OCC touch points: partial readiness thresholds and review
  gating.
- Stay out of scope: auto-promoting partial to ready without coverage rules.
- Ambiguity note: a partial batch can still be useful to OCC.

## transition-ready-003

- Capture the state where accepted facts and coverage are sufficient for the
  next stage.
- Likely future OCC touch points: readiness promotion and stage gating.
- Stay out of scope: treating ready as final production approval.
- Ambiguity note: ready is a validation state, not a topology guarantee.
