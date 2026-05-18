# 009-no-source-kind-selected expected simulator behaviour

- Status: blocked
- No source kind means no route into the raw import path and no evidence mutation.
- The request should be rejected before V1AP/V1AQ is touched.
- V1AS should not receive a simulated import; the UI should stay on the blocked state.
