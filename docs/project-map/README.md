# Anthracite V1 Project Map

Interactive, standalone HTML visualisation of the Anthracite V1 project
status — landed stages, current edge, prep / not-integrated material,
deferred / left-undone, halted / superseded, safety boundaries, open
questions, and capability matrix.

## What this is

A generated visualisation. **The source of truth is the Codex extraction
JSON at**

```
parser-lab/_project_status_map/anthracite-status-map-source.json
```

The HTML is built deterministically from that JSON. Do not hand-edit the
generated HTML — re-run the build instead. If you must change the data,
update the source JSON (or its supporting markdown in the same
directory) and re-run the build.

## How to regenerate

```
node tools/project-map/build-project-map.mjs
```

That command:

1. Reads the source JSON.
2. Validates required keys (`metadata`, `arcs`, `stages`,
   `current_state`, `capability_map`, `deferred_or_left_undone`,
   `safety_boundaries`, `open_questions`).
3. Writes a snapshot to
   `docs/project-map/project-map-source.snapshot.json` for diff-friendly
   traceability.
4. Generates `docs/project-map/anthracite-project-map.html` with the
   snapshot JSON embedded inline.
5. Prints a counts summary.

No npm install. No external runtime dependency. No CDN. The HTML is
vanilla HTML + CSS + JS and opens directly from Windows file explorer.

## How to open

Double-click `docs/project-map/anthracite-project-map.html` from
Windows file explorer, or open it in any browser.

Everything is embedded; the file works offline and without a server.

## Views

1. **Arc Timeline** — stages grouped by arc as swimlanes; current /
   halted / prep / deferred chips fade or recolour based on status.
2. **Dependency Map** — lightweight SVG node board for stages
   referenced by `dependency_edges`, plus a dense edge list.
3. **Capability Matrix** — `capability_map` table with state, implementing
   stages, dependencies, and remaining work.
4. **Deferred / Left Undone** — grouped by Live collection / Graph &
   rendering / Evidence & truth / Parser & platform / Governance.
5. **Safety Boundaries** — loud cards: rules every future stage must
   preserve.
6. **Open Questions** — decisions Bujar / Vale must make before
   downstream stages can land. "Needs Bujar decision" is highlighted.
7. **Evidence / Sources** — compact, de-duplicated list of every
   `source_refs` entry across stages, capabilities, deferred items,
   safety boundaries, and open questions.

## Filters and search

- Status chips (Landed / Current edge / Prep / Planned / Deferred /
  Halted / Decision) — toggle on/off.
- Arc chips — toggle on/off.
- Free-text search — applies to all views.
- Reset filters — restores defaults.

Click any stage chip or capability stage code to open the right-side
detail panel with full metadata (summary, outputs, scope out,
dependencies, enables, source refs). Press `Escape` or the close button
to dismiss.

## Editing the source

This map is downstream of the Codex extraction in
`parser-lab/_project_status_map/`. Agents updating the project map
should:

1. Update the source JSON (or markdown if the field doesn't exist yet).
2. Re-run `node tools/project-map/build-project-map.mjs`.
3. Commit the source JSON, the snapshot, and the generated HTML
   together so the visualisation stays in sync with its data.

Do not hand-edit the generated HTML in production commits — the next
generation will overwrite it.
