import { type JSX, useState, useCallback } from "react";
import { OverviewPanel } from "./panels/OverviewPanel";
import { EnvironmentCreatorPanel } from "./panels/EnvironmentCreatorPanel";
import { EnvironmentStorePanel } from "./panels/EnvironmentStorePanel";
import { ConfigsPanel } from "./panels/ConfigsPanel";
import { DossierPanel } from "./panels/DossierPanel";
import { SyncStatusPanel } from "./panels/SyncStatusPanel";
import { useEnvSelectionStyle } from "./preferences/useEnvSelectionStyle";
import "./EnvironmentsMode.css";

export interface CreationNotice {
  readonly environmentId: string;
  readonly environmentName: string;
  readonly didSetActive: boolean;
}

export type EnvironmentsToolId = "overview" | "creator" | "store" | "configs" | "dossier" | "sync";

export interface EnvironmentsModeProps {
  readonly activeToolId: EnvironmentsToolId;
  readonly onToolChange: (id: EnvironmentsToolId) => void;
}

export const ENVIRONMENTS_DEFAULT_TOOL_ID: EnvironmentsToolId = "overview";

export const ENVIRONMENTS_TOOL_META: ReadonlyArray<{ id: EnvironmentsToolId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "creator", label: "Environment Creator" },
  { id: "store", label: "Environment Store" },
  { id: "configs", label: "Configs" },
  { id: "dossier", label: "Dossier" },
  { id: "sync", label: "Sync Status" },
];

export function EnvironmentsMode({
  activeToolId,
  onToolChange,
}: EnvironmentsModeProps): JSX.Element {
  const [creationNotice, setCreationNotice] = useState<CreationNotice | null>(null);
  const { style: selectionStyle } = useEnvSelectionStyle();

  const handleAfterCreate = useCallback(
    (environmentId: string, environmentName: string, didSetActive: boolean) => {
      setCreationNotice({ environmentId, environmentName, didSetActive });
      onToolChange(didSetActive ? "overview" : "store");
    },
    [onToolChange],
  );

  const dismissNotice = useCallback(() => setCreationNotice(null), []);

  return (
    <div
      className={`environments-mode env-select--${selectionStyle}`}
      role="region"
      aria-label="Environments mode"
      data-testid="environments-mode"
    >
      {activeToolId === "overview" && (
        <OverviewPanel
          onNavigate={onToolChange}
          creationNotice={creationNotice}
          onDismissNotice={dismissNotice}
        />
      )}
      {activeToolId === "creator" && (
        <EnvironmentCreatorPanel onAfterCreate={handleAfterCreate} />
      )}
      {activeToolId === "store" && (
        <EnvironmentStorePanel
          onNavigate={onToolChange}
          creationNotice={creationNotice}
          onDismissNotice={dismissNotice}
        />
      )}
      {activeToolId === "configs" && <ConfigsPanel />}
      {activeToolId === "dossier" && <DossierPanel onNavigate={onToolChange} />}
      {activeToolId === "sync" && <SyncStatusPanel />}
    </div>
  );
}
