import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type JSX,
} from "react";
import { archiveIntake, archiveKindFromFilename } from "../../api/archiveIntake";
import { detectConfigPlatform } from "../../api/configDetection";
import { parseDeviceConfig } from "../../api/parser";
import { projectDeviceReceipt } from "../../api/receipt";
import { validateDeviceModel } from "../../api/validator";
import { listVendorPlatforms } from "../../api/vendor";
import { splitConfigBatch } from "../../api/configBatch";
import { importDiscoveryRecords, previewDiscoveryImport } from "../../api/discovery";
import { buildDiscoveryImportCandidates } from "../../data/discoveryImport";
import type {
  DiscoveryImportCommitResult,
  DiscoveryImportPreview,
} from "../../types/discovery";
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
import { IntakeWorkspace } from "./components/IntakeWorkspace";
import { ParseStatusView } from "./components/ParseStatusView";
import { PlatformOverrideSelect } from "./components/PlatformOverrideSelect";
import { ReceiptDisplay } from "./components/ReceiptDisplay";
import type { IntakeState } from "./intakeTypes";
import type { ValidationReport } from "../../types/validator";
import { runBatch } from "./orchestration/runBatch";
import { buildBatchRunExport, stringifyBatchRunExport } from "./export/batchRunExport";
import { renderBatchRunMarkdown } from "./export/batchRunMarkdown";
import { saveToFile } from "./export/saveFile";
import type {
  BatchRunExportFormat,
  BatchRunExportStatus,
} from "./components/RunSummaryStrip";

/**
 * V1Q — default bounded concurrency for batch runs. The
 * concurrencyPool collapses cleanly at maxInFlight=1 so this
 * can be lowered to 1 as a fallback without code changes.
 */
export const BATCH_RUN_MAX_IN_FLIGHT = 4;
import { describeError, readUtf8File } from "./fileText";
import { intakeReducer } from "./intakeReducer";
import {
  findSlice,
  initialIntakeState,
  isSingleConfigResult,
} from "./intakeTypes";
import { buildIntakeContextSummary } from "./intakeContextSummary";

import "./intake.css";

export interface IntakePanelProps {
  /** Inject mocked API surface for tests; defaults to the real Tauri wrappers. */
  readonly api?: IntakeApi;
  /** Active operator-environment id for V1AH discovery-import preview. */
  readonly activeEnvironmentId?: string | null;
  /** V1AI — invoked after a successful Discovery import so the App can
   *  refresh its discovery inventory (Ops Console will reflect the new count). */
  readonly onDiscoveryImported?: () => void | Promise<void>;
  /** V1BO — invoked whenever IntakeState changes, allowing parent to derive
   *  a sanitized summary for the shared WorkbenchContextSummary. */
  readonly onIntakeStateChange?: (summary: import("../../state/workbenchContextSummary").WorkbenchIntakeSummary) => void;
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
  // V1AH — optional so pre-V1AH tests can omit it. Production
  // DEFAULT_API always includes the real wrapper.
  readonly previewDiscoveryImport?: typeof previewDiscoveryImport;
  // V1AI — optional so pre-V1AI tests can omit it. Production
  // DEFAULT_API always includes the real wrapper.
  readonly importDiscoveryRecords?: typeof importDiscoveryRecords;
}

const DEFAULT_API: IntakeApi = {
  listVendorPlatforms,
  detectConfigPlatform,
  parseDeviceConfig,
  projectDeviceReceipt,
  splitConfigBatch,
  archiveIntake,
  validateDeviceModel,
  previewDiscoveryImport,
  importDiscoveryRecords,
};

/** V1AH preview status — surfaced verbatim by RunSummaryStrip. */
export type DiscoveryImportPreviewStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running" }
  | { readonly kind: "ready"; readonly preview: DiscoveryImportPreview }
  | { readonly kind: "failed"; readonly message: string };

/** V1AI import commit status — surfaced verbatim by RunSummaryStrip. */
export type DiscoveryImportCommitStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running" }
  | { readonly kind: "imported"; readonly result: DiscoveryImportCommitResult }
  | { readonly kind: "failed"; readonly message: string };

