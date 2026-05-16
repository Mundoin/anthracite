# JUNOS_CONFIG_STYLES

How the V1M juniper-junos parser ingests Junos configurations in both
brace and set styles, and the rules that keep the two styles producing
the same `DeviceModel`.

## The two styles

Junos accepts the same configuration in two textual forms.

### Brace style

```
system {
    host-name router1;
}
interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet {
                address 10.0.0.1/24;
            }
        }
    }
}
```

Nested blocks open with `{` and close with `}`; leaf statements end
with `;`.

### Set style

```
set system host-name router1
set interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/24
```

Every leaf becomes one `set …` line. The block path is inlined into
the same line.

Both forms describe the same device.

## Convergence: `canonical::JunosLine`

`src-tauri/src/engines/parsers/juniper_junos/canonical.rs` defines the
single shared shape both lexers emit:

```rust
pub struct JunosLine {
    pub path: Vec<String>,   // tokenised path
    pub line_number: u64,
    pub raw: String,
}
```

For the example above, both styles produce identical `JunosLine`
records:

| Field         | Value                                                                      |
|---------------|----------------------------------------------------------------------------|
| `path[0..2]`  | `["system", "host-name", "router1"]`                                       |
| `path[0..8]`  | `["interfaces", "ge-0/0/0", "unit", "0", "family", "inet", "address", "10.0.0.1/24"]` |

Area parsers (`identity.rs`, `interfaces.rs`, `vlans.rs`,
`routing_instances.rs`, `static_routes.rs`, `services.rs`, `lag.rs`)
walk the canonical sequence; they never see brace vs set distinctions.
That is what makes the two styles produce the same `DeviceModel`.

## Brace-style lexer

`lexer_brace.rs` runs a brace-depth stack:

1. Strip `/* … */` block comments and `#` line comments.
2. For each non-empty line:
   - If the trimmed line ends with `{`, push its leading tokens onto
     the prefix stack.
   - If the trimmed line consists only of `}` (possibly several),
     pop one frame per `}`.
   - If the trimmed line ends with `;`, emit a `JunosLine` whose path
     is the flattened prefix stack followed by the line's tokens.
3. Lists in the form `[ a b c ]` expand into one emitted line per
   element, in source order.
4. A non-empty prefix stack at end-of-input sets `truncated = true`.

## Set-style lexer

`lexer_set.rs` ignores any line that does not start with `set`. For
each `set …` line:

1. Drop the leading `set` token.
2. Strip trailing `;` if present.
3. Strip `#` line comments.
4. Tokenise honouring double-quoted strings.
5. Expand `[ a b c ]` bracket lists into one emitted line per element.

`delete` and `deactivate` forms are out of scope for V1M; the live
configuration is the union of `set` statements only.

## The byte-equal pair contract

Two committed fixtures, `small-brace-style/` and `small-set-style/`,
describe the same logical device in the two styles. The dedicated
`brace_set_pair_produces_same_model` integration test reads the two
fixtures, parses each, and asserts the serialised models are
byte-identical **after normalising `evidence.byte_size` and
`evidence.line_count` to `null`**.

### Why those two evidence fields are excluded

`evidence.byte_size = config_text.len()` and `evidence.line_count =
config_text.lines().count()` are intrinsic measurements of the textual
form, not of the device's semantic configuration. A brace fixture and
its set-style twin necessarily differ in both values; demanding byte
equality on those fields would require artificial line/byte padding in
one of the configs and would make the fixture maintenance loop
fragile.

Every other byte of the produced `DeviceModel` JSON must match exactly.
This is the contract: if a future parser change makes the two styles
diverge in any other field, the pair test fails and the change must be
re-thought.

### What this proves

The brace lexer, the set lexer, and the convergence layer together
form one parser. Adding a new Junos area means writing a handler that
walks `Vec<JunosLine>`; the handler is automatically style-agnostic.

## Limitations (V1M)

- Single-line compact `{ … }` block expressions in brace style are
  tolerated but not deeply parsed; nested compact forms may fall into
  `unknown_lines[]`. Fixtures use the conventional multi-line form.
- `deactivate` and `delete` from set style are dropped (V1M treats the
  config as the union of `set` lines).
- Quoted strings containing `;` or `{` are not specifically handled;
  V1M's fixtures avoid that case.

## Cross-references

- [`PARSER_VERSIONING.md`](./PARSER_VERSIONING.md)
- [`PARSER_COVERAGE_AREAS.md`](./PARSER_COVERAGE_AREAS.md)
- [`INTERFACE_NAMING.md`](./INTERFACE_NAMING.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
- V1M stage note: [`../../obsidian/stages/V1M-juniper-junos-parser.md`](../../obsidian/stages/V1M-juniper-junos-parser.md)
