# 003-nxos-lldp-merge-ready expected simulator behaviour

- Status: ready
- Read-only plan input becomes a fixture-backed raw-output path with no device contact, no sockets, and no credentials.
- The raw fixture should feed the existing V1AP/V1AQ import route, then V1AR applies the chosen mode and V1AS renders the projected edges.
- V1AS should show accepted projected edges, evidence drilldown, and the normal review surface with no invented edges.