export function IntakePanel({
  api = DEFAULT_API,
  activeEnvironmentId = null,
  onDiscoveryImported,
  onIntakeStateChange,
}: IntakePanelProps = {}): JSX.Element {
  const [state, dispatch] = useReducer(intakeReducer, initialIntakeState);
  const [exportStatus, setExportStatus] =
    useState<BatchRunExportStatus | null>(null);
  const [discoveryPreview, setDiscoveryPreview] =
    useState<DiscoveryImportPreviewStatus>({ kind: "idle" });
  const [discoveryCommit, setDiscoveryCommit] =
    useState<DiscoveryImportCommitStatus>({ kind: "idle" });

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

  // ---- V1BO — Intake state summary projection ------------------
  useEffect(() => {
    if (onIntakeStateChange) {
      onIntakeStateChange(buildIntakeContextSummary(state));
    }
  }, [state, onIntakeStateChange]);

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
      // V1Q — if drilled-in within a batch with a BatchRun, store
      // the operator's choice on the per-device entry too. Override
      // is operator truth: it survives re-run.
      const snap = stateRef.current;
      const drilledId = snap.batch?.drilledSliceId ?? null;
      if (drilledId && snap.batch?.batchRun) {
        dispatch({
          type: "BatchRunOverrideSelected",
          sliceId: drilledId,
          platform,
          isManualOverride,
        });
      }
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

  // ---- V1Q Batch Run orchestration --------------------------------
  //
  // SEPARATE useEffect from the V1P validator trigger (which remains
  // byte-identical above). Deps array contains ONLY the run epoch +
  // api — both are stable across per-device dispatches, so the effect
  // does NOT re-fire when individual BatchRunDevice* actions land.
  //
  // The V1P validator-trigger bugfix discipline is replicated here:
  // - Re-entrancy guarded by a ref-counted last-fired epoch.
  // - Cancellation uses a mutable closure (`cancelRef.current`) so
  //   the orchestrator's isCancelled() callback observes a flip
  //   without depending on a fresh deps-array tick.
  // - Cleanup flips the cancellation closure; new runs install a
  //   fresh one before kicking off.
  const batchRun = state.batch?.batchRun ?? null;
  const runEpoch = batchRun?.epoch ?? 0;
  const lastRunEpochRef = useRef<number>(0);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const stateRef = useRef<IntakeState>(state);
  stateRef.current = state;

  useEffect(() => {
    if (runEpoch === 0) return;
    if (lastRunEpochRef.current === runEpoch) return;
    lastRunEpochRef.current = runEpoch;
    // Snapshot state at fire-time. The orchestrator dispatches per
    // slice id; the reducer's applyDeviceUpdate guards against
    // missing batchRun, so dispatches that arrive after cancellation
    // are inert no-ops.
    const snap = stateRef.current;
    if (!snap.batch || !snap.batch.batchRun) return;
    const slicesByID = new Map(
      snap.batch.splitResult.slices.map((s) => [s.slice_id, s]),
    );
    const archiveName = snap.batch.archiveName;
    const devices = snap.batch.batchRun.devices;

    // Install a fresh cancel closure for this run. Cleanup flips
    // it; the orchestrator checks it between every await.
    const myCancel = { cancelled: false };
    cancelRef.current = myCancel;

    void runBatch({
      api,
      devices,
      slicesByID,
      dispatch,
      maxInFlight: BATCH_RUN_MAX_IN_FLIGHT,
      isCancelled: () => myCancel.cancelled,
      archiveName,
    });

    return () => {
      myCancel.cancelled = true;
    };
  }, [api, runEpoch]);

  // Cancel any in-flight run as soon as the batchRun reference goes
  // null (operator cleared input, opened a new file, etc.). The
  // existing SetConfigText / FileLoaded / ArchiveOpenStart reducer
  // cases clear state.batch entirely; this side-effect makes that
  // teardown observable to the in-flight orchestrator.
  const batchRunPresent = batchRun !== null;
  useEffect(() => {
    if (!batchRunPresent) {
      cancelRef.current.cancelled = true;
    }
  }, [batchRunPresent]);

  const onAnalyseBatch = useCallback((): void => {
    setExportStatus(null);
    dispatch({ type: "BatchRunRequested" });
  }, []);

  const onReRunBatch = useCallback((): void => {
    setExportStatus(null);
    dispatch({ type: "BatchRunReRunRequested" });
  }, []);

  const onCopyBatchExport = useCallback(
    async (format: BatchRunExportFormat): Promise<void> => {
      const run = stateRef.current.batch?.batchRun ?? null;
      if (
        !run ||
        (run.status !== "complete" && run.status !== "complete_with_failures")
      ) {
        return;
      }
      const exported = buildBatchRunExport(run);
      const text =
        format === "json"
          ? stringifyBatchRunExport(exported)
          : renderBatchRunMarkdown(exported);
      try {
        await writeClipboardText(text);
        setExportStatus({ kind: "copied", format });
      } catch (err) {
        setExportStatus({
          kind: "failed",
          format,
          message: describeError(err),
        });
      }
    },
    [],
  );

  // V1AH — preview Discovery import from the live BatchRun + active env.
  // Pure handler; no persistence, no mutation. Resets status on each call.
  const onPreviewDiscoveryImport = useCallback(async (): Promise<void> => {
    const previewFn = api.previewDiscoveryImport;
    if (!previewFn) return;
    const run = stateRef.current.batch?.batchRun ?? null;
    if (!run || !activeEnvironmentId) return;
    const built = buildDiscoveryImportCandidates(run, activeEnvironmentId);
    if (built.candidates.length === 0) return;
    setDiscoveryPreview({ kind: "running" });
    try {
      const preview = await previewFn(activeEnvironmentId, built.candidates);
      setDiscoveryPreview({ kind: "ready", preview });
    } catch (err) {
      setDiscoveryPreview({ kind: "failed", message: describeError(err) });
    }
  }, [activeEnvironmentId, api]);

  // V1AI — authoritative import. Reads current BatchRun + active env,
  // recomputes acceptance via Rust, persists, then notifies App to refresh.
  const onImportDiscoveryRecords = useCallback(async (): Promise<void> => {
    const importFn = api.importDiscoveryRecords;
    if (!importFn) return;
    const run = stateRef.current.batch?.batchRun ?? null;
    if (!run || !activeEnvironmentId) return;
    const built = buildDiscoveryImportCandidates(run, activeEnvironmentId);
    if (built.candidates.length === 0) return;
    setDiscoveryCommit({ kind: "running" });
    try {
      const result = await importFn(activeEnvironmentId, built.candidates);
      setDiscoveryCommit({ kind: "imported", result });
      if (onDiscoveryImported) {
        await onDiscoveryImported();
      }
    } catch (err) {
      setDiscoveryCommit({ kind: "failed", message: describeError(err) });
    }
  }, [activeEnvironmentId, api, onDiscoveryImported]);

  // Honest importable count from live BatchRun + env. 0 hides the action.
  const discoveryImportableCount: number = (() => {
    const run = state.batch?.batchRun ?? null;
    if (!run || !activeEnvironmentId) return 0;
    return buildDiscoveryImportCandidates(run, activeEnvironmentId).candidates.length;
  })();

  const onCopyJson = useCallback((): void => {
    void onCopyBatchExport("json");
  }, [onCopyBatchExport]);

  const onCopyMarkdown = useCallback((): void => {
    void onCopyBatchExport("markdown");
  }, [onCopyBatchExport]);

  const onSaveBatchExport = useCallback(
    async (format: BatchRunExportFormat): Promise<void> => {
      const run = stateRef.current.batch?.batchRun ?? null;
      if (
        !run ||
        (run.status !== "complete" && run.status !== "complete_with_failures")
      ) {
        return;
      }
      const exported = buildBatchRunExport(run);
      const text =
        format === "json"
          ? stringifyBatchRunExport(exported)
          : renderBatchRunMarkdown(exported);
      const ext = format === "json" ? "json" : "md";
      const mime = format === "json" ? "application/json" : "text/markdown";
      const outcome = await saveToFile(text, {
        suggestedName: `anthracite-batch-run.${ext}`,
        mimeType: mime,
        extension: ext,
      });
      if ("cancelled" in outcome) {
        return;
      }
      if ("error" in outcome) {
        setExportStatus({
          kind: "failed",
          format,
          message: outcome.message,
        });
        return;
      }
      setExportStatus({ kind: "saved", format });
    },
    [],
  );

  const onSaveJson = useCallback((): void => {
    void onSaveBatchExport("json");
  }, [onSaveBatchExport]);

  const onSaveMarkdown = useCallback((): void => {
    void onSaveBatchExport("markdown");
  }, [onSaveBatchExport]);

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

  // ---- V1P-A workspace composition ------------------------------
  // The workspace renders the operator surface (left lane) and the
  // engine-truth surface (right lane). Batch-summary, archive
  // inventory, and split/archive errors are full-width chrome that
  // pre-empts the workspace. The drilled-in header is a full-width
  // strip ABOVE the workspace.
  const showWorkspace =
    !showBatchSummary && state.batchStatus !== "splitting";
  const hasAnswerContent =
    state.status === "parsed" && state.receipt !== null;

  const workLane = (
    <>
      {!showDrilledHeader && (
        <div className="intake-lane-item intake-lane-item--accent-input">
          <ConfigInputArea
            text={state.text}
            source={state.source}
            status={state.status}
            onTextChange={onTextChange}
            onFile={(f) => void onFile(f)}
            onClear={onClear}
            onDetect={() => void onDetect()}
          />
        </div>
      )}

      {state.detection && (
        <div className="intake-lane-item intake-lane-item--accent-engine">
          <DetectionResultView
            result={state.detection}
            isManualOverride={state.isManualOverride}
            selectedPlatformId={selectedPlatformId}
          />
        </div>
      )}

      {state.batchStatus !== "split_error" && (
        <div className={`intake-lane-item ${parseStatusAccentClass(state)}`}>
          <ParseStatusView
            status={state.status}
            errorStage={state.errorStage}
            errorMessage={state.errorMessage}
            selectedPlatformId={selectedPlatformId}
            isManualOverride={state.isManualOverride}
            onParse={() => void onParse()}
            onDismissError={onDismissError}
          />
        </div>
      )}

      {(state.detection || state.vendorPlatforms.length > 0) && (
        <div className="intake-lane-item intake-lane-item--accent-operator">
          <PlatformOverrideSelect
            platforms={state.vendorPlatforms}
            vendorListError={state.vendorListError}
            selectedPlatformId={selectedPlatformId}
            isManualOverride={state.isManualOverride}
            disabled={state.status === "detecting" || state.status === "parsing"}
            onSelect={onSelectPlatform}
          />
        </div>
      )}
    </>
  );

  const answerLane = hasAnswerContent && state.receipt ? (
    <>
      {state.validationStatus === "loading" && (
        <div className="intake-lane-item intake-lane-item--accent-running">
          <div className="intake-findings__loading" role="status">
            Validating…
          </div>
        </div>
      )}
      {state.validationStatus === "failed" && state.validationError && (
        <div className="intake-lane-item intake-lane-item--accent-fault">
          <div className="intake-error" role="alert">
            <div className="intake-error__head">
              <span className="intake-tag intake-tag--err">
                ERROR · validator
              </span>
            </div>
            <div className="intake-error__body">{state.validationError}</div>
          </div>
        </div>
      )}
      {state.validationStatus === "ready" && state.validationReport && (
        <div
          className={`intake-lane-item ${findingsAccentClass(state.validationReport)}`}
        >
          <FindingsPanel report={state.validationReport} />
        </div>
      )}
      <div className="intake-lane-item intake-lane-item--accent-truth">
        <ReceiptDisplay
          receipt={state.receipt}
          isManualOverride={state.isManualOverride}
        />
      </div>
    </>
  ) : null;

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
          batchRun={state.batch.batchRun}
          onAnalyse={onAnalyseBatch}
          onReRun={onReRunBatch}
          onCopyJson={onCopyJson}
          onCopyMarkdown={onCopyMarkdown}
          onSaveJson={onSaveJson}
          onSaveMarkdown={onSaveMarkdown}
          exportStatus={exportStatus}
          activeEnvironmentId={activeEnvironmentId}
          discoveryImportableCount={discoveryImportableCount}
          discoveryPreviewStatus={discoveryPreview}
          onPreviewDiscoveryImport={() => void onPreviewDiscoveryImport()}
          discoveryCommitStatus={discoveryCommit}
          onImportDiscoveryRecords={() => void onImportDiscoveryRecords()}
        />
      )}

      {showWorkspace && (
        <IntakeWorkspace workLane={workLane} answerLane={answerLane} />
      )}
    </div>
  );
}

