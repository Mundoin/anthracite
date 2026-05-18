# State Machine

idle -> dry-run-plan-visible -> fixture-selected -> route-validated -> import-routed -> store-mode-applied -> review-ready

Blocked terminal states:
- no_source_kind_selected
- unsupported_platform
- deferred_platform
- missing_fixture
- platform_mismatch
- source_kind_mismatch
- rejection_visible
- merge_dedup_visible
- replace_warning

State rules:
- Simulator state changes are explicit and synthetic.
- Read-only preview is the default.
- Store mutation only belongs to the explicit fixture-import action path, never to a hidden background step.
