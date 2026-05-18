# 018-raw-import-rejection-visible expected simulator behaviour

- Status: rejection-visible
- The raw-import route should report the rejection and keep the evidence store unchanged.
- Let V1AP/V1AQ return the rejection, then keep V1AR unchanged unless a future explicit action says otherwise.
- V1AS should show no new projected edges and the simulator should surface the rejection reason honestly.
