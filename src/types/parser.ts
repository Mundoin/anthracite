/**
 * Parser Engine — TypeScript surface (V1K).
 *
 * Mirrors `src-tauri/src/engines/parsers/`. The Rust side is
 * authoritative. The command boundary returns the full vendor-neutral
 * `DeviceModel` defined in `./networkModel.ts`.
 */

export type { DeviceModel } from "./networkModel";
