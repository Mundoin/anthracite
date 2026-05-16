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
import { splitConfigBatch } from "../../api/configBatch";
import type { PlatformRef } from "../../types/networkModel";
import { BatchSummaryView } from "./components/BatchSummaryView";
import { ConfigInputArea } from "./components/ConfigInputArea";
import { DetectionResultView } from "./components/DetectionResultView";
import { ParseStatusView } from "./components/ParseStatusView";
import { PlatformOverrideSelect } from "./components/PlatformOverrideSelect";
import { ReceiptDisplay } from "./components/ReceiptDisplay";
import { describeError, readUtf8File } from "./fileText";
import { intakeReducer } from "./intakeReducer";
import {
  findSlice,
  initialIntakeState,
  isSingleConfigResult,
} from "./intakeTypes";

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
  readonly splitConfigBatch: typeof splitConfigBatch;
}

const DEFAULT_API: IntakeApi = {
  listVendorPlatforms,
  detectConfigPlatform,
  parseDeviceConfig,
  projectDeviceReceipt,
  splitConfigBatch,
};

export function IntakePanel({ api = DEFAULT_API }: IntakePanelProps = {}): JSX.Element {
  const [state, dispatch] = useReducer(intakeReducer, initialIntakeState);

  // ---- Vendor registry load (once) -------------------------------
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

  // ---- Per-slice detection on batch render (R3) ------------------
  const batch = state.batch;
  const inBatchView =
    state.batchStatus === "split_complete" && batch !== null && batch.drilledSliceId === null;
  useEffect(() => {
    if (!inBatchView || !batch) return;
    let cancelled = false;
    const pending = batch.splitResult.slices.filter(
      (s) => batch.perSliceDetection[s.slice_id]?.status === "pending",
    );
    for (const slice of pending) {
      api
        .detectConfigPlatform(slice.raw_text)
        .then((result) => {
          if (cancelled) return;
          dispatch({
            type: "PerSliceDetectionSucceeded",
            sliceId: slice.slice_id,
            result,
          });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          dispatch({
            type: "PerSliceDetectionFailed",
            sliceId: slice.slice_id,
            message: describeError(err),
          });
        });
    }
    return () => {
      cancelled = true;
    };
    // Re-run when the slice list changes (new batch). perSliceDetection
    // updates trigger re-runs too, but pending filter makes them no-ops.
  }, [api, inBatchView, batch]);

  // ---- Operator actions ------------------------------------------
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
    // V1O-A: always split first. SingleConfig → V1O detect path
    // (regression lock R4). Multi-slice → batch summary path.
    if (state.text.length === 0) return;
    dispatch({ type: "SplitStart" });
    let splitResult;
    try {
      splitResult = await api.splitConfigBatch(state.text);
    } catch (err) {
      dispatch({ type: "SplitFailed", message: describeError(err) });
      return;
    }
    if (isSingleConfigResult(splitResult)) {
      // Fall straight through to V1O detection on the original text.
      dispatch({ type: "SplitToSingle", result: splitResult });
      try {
        const det = await api.detectConfigPlatform(state.text);
        dispatch({ type: "DetectSucceeded", result: det });
      } catch (err) {
        dispatch({ type: "DetectFailed", message: describeError(err) });
      }
    } else {
      dispatch({ type: "SplitToBatch", result: splitResult });
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

  const onOpenSlice = useCallback((sliceId: string): void => {
    dispatch({ type: "DrillIntoSlice", sliceId });
  }, []);

  const onBackToBatch = useCallback((): void => {
    dispatch({ type: "BackToBatch" });
  }, []);

  const onTreatAsSingleConfig = useCallback((): void => {
    dispatch({ type: "TreatAsSingleConfig" });
  }, []);

  const selectedPlatformId = state.selectedPlatform?.platform_id ?? null;
  const drilledSlice = findSlice(state.batch, state.batch?.drilledSliceId ?? null);
  const showBatchSummary = inBatchView;
  const showDrilledHeader =
    state.batchStatus === "split_complete" &&
    state.batch !== null &&
    drilledSlice !== undefined;

  return (
    <div className="intake-root" aria-label="Config intake">
      {showDrilledHeader && state.batch && drilledSlice && (
        <header className="intake-drilldown__header" aria-label="Drilled slice header">
          <button
            type="button"
            className="intake-btn"
            onClick={onBackToBatch}
            aria-label="Back to batch"
          >
            ← Back to batch
          </button>
          <div className="intake-drilldown__crumbs">
            <span className="intake-drilldown__crumb">
              batch ({state.batch.splitResult.slices.length})
            </span>
            <span className="intake-drilldown__sep">›</span>
            <span className="intake-drilldown__crumb intake-drilldown__crumb--current">
              {drilledSlice.slice_id}
              {drilledSlice.hint.kind === "hostname_present" && (
                <span className="intake-muted"> · {drilledSlice.hint.hostname}</span>
              )}
            </span>
          </div>
        </header>
      )}

      {!showDrilledHeader && (
        <ConfigInputArea
          text={state.text}
          source={state.source}
          status={state.status}
          onTextChange={onTextChange}
          onFile={(f) => void onFile(f)}
          onClear={onClear}
          onDetect={() => void onDetect()}
        />
      )}

      {state.batchStatus === "splitting" && (
        <div className="intake-batch__splitting" role="status">
          Splitting input into device slices…
        </div>
      )}

      {state.batchStatus === "split_error" && state.errorMessage && (
        <div className="intake-error" role="alert">
          <div className="intake-error__head">
            <span className="intake-tag intake-tag--err">ERROR · split</span>
            <button type="button" className="intake-btn intake-btn--tiny" onClick={onDismissError}>
              Dismiss
            </button>
          </div>
          <div className="intake-error__body">{state.errorMessage}</div>
        </div>
      )}

      {showBatchSummary && state.batch && (
        <BatchSummaryView
          result={state.batch.splitResult}
          perSliceDetection={state.batch.perSliceDetection}
          onOpenSlice={onOpenSlice}
          onTreatAsSingleConfig={onTreatAsSingleConfig}
          disabled={false}
        />
      )}

      {!showBatchSummary && state.batchStatus !== "splitting" && state.detection && (
        <DetectionResultView
          result={state.detection}
          isManualOverride={state.isManualOverride}
          selectedPlatformId={selectedPlatformId}
        />
      )}

      {!showBatchSummary && state.batchStatus !== "splitting" && state.batchStatus !== "split_error" && (
        <ParseStatusView
          status={state.status}
          errorStage={state.errorStage}
          errorMessage={state.errorMessage}
          selectedPlatformId={selectedPlatformId}
          isManualOverride={state.isManualOverride}
          onParse={() => void onParse()}
          onDismissError={onDismissError}
        />
      )}

      {!showBatchSummary &&
        state.batchStatus !== "splitting" &&
        (state.detection || state.vendorPlatforms.length > 0) && (
          <PlatformOverrideSelect
            platforms={state.vendorPlatforms}
            vendorListError={state.vendorListError}
            selectedPlatformId={selectedPlatformId}
            isManualOverride={state.isManualOverride}
            disabled={state.status === "detecting" || state.status === "parsing"}
            onSelect={onSelectPlatform}
          />
        )}

      {!showBatchSummary && state.status === "parsed" && state.receipt && (
        <ReceiptDisplay receipt={state.receipt} isManualOverride={state.isManualOverride} />
      )}
    </div>
  );
}
