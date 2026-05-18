# Filter Matrix

| Filter | Match style | Safe values | Notes |
| --- | --- | --- | --- |
| source_kind | exact | LLDP, CDP, manual, config-neighbour | No fuzzy matching. |
| source_label | exact | synthetic labels from import or review | No contains or substring search. |
| node | exact | local_node or remote_node | No hostname prefix fallback. |
| interface | exact | local_interface or remote_interface | No description promotion. |
| rejection_state | exact | accepted, rejected, mixed, stale, conflicted | Keep rejected evidence visible. |
| vendor/platform | exact | Mixed or a specific vendor/platform label | Useful for review grouping only. |
