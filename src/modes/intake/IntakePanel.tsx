import {
  useCallback,
  useEffect,
  useReducer,
  type JSX,
} from "react";
import { detectConfigPlatform } from "../../api/configDetection";
import { parseDeviceConfig } from "../../api/parser";
import { projectDeviceReceipt } from "../../api/receipt";
import { listVendorPlatforms } from "../../api/vendor";
import type { PlatformRef } from "../../types/networkModel";
import { ConfigInputArea } from "./components/ConfigInputArea";
import { DetectionResultView } from "./components/DetectionResultView";
import { ParseStatusView } from "./components/ParseStatusView";
import { PlatformOverrideSelect } from "./components/PlatformOverrideSelect";
import { ReceiptDisplay } from "./components/ReceiptDisplay";
import { describeError, readUtf8File } from "./fileText";
import { intakeReducer } from "./intakeReducer";
import { initialIntakeState } from "./intakeTypes";

import "./intake.css";

export interface IntakePanelProps {
  /** Inject mocked API surface for tests; defaults to the real Tauri wrappers. */
  readonly api?: IntakeApi;
}

export interface IntakeApi {
  readonly listVendorPlatforms: typeof listVendorPlatforms;
  readonly detectConfigPlatform: typeof detectConfigPlatform;
  readonly parseDeviceConfig: typeof parseDeviceConfig;
  readonly projectDeviceReceipt: typeof projectDeviceReceipt;
}

const DEFAULT_API: IntakeApi = {
  listVendorPlatforms,
  detectConfigPlatform,
  parseDeviceConfig,
  projectDeviceReceipt,
};

export function IntakePanel({ api = DEFAULT_API }: IntakePanelProps = {}): JSX.Element {
  const [state, dispatch] = useReducer(intakeReducer, initialIntakeState);

  useEffect(() => {
    let cancelled = false;
    api
      .listVendorPlatforms()
      .then((platforms) => {
        if (cancelled) return;
        dispatch({ type: "VendorPlatformsLoaded", platforms });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        dispatch({ type: "VendorPlatformsFailed", message: describeError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const onTextChange = useCallback((text: string): void => {
    dispatch({ type: "SetConfigText", text });
  }, []);

  const onClear = useCallback((): void => {
    dispatch({ type: "ClearAll" });
  }, []);

  const onFile = useCallback(async (file: File): Promise<void> => {
    const outcome = await readUtf8File(file);
    if (outcome.ok) {
      dispatch({
        type: "FileLoaded",
        text: outcome.value.text,
        filename: outcome.value.filename,
        byte_size: outcome.value.byte_size,
      });
    } else {
      dispatch({ type: "FileLoadFailed", message: outcome.message });
    }
  }, []);

  const onDetect = useCallback(async (): Promise<void> => {
    dispatch({ type: "DetectStart" });
    try {
      const result = await api.detectConfigPlatform(state.text);
      dispatch({ type: "DetectSucceeded", result });
    } catch (err) {
      dispatch({ type: "DetectFailed", message: describeError(err) });
    }
  }, [api, state.text]);

  const onSelectPlatform = useCallback(
    (platform: PlatformRef, isManualOverride: boolean): void => {
      dispatch({ type: "SelectPlatform", platform, isManualOverride });
    },
    [],
  );

  const onParse = useCallback(async (): Promise<void> => {
    const platform = state.selectedPlatform;
    if (!platform) return;
    dispatch({ type: "ParseStart" });
    let device;
    try {
      device = await api.parseDeviceConfig(platform, state.text);
    } catch (err) {
      dispatch({ type: "ParseFailed", message: describeError(err) });
      return;
    }
    try {
      const receipt = await api.projectDeviceReceipt(device);
      dispatch({ type: "ParseSucceeded", device, receipt });
    } catch (err) {
      dispatch({ type: "ReceiptFailed", message: describeError(err), device });
    }
  }, [api, state.selectedPlatform, state.text]);

  const onDismissError = useCallback((): void => {
    dispatch({ type: "DismissError" });
  }, []);

  const selectedPlatformId = state.selectedPlatform?.platform_id ?? null;

  return (
    <div className="intake-root" aria-label="Config intake">
      <ConfigInputArea
        text={state.text}
        source={state.source}
        status={state.status}
        onTextChange={onTextChange}
        onFile={(f) => void onFile(f)}
        onClear={onClear}
        onDetect={() => void onDetect()}
      />

      {state.detection && (
        <DetectionResultView
          result={state.detection}
          isManualOverride={state.isManualOverride}
          selectedPlatformId={selectedPlatformId}
        />
      )}

      <ParseStatusView
        status={state.status}
        errorStage={state.errorStage}
        errorMessage={state.errorMessage}
        selectedPlatformId={selectedPlatformId}
        isManualOverride={state.isManualOverride}
        onParse={() => void onParse()}
        onDismissError={onDismissError}
      />

      {(state.detection || state.vendorPlatforms.length > 0) && (
        <PlatformOverrideSelect
          platforms={state.vendorPlatforms}
          vendorListError={state.vendorListError}
          selectedPlatformId={selectedPlatformId}
          isManualOverride={state.isManualOverride}
          disabled={state.status === "detecting" || state.status === "parsing"}
          onSelect={onSelectPlatform}
        />
      )}

      {state.status === "parsed" && state.receipt && (
        <ReceiptDisplay receipt={state.receipt} isManualOverride={state.isManualOverride} />
      )}
    </div>
  );
}
