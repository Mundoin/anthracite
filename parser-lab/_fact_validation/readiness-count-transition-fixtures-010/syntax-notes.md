# Readiness count transition syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## Validation snapshots

- `snippets/readiness-count-transition-fixtures-010.txt / transition-none-001`
- `snippets/readiness-count-transition-fixtures-010.txt / transition-partial-002`
- `snippets/readiness-count-transition-fixtures-010.txt / transition-ready-003`

Observed patterns:

- `readiness_state`
- `accepted_count`
- `rejected_count`
- `unresolved_count`
- `rejection_reasons`

## Mapping note

- Counts are validation signals, not topology facts.
- The transition should be driven by accepted fact counts and coverage, not by
  raw evidence volume alone.
