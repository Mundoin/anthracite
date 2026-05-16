# PARSER_COMMAND_CONTRACT

The typed surface every parser exposes through the Tauri command
boundary. Bound by V1K
([`../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md`](../../obsidian/stages/V1K-cisco-iosxe-parser-PROPOSAL.md)
§3.3).

## Tauri command

```rust
#[tauri::command]
pub fn parse_device_config(
    platform_ref: PlatformRef,
    config_text: String,
) -> Result<DeviceModel, String>
```

## TypeScript wrapper

```typescript
export async function parseDeviceConfig(
  platformRef: PlatformRef,
  configText: string,
): Promise<DeviceModel>
```

## Contract

- **Composable, not chained.** Caller is responsible for obtaining
  `PlatformRef`. Typical chain is V1J detection → V1K parse, but the
  parser does not depend on detection at runtime. A test harness or
  fixture runner can construct a `PlatformRef` directly.
- **Unknown platform.** If `platform_ref.platform_id` does not match a
  registered parser, returns `Err("unsupported platform: <id>")`. No
  panic.
- **Missing platform id.** If `platform_ref.platform_id` is `None` or
  empty, returns `Err("missing platform id")`. No panic.
- **Empty / whitespace-only input.** Returns `Ok(DeviceModel)` with an
  empty body, `parse_confidence.score = 0.0`, and `warnings` carrying
  `empty_input`.
- **No filesystem access.** Parser does not read files.
- **No network access.** Parser does not touch the network.
- **No panic.** Malformed, truncated, garbage, or platform-mismatched
  input degrades gracefully into `unknown_lines[]` and lower
  `ParseConfidence.score`, never a panic.

## Rationale

Engines are composable, not chained. Decoupling parsing from detection
keeps every engine independently testable, replaceable, and benchmark-
able. The shape matches the V1J Config Detection Engine pattern:
typed input, typed output, no hidden state, no side effects.

## Cross-references

- [`INTERFACE_NAMING.md`](./INTERFACE_NAMING.md)
- [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md)
- [`PARSER_COVERAGE_AREAS.md`](./PARSER_COVERAGE_AREAS.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
