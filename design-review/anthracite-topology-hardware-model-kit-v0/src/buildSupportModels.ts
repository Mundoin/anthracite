// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ NOTE FOR OCC IMPLEMENTERS                                                   │
// │ This file is the canonical TypeScript source. In the preview it is loaded   │
// │ via Babel-standalone with the `typescript` preset, which only strips type │
// │ annotations — it does not resolve ES module syntax. Cross-file linkage is  │
// │ therefore done through `window.Anthracite*` globals (see end of file).   │
// │ When integrating into a real bundler (Vite/esbuild/tsc), restore the       │
// │ `import` / `export` keywords as needed.                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

// Anthracite — Hardware Model Kit · support builders
//
// Thin wrappers that map a profile id to a built Babylon model. The
// generic factory in buildHardwareModel.ts does the real work; this file
// exists so OCC implementers can find / debug per-family quirks in one
// place without scrolling the central factory.
declare const window: any;

function buildSupportModels(scene: any, mats: any, opts: any = {}) {
  const profiles = window.AnthraciteProfiles.SupportProfiles;
  const built: Record<string, any> = {};
  for (const profile of profiles) {
    built[profile.id] = buildHardwareModel(scene, profile, mats, opts);
    built[profile.id].root.setEnabled(false);   // start hidden — preview enables one at a time
  }
  return built;
}

(window as any).AnthraciteBuilders = {
  ...(window.AnthraciteBuilders || {}),
  buildSupportModels,
};
