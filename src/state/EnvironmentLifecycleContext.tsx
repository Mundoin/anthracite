import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type {
  EnvironmentLifecycleStoreState,
  LocalEnvironmentRecord,
} from "../types/localEnvironment";
import {
  createInitialStore,
  createEnvironmentFromScenario,
  selectActiveEnvironment,
  renameEnvironment,
  duplicateEnvironment,
  archiveEnvironment,
  restoreEnvironment,
  loadStore as loadStoreOp,
  resetToDefault as resetToDefaultOp,
  markStoreSaved,
  bumpStoreRevision,
  getActiveEnvironment as getActiveEnvironmentOp,
  getEnvironmentById as getEnvironmentByIdOp,
  listEnvironments as listEnvironmentsOp,
  buildEnvironmentPreview as buildEnvironmentPreviewOp,
  DEFAULT_LIFECYCLE_CLOCK,
  type LifecycleClock,
} from "./environmentLifecycle";
import {
  saveStoreToAdapter,
  loadStoreFromAdapter,
} from "./environmentPersistenceIO";
import {
  BrowserLocalStorageAdapter,
  type StorageAdapter,
} from "./environmentPersistenceAdapter";
import type { PersistenceLoadResult } from "./environmentPersistence";

export interface SaveStatus {
  readonly status: "saved" | "saving" | "error" | "never";
  readonly last_saved_at: string | null;
  readonly error: string | null;
}

export interface LoadStatus {
  readonly status: PersistenceLoadResult["status"] | "initial";
  readonly source: PersistenceLoadResult["source"] | null;
  readonly warnings: readonly string[];
}

export interface EnvironmentLifecycleContextValue {
  readonly state: EnvironmentLifecycleStoreState;
  readonly save_status: SaveStatus;
  readonly load_status: LoadStatus;
  readonly active: LocalEnvironmentRecord | null;
  readonly visible_environments: readonly LocalEnvironmentRecord[];

  // mutation actions — all auto-trigger save
  createFromScenario(scenarioId: string, name?: string): void;
  selectActive(id: string | null): void;
  rename(id: string, name: string): void;
  duplicate(id: string): void;
  archive(id: string): void;
  restore(id: string): void;

  // builder API — preview + commit pattern
  buildPreview(scenarioId: string, name?: string): LocalEnvironmentRecord;
  commitEnvironment(record: LocalEnvironmentRecord, options?: { readonly setActive?: boolean }): void;

  // store-level actions
  reloadFromDisk(): void;
  resetToDefault(): void;
  saveNow(): void;

  // read helpers
  getById(id: string): LocalEnvironmentRecord | undefined;
  listAll(includeArchived?: boolean): readonly LocalEnvironmentRecord[];
}

// Exported so callers that prefer optional consumption (e.g. components
// that render in both lifecycle-wrapped and stand-alone contexts) can
// use `useContext` directly. Stage V1BF.
export const EnvironmentLifecycleContext =
  createContext<EnvironmentLifecycleContextValue | null>(null);

type ProviderAction =
  | { type: "create"; scenarioId: string; name?: string }
  | { type: "select"; id: string | null }
  | { type: "rename"; id: string; name: string }
  | { type: "duplicate"; id: string }
  | { type: "archive"; id: string }
  | { type: "restore"; id: string }
  | { type: "commit_record"; record: LocalEnvironmentRecord; setActive?: boolean }
  | { type: "load"; state: EnvironmentLifecycleStoreState }
  | { type: "reset" }
  | { type: "mark-saved" };

function reducer(state: EnvironmentLifecycleStoreState, action: ProviderAction): EnvironmentLifecycleStoreState {
  let next: EnvironmentLifecycleStoreState;
  switch (action.type) {
    case "create":
      next = createEnvironmentFromScenario(state, action.scenarioId, action.name ? { name: action.name } : undefined);
      break;
    case "select":
      next = selectActiveEnvironment(state, action.id);
      break;
    case "rename":
      next = renameEnvironment(state, action.id, action.name);
      break;
    case "duplicate":
      next = duplicateEnvironment(state, action.id);
      break;
    case "archive":
      next = archiveEnvironment(state, action.id);
      break;
    case "restore":
      next = restoreEnvironment(state, action.id);
      break;
    case "commit_record": {
      // Add prebuilt record to environments array; optionally select as active
      next = {
        ...state,
        environments: [...state.environments, action.record],
        active_environment_id: action.setActive ? action.record.environment_id : state.active_environment_id,
      };
      break;
    }
    case "load":
      next = loadStoreOp(state, action.state);
      break;
    case "reset":
      next = resetToDefaultOp();
      break;
    case "mark-saved":
      next = markStoreSaved(state);
      break;
  }
  // bumps store_revision for every mutation EXCEPT mark-saved (mark-saved already preserves) and select
  if (action.type !== "mark-saved" && action.type !== "select") {
    next = bumpStoreRevision(next);
  }
  return next;
}

export interface EnvironmentLifecycleProviderProps {
  readonly children: ReactNode;
  readonly storageAdapter?: StorageAdapter; // injectable for tests; default BrowserLocalStorageAdapter
  readonly clock?: LifecycleClock; // injectable for tests
  readonly autoSave?: boolean; // default true; tests can disable
}

