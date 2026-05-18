# State Matrix

| State | Current edges | Selected edge | Evidence drilldown | Stats strip | Notes |
| --- | --- | --- | --- | --- | --- |
| no_evidence | none | none | none | empty | No evidence loaded yet. |
| empty_store | none | none | none | empty | Store is empty. |
| empty_inventory | none | none | rejected visible | derived | Resolver cannot promote edges. |
| store_present_no_edges | none | maybe | rejected or summary only | derived | Store exists but no edges were promoted. |
| accepted | one or more | yes | accepted evidence | visible | Stable review row. |
| mixed | accepted plus rejected | yes | accepted and rejected | visible | Honest split view. |
| rejected_only | none | maybe | rejected evidence | visible | No promotion. |
| unavailable | none | none | none | unavailable | Store or load failure. |
| density | many | yes | selected edge only | visible | Keep stable sorting and grouping. |
