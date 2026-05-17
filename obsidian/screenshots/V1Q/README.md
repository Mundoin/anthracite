# V1Q Screenshot Gate

Captures owed by Bujar after `pnpm tauri dev`. Each capture
must pass the visual-law checklist below before V1Q is
considered visually-locked.

## Required captures

| # | Filename                               | Content                                                                                  |
|---|----------------------------------------|------------------------------------------------------------------------------------------|
| 01| `01-batch-loaded-pre-run.png`          | Archive of 10+ configs; detection complete; **Analyse batch** visible; Findings col "—"  |
| 02| `02-run-in-progress.png`               | Mid-run; some rows complete, some parsing/validating, some pending; "Analysing…" chip   |
| 03| `03-run-complete-mixed.png`            | All complete; RunSummaryStrip shows H/M/L distribution                                  |
| 04| `04-run-complete-all-clean.png`        | All clean; severity chips all zero; "N clean" prominent                                 |
| 05| `05-run-with-failures.png`             | Some parsed, some failed; failed rows show "failed: parse" with tooltip                 |
| 06| `06-drilldown-from-batch.png`          | V1P-A workspace after row click; back-to-batch breadcrumb; stored findings + receipt    |
| 07| `07-back-to-batch.png`                 | Returned to run table; per-row Stage + Findings columns populated                       |
| 08| `08-rerun-analysis.png`                | Mid Re-run; results clearing and repopulating                                           |
| 09| `09-archive-source-provenance.png`     | Archive input; per-row ArchiveSourceBadge visible alongside Stage + Findings cells      |
| 10| `10-wide-1920-batch-run.png`           | 1920+ wide; RunSummaryStrip + table; workstation read                                   |

## Visual-law checklist (per capture)

Apply [`docs/design/INDUSTRIAL_VISUAL_LAW.md`](../../../docs/design/INDUSTRIAL_VISUAL_LAW.md):

- [ ] Hairline borders only (1px); no shadow stacks
- [ ] Sharp corners on data containers (radii ≤ 4px)
- [ ] Sans for chrome, mono for IDs / numbers / data
- [ ] Tight, deliberate padding; no marketing whitespace
- [ ] Strong contrast; muted text only for chrome
- [ ] No drop-shadow card grid
- [ ] No gradients on functional surfaces
- [ ] No centered hero blocks
- [ ] No carnival accents — palette discipline preserved
- [ ] Workstation chrome (not SaaS dashboard, not toy)

## V1Q-specific checks

- [ ] All counts in the RunSummaryStrip render verbatim from
      `batchRun.summary.*`; no client-side recompute visible
- [ ] Per-row Stage cells use only role-token-derived chip
      colors (`--anth-role-status-running`,
      `--anth-role-severity-clean`,
      `--anth-role-severity-fault`)
- [ ] Per-row Findings cells: clean → single `clean` chip;
      with findings → only NON-ZERO severity chips render;
      a row never shows `H 0 · M 0 · L 0`
- [ ] Severity chip discipline holds across 10+ rows — no
      carnival effect on capture 03 / 05
- [ ] Failed rows visible: Stage cell carries
      "failed: &lt;stage&gt;" with `title` attribute holding the
      error message
- [ ] Skipped rows visible with reason tooltip
- [ ] ArchiveSourceBadge stays inside the row's existing
      Label cell — NOT moved into Stage / Findings cells
- [ ] Re-run analysis button absent until status is
      `complete` or `complete_with_failures`
- [ ] Analyse batch button absent once a run is requested
      (re-appears only via fresh input)
- [ ] Drill-down from completed row: V1P-A workspace
      renders with stored Findings + Receipt; no spinner,
      no "Validating…" banner (already-stored result path)

Bujar runs the gate. Captures land in this directory as
PNGs.