export function EnvironmentLifecycleProvider({
  children,
  storageAdapter,
  clock,
  autoSave = true,
}: EnvironmentLifecycleProviderProps): JSX.Element {
  const adapterRef = useRef<StorageAdapter>(storageAdapter ?? new BrowserLocalStorageAdapter());
  const clockRef = useRef<LifecycleClock>(clock ?? DEFAULT_LIFECYCLE_CLOCK);

  // Initial state: try load from adapter, else createInitialStore
  const initialLoadResult = useMemo<PersistenceLoadResult>(() => {
    return loadStoreFromAdapter(adapterRef.current, () => createInitialStore(clockRef.current));
  }, []);

  const [state, dispatch] = useReducer(reducer, initialLoadResult.state);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    status: initialLoadResult.source === "snapshot" ? "saved" : "never",
    last_saved_at: initialLoadResult.state.last_saved_at,
    error: null,
  });
  const [loadStatus] = useState<LoadStatus>({
    status: initialLoadResult.status,
    source: initialLoadResult.source,
    warnings: initialLoadResult.warnings,
  });

  // Auto-save effect — runs after every state change except the initial mount
  // Only triggers when state.store_revision changes (i.e., after mutations), not after mark-saved
  const isFirstRender = useRef(true);
  const lastSavedRevisionRef = useRef<number>(state.store_revision);

  useEffect(() => {
    if (!autoSave) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastSavedRevisionRef.current = state.store_revision;
      return;
    }

    // Only save if revision changed (user mutation), not if it's the same (mark-saved dispatch)
    if (state.store_revision === lastSavedRevisionRef.current) {
      return;
    }

    setSaveStatus((prev) => ({ ...prev, status: "saving" }));
    const now = clockRef.current.now();
    const result = saveStoreToAdapter(state, adapterRef.current, { now });
    if (result.ok) {
      setSaveStatus({ status: "saved", last_saved_at: now, error: null });
      // mark store + envs as saved (flips dirty → clean)
      dispatch({ type: "mark-saved" });
      lastSavedRevisionRef.current = state.store_revision;
    } else {
      setSaveStatus({ status: "error", last_saved_at: saveStatus.last_saved_at, error: result.error });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.store_revision, autoSave]);

  // Derived
  const active = useMemo(() => getActiveEnvironmentOp(state) ?? null, [state]);
  const visibleEnvironments = useMemo(() => listEnvironmentsOp(state), [state]);

  // Actions
  const createFromScenario = useCallback((scenarioId: string, name?: string) => {
    dispatch({ type: "create", scenarioId, name });
  }, []);
  const selectActive = useCallback((id: string | null) => {
    dispatch({ type: "select", id });
  }, []);
  const rename = useCallback((id: string, name: string) => {
    dispatch({ type: "rename", id, name });
  }, []);
  const duplicate = useCallback((id: string) => {
    dispatch({ type: "duplicate", id });
  }, []);
  const archive = useCallback((id: string) => {
    dispatch({ type: "archive", id });
  }, []);
  const restore = useCallback((id: string) => {
    dispatch({ type: "restore", id });
  }, []);

  const reloadFromDisk = useCallback(() => {
    const result = loadStoreFromAdapter(adapterRef.current, () => createInitialStore(clockRef.current));
    dispatch({ type: "load", state: result.state });
    // Note: loadStatus is intentionally not mutated post-init in this version — could be extended later
  }, []);

  const resetToDefault = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const saveNow = useCallback(() => {
    const now = clockRef.current.now();
    setSaveStatus((prev) => ({ ...prev, status: "saving" }));
    const result = saveStoreToAdapter(state, adapterRef.current, { now });
    if (result.ok) {
      setSaveStatus({ status: "saved", last_saved_at: now, error: null });
      dispatch({ type: "mark-saved" });
    } else {
      setSaveStatus({ status: "error", last_saved_at: saveStatus.last_saved_at, error: result.error });
    }
  }, [state, saveStatus.last_saved_at]);

  const getById = useCallback((id: string) => getEnvironmentByIdOp(state, id), [state]);
  const listAll = useCallback((includeArchived?: boolean) => listEnvironmentsOp(state, { includeArchived }), [state]);

  const buildPreview = useCallback(
    (scenarioId: string, name?: string): LocalEnvironmentRecord => {
      return buildEnvironmentPreviewOp(state, scenarioId, name ? { name } : undefined);
    },
    [state],
  );

  const commitEnvironment = useCallback(
    (record: LocalEnvironmentRecord, options?: { readonly setActive?: boolean }) => {
      dispatch({ type: "commit_record", record, setActive: options?.setActive });
    },
    [],
  );

  const value = useMemo<EnvironmentLifecycleContextValue>(
    () => ({
      state,
      save_status: saveStatus,
      load_status: loadStatus,
      active,
      visible_environments: visibleEnvironments,
      createFromScenario,
      selectActive,
      rename,
      duplicate,
      archive,
      restore,
      buildPreview,
      commitEnvironment,
      reloadFromDisk,
      resetToDefault,
      saveNow,
      getById,
      listAll,
    }),
    [state, saveStatus, loadStatus, active, visibleEnvironments, createFromScenario, selectActive, rename, duplicate, archive, restore, buildPreview, commitEnvironment, reloadFromDisk, resetToDefault, saveNow, getById, listAll],
  );

  return <EnvironmentLifecycleContext.Provider value={value}>{children}</EnvironmentLifecycleContext.Provider>;
}

export function useEnvironmentLifecycle(): EnvironmentLifecycleContextValue {
  const ctx = useContext(EnvironmentLifecycleContext);
  if (!ctx) {
    throw new Error("useEnvironmentLifecycle must be used inside <EnvironmentLifecycleProvider>.");
  }
  return ctx;
}
