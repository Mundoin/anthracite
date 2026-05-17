# V1P-A Screenshot Gate

Captures owed by Bujar after `pnpm tauri dev`. Claude does not
capture these — they require the live desktop app. Each capture
must pass the visual-law checklist below before V1P-A is
considered visually-locked.

## Required captures

| # | Filename                       | Content                                                                                |
|---|--------------------------------|----------------------------------------------------------------------------------------|
| 01| `01-single-device-idle.png`    | Workspace, work lane filled, answer lane empty-state skeleton (RESULT eyebrow visible) |
| 02| `02-single-device-parsed.png`  | Workspace, FindingsPanel above ReceiptDisplay in answer lane                           |
| 03| `03-findings-high.png`         | FindingsPanel with a High severity finding, accent rail = `--anth-role-severity-fault` |
| 04| `04-findings-clean.png`        | Clean parsed config, accent rail = `--anth-role-severity-clean`                        |
| 05| `05-drilled-in-slice.png`      | Drilled-in slice from V1O-A batch, workspace visible                                   |
| 06| `06-batch-summary.png`         | V1O-A batch summary, full-width, no workspace                                          |
| 07| `07-archive-inventory.png`     | V1O-B archive inventory, full-width, no workspace                                      |
| 08| `08-narrow-collapse.png`       | Viewport < ~1100px, vertical stack, no hidden content, no seam                         |
| 09| `09-manual-override.png`       | Manual override active, copper (`--anth-role-operator-choice`) rail on override panel  |
| 10| `10-wide-1920.png`             | ~1920 viewport, horizontal space used intelligently, both lanes filled, seam visible   |

## Visual-law checklist (per capture)

Apply [`docs/design/INDUSTRIAL_VISUAL_LAW.md`](../../../docs/design/INDUSTRIAL_VISUAL_LAW.md):

- [ ] Hairline borders only (1px); no shadow stacks
- [ ] Sharp corners on data containers (radii ≤ 4px)
- [ ] Sans for chrome, mono for IDs/numbers/data
- [ ] Tight, deliberate padding; no marketing whitespace
- [ ] Strong contrast; muted text only for chrome
- [ ] No drop-shadow card grid
- [ ] No gradients on functional surfaces
- [ ] Accent rails are 2px wide, semantic, palette-locked
- [ ] No centered hero blocks
- [ ] No carnival accents — palette discipline preserved
- [ ] Workstation chrome (not SaaS dashboard, not toy)

## V1P-A specific checks

- [ ] Accent rails use ONLY `--anth-role-*` tokens (no raw
      `--anth-{info,warn,err,ok,copper}` references in inspected
      CSS)
- [ ] Empty answer lane reads as a workstation panel, not as
      dead space — RESULT eyebrow + muted body visible
- [ ] 1px seam visible between lanes on wide viewport
- [ ] Seam absent on < ~1100px (narrow collapse)
- [ ] Batch summary + archive inventory both render full-width;
      no lane-item rails visible on those views
- [ ] FindingsPanel renders above ReceiptDisplay in answer lane
- [ ] ArchiveSourceBadge stays inside drilled-in header chrome,
      not inside a lane-item wrapper

Bujar runs the gate. Captures land in this directory as PNGs.
