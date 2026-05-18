# Operator Workflows

## Happy path
1. Open the V1AT dry-run plan.
2. Choose a platform hint and source kind.
3. Select the matching synthetic fixture.
4. Send the fixture text through the existing V1AP/V1AQ import route.
5. Let V1AR apply the store mode.
6. Review the projected edges in V1AS.

## Warning path
1. Select Replace mode only when the overwrite warning is explicit.
2. Confirm the operator understands that Replace overwrites current evidence.

## Blocked paths
1. No source kind selected -> stop before fixture selection.
2. Unsupported or deferred platform -> stop before import.
3. Missing fixture or mismatch -> stop before import.
4. Rejection visible -> keep the store honest and unchanged unless a future explicit action says otherwise.

## Review path
1. Run the fixture-backed import route.
2. Let V1AS show the projected edge rows, stats, and evidence drilldown.
3. Keep the review surface visible even when the result is a rejection or a no-edge state.
