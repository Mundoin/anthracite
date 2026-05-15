import type { JSX } from "react";
import { HomeEnvironmentCentre } from "./components/HomeEnvironmentCentre";

export default function App(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <span className="brand-mark">ANTHRACITE</span>
        <span className="brand-sub">network intelligence workstation · v0.1.0 · stage V1E-C · scheme NOC Light</span>
      </header>

      <div className="app-grid">
        <aside className="panel panel-left" aria-label="Mode rail panel">
          <h2 className="panel-title">Mode Rail</h2>
          <p className="panel-placeholder">Mode rail surfaces in a later stage.</p>
        </aside>

        <main className="panel panel-center" aria-label="Home Environment Centre">
          <HomeEnvironmentCentre />
        </main>

        <aside className="panel panel-right" aria-label="Inspector panel">
          <h2 className="panel-title">Inspector</h2>
          <p className="panel-placeholder">No selection.</p>
        </aside>

        <footer className="panel panel-bottom" aria-label="Status strip panel">
          <h2 className="panel-title">Status Strip</h2>
          <p className="panel-placeholder">Environment Engine online · awaiting mode dispatch.</p>
        </footer>
      </div>
    </div>
  );
}
