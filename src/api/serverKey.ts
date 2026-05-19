import { invoke } from "@tauri-apps/api/core";
import type { ServerKeyPin } from "../types/discoveryRunner";

export async function getServerKeyPin(
  host: string,
  port: number,
): Promise<ServerKeyPin | null> {
  return invoke<ServerKeyPin | null>("get_server_key_pin", { host, port });
}

export async function pinServerKey(
  host: string,
  port: number,
  algorithm: string,
  fingerprint_sha256: string,
  pinned_at: string,
): Promise<ServerKeyPin> {
  return invoke<ServerKeyPin>("pin_server_key", {
    host,
    port,
    algorithm,
    fingerprint_sha256,
    pinned_at,
  });
}
