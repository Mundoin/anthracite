# Rejection Visibility Matrix

| Rejection state | Current edge row | Drilldown visibility | Review note |
| --- | --- | --- | --- |
| unknown_local_node | none | yes | Exact resolver could not match the local node. |
| unknown_remote_node | none | yes | Exact resolver could not match the remote node. |
| self_link | none | yes | The evidence points back to the same node. |
| missing_local_interface | none | yes | The local interface is absent, so projection stays unsafe. |
| missing_remote_interface | none | yes | The remote interface is absent, so projection stays unsafe. |
| insufficient_evidence | none | yes | There is not enough evidence to promote an edge. |
| conflicting_remote_endpoint | maybe selected edge | yes | Conflict is visible and unresolved. |
| stale_evidence | maybe selected edge | yes | Stale evidence is labelled but not promoted. |
| duplicate_collapsed | one row | yes | Duplicate evidence collapsed to one edge while remaining visible. |
