import type { JSX } from "react";
import { BabylonCanvas } from "./BabylonCanvas";

export default function App(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <span className="brand-mark">ANTHRACITE</span>
        <span className="brand-sub">living network intelligence cockpit · v0.1.0 · stage V1A</span>
      </header>

      <div className="app-grid">
        <aside className="panel panel-left" aria-label="Topology layers panel">
          <h2 className="panel-title">Topology / Layers</h2>
          <p className="panel-placeholder">No topology loaded.</p>
        </aside>

        <main className="panel panel-center" aria-label="Command deck canvas">
          <BabylonCanvas />
        </main>

        <aside className="panel panel-right" aria-label="Inspector Sentinel Cortex panel">
          <h2 className="panel-title">Inspector / Sentinel / Cortex</h2>
          <p className="panel-placeholder">Nothing selected.</p>
        </aside>

        <footer className="panel panel-bottom" aria-label="Events agents build panel">
          <h2 className="panel-title">Events / Agents / Build</h2>
          <p className="panel-placeholder">Ready.</p>
        </footer>
      </div>
    </div>
  );
}
