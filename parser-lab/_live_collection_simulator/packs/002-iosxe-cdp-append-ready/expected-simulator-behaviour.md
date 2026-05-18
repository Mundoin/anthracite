# 002-iosxe-cdp-append-ready expected simulator behaviour

- Status: ready
- Read-only plan input becomes a fixture-backed append path with no device contact, no sockets, and no credentials.
- The raw fixture should feed the existing V1AP/V1AQ import route, then V1AR appends the evidence and V1AS shows the resulting projected edges.
- V1AS should show accepted projected edges while evidence summaries preserve the appended source rows and labels.