async function writeClipboardText(text: string): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard?.writeText) {
    throw new Error("clipboard unavailable");
  }
  await clipboard.writeText(text);
}

/**
 * V1P-A — parse-status lane-item rail color, derived from
 * IntakeState. Role tokens only; never raw --anth-* primitives.
 */
function parseStatusAccentClass(state: IntakeState): string {
  switch (state.status) {
    case "parsed":
      return "intake-lane-item--accent-clean";
    case "parsing":
    case "detecting":
      return "intake-lane-item--accent-running";
    case "error":
      return "intake-lane-item--accent-fault";
    default:
      return "intake-lane-item--accent-neutral";
  }
}

/**
 * V1P-A — findings lane-item rail color, derived from the report
 * severity mix. Mapping is fixed in INTAKE_SURFACE_CONTRACT.md
 * "Workspace layout (V1P-A overlay)".
 */
function findingsAccentClass(report: ValidationReport): string {
  let hasFault = false;
  let hasWarn = false;
  for (const finding of report.findings) {
    if (finding.severity === "critical" || finding.severity === "high") {
      hasFault = true;
      break;
    }
    if (finding.severity === "medium" || finding.severity === "low") {
      hasWarn = true;
    }
  }
  if (hasFault) return "intake-lane-item--accent-fault";
  if (hasWarn) return "intake-lane-item--accent-warn";
  return "intake-lane-item--accent-clean";
}
