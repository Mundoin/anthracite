import {
  useCallback,
  useEffect,
  useReducer,
  type JSX,
} from "react";
import { archiveIntake, archiveKindFromFilename } from "../../api/archiveIntake";
import { detectConfigPlatform } from "../../api/configDetection";
import { parseDeviceConfig } from "../../api/parser";
import { projectDeviceReceipt } from "../../api/receipt";
import { validateDeviceModel } from "../../api/validator";
import { listVendorPlatforms } from "../../api/vendor";
import { splitConfigBatch } from "../../api/configBatch";
import type {
  ArchiveEntry,
  ArchiveEntryRef,
} from "../../types/archiveIntake";
import type { ConfigSlice } from "../../types/configBatch";
import type { PlatformRef } from "../../types/networkModel";
import type {
  DetectionSource,
  SelectionMode,
  SourceContext,
  ValidatorContext,
} from "../../types/validator";
import { ArchiveInventoryPanel } from "./components/ArchiveInventoryPanel";
import { ArchiveOpenButton } from "./components/ArchiveOpenButton";
import { ArchiveSourceBadge } from "./components/ArchiveSourceBadge";
import { BatchSummaryView } from "./components/BatchSummaryView";
import { ConfigInputArea } from "./components/ConfigInputArea";
import { DetectionResultView } from "./components/DetectionResultView";
import { FindingsPanel } from "./components/FindingsPanel";
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
  readonly archiveIntake: typeof archiveIntake;
  // Optional so pre-V1P tests can omit it. Production DEFAULT_API
  // always includes the real wrapper. The trigger useEffect is a
  // no-op when this is undefined.
  readonly validateDeviceModel?: typeof validateDeviceModel;
}

