/**
 * V1Q — bounded concurrency pool.
 *
 * Runs at most N tasks in flight at a time. Tasks are consumed
 * from `input.tasks` in array order via a shared cursor; the
 * first-completed worker grabs the next pending index. Each
 * task receives an `isCancelled` closure that lets it bail at
 * await boundaries without race conditions on shared reducer
 * state.
 *
 * Determinism rule: tasks are POPPED in input order. Completion
 * order is non-deterministic for maxInFlight > 1, but the
 * resulting actions dispatched by tasks are independent
 * per-slice (the reducer sorts devices by slice_id), so the
 * final reducer state is deterministic for any completion
 * order.
 *
 * Implementation rules (binding):
 *   - No timers (no setTimeout / setInterval).
 *   - No global state. All cancellation via passed-in closures.
 *   - On cancellation, pool resolves cleanly (does NOT reject).
 *     Errors thrown by the task function still propagate.
 *   - maxInFlight = 1 collapses to deterministic sequential
 *     without a separate code branch.
 */

export interface ConcurrencyPoolInput<T> {
  readonly tasks: ReadonlyArray<T>;
  readonly maxInFlight: number;
  readonly run: (task: T, isCancelled: () => boolean) => Promise<void>;
  readonly isCancelled: () => boolean;
}

export async function runWithBoundedConcurrency<T>(
  input: ConcurrencyPoolInput<T>,
): Promise<void> {
  const { tasks, run, isCancelled } = input;
  const maxInFlight = Math.max(1, Math.min(input.maxInFlight, tasks.length));
  if (tasks.length === 0) return;
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < tasks.length) {
      if (isCancelled()) return;
      const idx = cursor;
      cursor += 1;
      const task = tasks[idx];
      await run(task, isCancelled);
      if (isCancelled()) return;
    }
  };
  const workers: Array<Promise<void>> = [];
  for (let i = 0; i < maxInFlight; i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
}
