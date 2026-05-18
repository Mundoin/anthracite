import type { JSX } from "react";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import "./SettingsMode.css";

export function SettingsMode(): JSX.Element {
  return (
    <div className="settings-mode">
      <section className="sm-section">
        <h3 className="sm-heading">Display <DataSourceTag state="real" /></h3>
        <dl className="sm-dl">
          <dt>Theme</dt>
          <dd>Industrial dark · locked at V1</dd>
        </dl>
        <p className="sm-footer-note">More settings land as modes come online — display, density, mode-specific preferences.</p>
      </section>

      <section className="sm-section">
        <h3 className="sm-heading">Operator</h3>
        <p className="sm-operator-note">AAA Engine not connected.</p>
        <DataSourceTag state="not_connected" />
      </section>
    </div>
  );
}
