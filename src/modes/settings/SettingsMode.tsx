import type { JSX } from "react";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import {
  THEME_IDS,
  THEME_LABELS,
  THEME_DESCRIPTIONS,
  useTheme,
  type ThemeId,
} from "../../contexts/ThemeContext";
import "./SettingsMode.css";

export function SettingsMode(): JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings-mode">
      <section className="sm-section" data-testid="settings-display-section">
        <h3 className="sm-heading">
          Display <DataSourceTag state="real" />
        </h3>
        <fieldset className="sm-theme-fieldset">
          <legend className="sm-theme-legend">Theme</legend>
          <div className="sm-theme-options" role="radiogroup" aria-label="Theme">
            {THEME_IDS.map((id: ThemeId) => {
              const selected = id === theme;
              return (
                <label
                  key={id}
                  className={`sm-theme-option${selected ? " sm-theme-option--selected" : ""}`}
                  data-testid={`settings-theme-option-${id}`}
                  data-selected={selected ? "true" : "false"}
                >
                  <input
                    type="radio"
                    name="anth-theme"
                    value={id}
                    checked={selected}
                    onChange={() => setTheme(id)}
                    className="sm-theme-radio"
                  />
                  <span className="sm-theme-option__label">{THEME_LABELS[id]}</span>
                  <span className="sm-theme-option__desc">{THEME_DESCRIPTIONS[id]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <p className="sm-footer-note">
          More settings land as modes come online — density, mode-specific
          preferences.
        </p>
      </section>

      <section className="sm-section">
        <h3 className="sm-heading">Operator</h3>
        <p className="sm-operator-note">AAA Engine not connected.</p>
        <DataSourceTag state="not_connected" />
      </section>
    </div>
  );
}
