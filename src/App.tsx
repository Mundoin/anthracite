import type { JSX } from "react";
import { HomeEnvironmentCentre } from "./components/HomeEnvironmentCentre";

export default function App(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <span className="brand-mark">ANTHRACITE</span>
        <span className="brand-sub">network intelligence workstation · v0.1.0 · stage V1E-G · scheme NOC Light</span>
      </header>

      <div className="app-grid">
        <aside className="panel panel-left" aria-label="Mode rail panel">
          <h2 className="panel-title">Mode Rail</h2>
          <div className="panel-empty" role="presentation">
            <span className="panel-empty__rule">— —</span>
            <p className="panel-empty__caption">Mode rail surfaces in a later stage.</p>
          </div>
        </aside>

        <main className="panel panel-center" aria-label="Home Environment Centre">
          <HomeEnvironmentCentre />
        </main>

        <aside className="panel panel-right" aria-label="Inspector panel">
          <h2 className="panel-title">Inspector</h2>
          <div className="panel-empty" role="presentation">
            <span className="panel-empty__rule">— —</span>
            <p className="panel-empty__caption">No selection.</p>
          </div>
        </aside>

        <footer className="panel panel-bottom" aria-label="Status strip panel">
          <h2 className="panel-title">Status Strip</h2>
          <div className="panel-empty" role="presentation">
            <span className="panel-empty__rule">— —</span>
            <p className="panel-empty__caption">Environment Engine online · awaiting mode dispatch.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
