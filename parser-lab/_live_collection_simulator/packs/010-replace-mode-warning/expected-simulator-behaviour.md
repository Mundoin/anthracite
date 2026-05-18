# 010-replace-mode-warning expected simulator behaviour

- Status: warning
- Read-only planning still applies; only the operator-chosen replace mode changes the store semantics later.
- The raw fixture should still route through V1AP/V1AQ, then V1AR performs replace and V1AS updates the review surface.
- V1AS should show the same projected-edge surface, but the simulator summary must keep the replace warning visible.