const DEFAULT_API: IntakeApi = {
  listVendorPlatforms,
  detectConfigPlatform,
  parseDeviceConfig,
  projectDeviceReceipt,
  splitConfigBatch,
  archiveIntake,
  validateDeviceModel,
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

  const onOpenArchive = useCallback(
    async (file: File): Promise<void> => {
      dispatch({
        type: "ArchiveOpenStart",
        filename: file.name,
        byte_size: file.size,
      });
      const kindHint = archiveKindFromFilename(file.name);
      if (!kindHint) {
        dispatch({
          type: "ArchiveOpenFailed",
          message: `Unsupported archive extension on '${file.name}'. Accepted: .zip, .tar, .tar.gz, .tgz`,
        });
        return;
      }
      let bytes: Uint8Array;
      try {
        const ab = await file.arrayBuffer();
        bytes = new Uint8Array(ab);
      } catch (err) {
        dispatch({
          type: "ArchiveOpenFailed",
          message: `Could not read archive bytes: ${describeError(err)}`,
        });
        return;
      }
      let intake;
      try {
        intake = await api.archiveIntake(bytes, kindHint);
      } catch (err) {
        dispatch({
          type: "ArchiveOpenFailed",
          message: describeError(err),
        });
        return;
      }

      const extracted: ReadonlyArray<ArchiveEntry> = intake.entries.filter(
        (e) => e.status.kind === "extracted" && e.raw_text !== null,
      );

      // R11 regression lock: single extracted entry whose split yields
      // a single_config slice falls straight through to the V1O
      // single-config flow.
      if (extracted.length === 1) {
        const onlyEntry = extracted[0];
        const entryText = onlyEntry.raw_text ?? "";
        try {
          const split = await api.splitConfigBatch(entryText);
          if (isSingleConfigResult(split)) {
            dispatch({
              type: "ArchiveSingleConfigPassthrough",
              text: entryText,
              entry_path: onlyEntry.path,
              archive_name: file.name,
              inventory: intake,
            });
            try {
              const det = await api.detectConfigPlatform(entryText);
              dispatch({ type: "DetectSucceeded", result: det });
            } catch (err) {
              dispatch({
                type: "DetectFailed",
                message: describeError(err),
              });
            }
            return;
          }
        } catch (err) {
          dispatch({
            type: "ArchiveOpenFailed",
            message: `Split failed for archive entry '${onlyEntry.path}': ${describeError(err)}`,
          });
          return;
        }
      }

      // Multi-entry OR single-entry-multi-config → flatten per-entry
      // splits and build a synthesised batch result with provenance.
      dispatch({ type: "ArchiveIntakeSplittingStart" });
      const flatSlices: ConfigSlice[] = [];
      const provenance: Record<string, ArchiveEntryRef> = {};
      let totalLines = 0;
      let scannedLines = 0;
      let splitterVersion = "1";
      for (const entry of extracted) {
        const entryText = entry.raw_text ?? "";
        let split;
        try {
          split = await api.splitConfigBatch(entryText);
        } catch (err) {
          dispatch({
            type: "ArchiveOpenFailed",
            message: `Split failed for archive entry '${entry.path}': ${describeError(err)}`,
          });
          return;
        }
        splitterVersion = split.splitter_version;
        totalLines += split.total_line_count;
        scannedLines += split.scanned_line_count;
        for (const slice of split.slices) {
          const namespacedId = `${entry.entry_id}/${slice.slice_id}`;
          flatSlices.push({ ...slice, slice_id: namespacedId });
          provenance[namespacedId] = {
            entry_id: entry.entry_id,
            entry_path: entry.path,
            archive_name: file.name,
          };
        }
      }
      dispatch({
        type: "ArchiveBatchAssembled",
        result: {
          slices: flatSlices,
          // Synthesised — actual per-entry methods are visible via the
          // archive inventory panel; the batch summary's `method`
          // field is a single label so we pick `heuristic` as the
          // honest catch-all when flattening across entries.
          method: { kind: "heuristic" },
          warnings: [],
          total_line_count: totalLines,
          scanned_line_count: scannedLines,
          splitter_version: splitterVersion,
        },
        inventory: intake,
        provenance,
        archive_name: file.name,
      });
    },
    [api],
  );

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

  // ---- V1P validator trigger ------------------------------------
  // Fires once after a successful parse + receipt projection. Mirrors
  // the V1O-A per-slice detection useEffect pattern: the reducer
  // owns the state transitions; the effect owns the async call.
  //
  // BUG FIX (V1P-runtime): the effect must NOT depend on
  // `state.validationStatus` AND must NOT cancel in-flight calls
  // on re-render. The dispatch of `ValidatorStarted` flips
  // `validationStatus` from "idle" to "loading"; if it were in
  // deps, React would re-run the effect, fire the cleanup, set
  // `cancelled = true`, and the in-flight Tauri response would
  // silently drop. The reducer guards `ValidatorSucceeded` /
  // `ValidatorFailed` against late dispatches instead.
  useEffect(() => {
    if (state.status !== "parsed") return;
    if (state.validationStatus !== "idle") return;
    const device = state.device;
    const platform = state.selectedPlatform;
    if (!device || !platform) return;
    const validate = api.validateDeviceModel;
    if (!validate) return;

    dispatch({ type: "ValidatorStarted" });

    const archiveName = state.batch?.archiveName ?? null;
    const drilledSliceId = state.batch?.drilledSliceId ?? null;
    const sourceKind: SourceContext["kind"] =
      state.source?.kind === "archive"
        ? archiveName
          ? "archive_entry"
          : "file"
        : state.source?.kind === "file"
          ? "file"
          : state.source?.kind === "paste"
            ? "paste"
            : null;
    const selectionMode: SelectionMode = state.isManualOverride
      ? "manual_override"
      : "from_detection";
    const detectionSource: DetectionSource = state.isManualOverride
      ? "manual_override"
      : state.detection?.best_match
        ? "best_match"
        : "not_applicable";
    const ctx: ValidatorContext = {
      platform_id: platform.platform_id,
      parser_id: platform.platform_id,
      parser_version: device.evidence?.parser_version ?? null,
      selection_mode: selectionMode,
      detection_confidence: state.detection?.confidence ?? null,
      detection_source: detectionSource,
      source_context: {
        kind: sourceKind,
        label: state.source?.filename ?? null,
        archive_name: archiveName,
        slice_id: drilledSliceId,
      },
    };
    validate(device, ctx)
      .then((report) => {
        dispatch({ type: "ValidatorSucceeded", report });
      })
      .catch((err: unknown) => {
        dispatch({ type: "ValidatorFailed", error: describeError(err) });
      });
  }, [
    api,
    state.batch,
    state.detection,
    state.device,
    state.isManualOverride,
    state.selectedPlatform,
    state.source,
    state.status,
  ]);

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
  const archiveInventory = state.batch?.archiveInventory ?? null;
  const archiveProvenance = state.batch?.archiveProvenance ?? null;
  const archiveName = state.batch?.archiveName ?? null;
  const drilledProvenance =
    drilledSlice && archiveProvenance
      ? archiveProvenance[drilledSlice.slice_id]
      : null;
  const archiveBusy =
    state.batchStatus === "archive_loading" ||
    state.batchStatus === "archive_splitting";

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
            {drilledProvenance && (
              <ArchiveSourceBadge provenance={drilledProvenance} />
            )}
          </div>
        </header>
      )}

      {!showDrilledHeader && (
        <>
          <div className="intake-archive-bar" aria-label="Archive intake">
            <ArchiveOpenButton
              onArchive={(f) => void onOpenArchive(f)}
              disabled={archiveBusy || state.status === "detecting" || state.status === "parsing"}
            />
            {state.batchStatus === "archive_loading" && (
              <span className="intake-muted" role="status">
                Reading archive…
              </span>
            )}
            {state.batchStatus === "archive_splitting" && (
              <span className="intake-muted" role="status">
                Splitting archive entries…
              </span>
            )}
          </div>
          <ConfigInputArea
            text={state.text}
            source={state.source}
            status={state.status}
            onTextChange={onTextChange}
            onFile={(f) => void onFile(f)}
            onClear={onClear}
            onDetect={() => void onDetect()}
          />
        </>
      )}

      {state.batchStatus === "archive_error" && state.errorMessage && (
        <div className="intake-error" role="alert">
          <div className="intake-error__head">
            <span className="intake-tag intake-tag--err">ERROR · archive</span>
            <button
              type="button"
              className="intake-btn intake-btn--tiny"
              onClick={onDismissError}
            >
              Dismiss
            </button>
          </div>
          <div className="intake-error__body">{state.errorMessage}</div>
        </div>
      )}

      {showBatchSummary && archiveInventory && archiveName && (
        <ArchiveInventoryPanel
          inventory={archiveInventory}
          archiveName={archiveName}
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
          archiveProvenance={
            archiveProvenance ?? undefined
          }
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
        <>
          {state.validationStatus === "loading" && (
            <div className="intake-findings__loading" role="status">
              Validating…
            </div>
          )}
          {state.validationStatus === "failed" && state.validationError && (
            <div className="intake-error" role="alert">
              <div className="intake-error__head">
                <span className="intake-tag intake-tag--err">
                  ERROR · validator
                </span>
              </div>
              <div className="intake-error__body">{state.validationError}</div>
            </div>
          )}
          {state.validationStatus === "ready" && state.validationReport && (
            <FindingsPanel report={state.validationReport} />
          )}
          <ReceiptDisplay
            receipt={state.receipt}
            isManualOverride={state.isManualOverride}
          />
        </>
      )}
    </div>
  );
}
