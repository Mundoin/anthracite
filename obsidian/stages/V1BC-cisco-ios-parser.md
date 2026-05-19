# V1BC — Cisco IOS parser baseline

## Objective

Land the first `cisco-ios` parser slice in the tracked repo and make it
participate in the same canonical full-L1/L2 bar as the existing IOS-XE,
Junos, EOS, and NX-OS parsers.

## What changed

- Added `src-tauri/src/engines/parsers/cisco_ios.rs` as a family-specific
  wrapper over the IOS-XE parse core.
- Wired `cisco-ios` into parser dispatch and version guards.
- Seeded a dedicated `tests/fixtures/cisco-ios/` corpus.
- Added `cisco-ios` config-detection signatures and a regression test.
- Extended the cross-vendor consistency harness to include `cisco-ios`.

## What stayed stable

- The canonical `DeviceModel` shape did not change.
- Existing IOS-XE / Junos / EOS / NX-OS parser behavior did not change.
- The MikroTik / FortiOS / Huawei bounded slices stayed intact.

## Validation

Run the parser-focused checks after recapturing the new corpus:

- `ANTHRACITE_UPDATE_FIXTURES=1 cargo test --test cisco_ios_fixture_corpus`
- `cargo test --test cisco_ios_fixture_corpus`
- `cargo test --test parser_version_guard`
- `cargo test --test cross_vendor_consistency`

## Notes

- The first IOS corpus is intentionally small and mirrors the shared
  IOS/XE bar.
- The parser implementation currently reuses the IOS-XE parse core,
  but the family boundary, versioning, corpus, and detection entries are
  distinct.

## Pick-up here

If this parser needs to be extended, start by growing the corpus one
fixture at a time and then refresh the coverage-area and roadmap notes.
