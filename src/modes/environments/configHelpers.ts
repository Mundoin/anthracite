/**
 * Configuration helper utilities for the Environments mode.
 *
 * Provides pure functions for grouping, counting, and analyzing
 * device configurations and their metadata.
 */

import type { LocalEnvironmentRecord } from "../../types/localEnvironment";
import type { LabConfigArtifact, LabDevice } from "../../types/labEnvironment";

export interface VendorGroup {
  readonly vendor: string;
  readonly entries: ReadonlyArray<{ device: LabDevice; config: LabConfigArtifact }>;
}

/**
 * Groups configurations by vendor, with device and config pairs.
 *
 * @param record - The environment record to analyze
 * @returns Array of vendor groups, each with vendor name and device/config pairs
 */
export function getConfigsByVendor(record: LocalEnvironmentRecord): ReadonlyArray<VendorGroup> {
  const vendorMap = new Map<string, Array<{ device: LabDevice; config: LabConfigArtifact }>>();

  for (const device of record.lab_payload.devices) {
    const config = record.lab_payload.configs.find((c) => c.device_id === device.id);
    if (!config) continue;

    const list = vendorMap.get(device.vendor) ?? [];
    list.push({ device, config });
    vendorMap.set(device.vendor, list);
  }

  return Array.from(vendorMap.entries())
    .sort(([vendorA], [vendorB]) => vendorA.localeCompare(vendorB))
    .map(([vendor, entries]) => ({
      vendor,
      entries: Object.freeze(entries),
    }));
}

/**
 * Counts configurations associated with a specific device.
 *
 * @param record - The environment record to analyze
 * @param deviceId - The device ID to count configs for
 * @returns Number of configurations for the given device
 */
export function getConfigCountForDevice(record: LocalEnvironmentRecord, deviceId: string): number {
  return record.lab_payload.configs.filter((c) => c.device_id === deviceId).length;
}

/**
 * Counts the number of lines in a configuration text.
 *
 * Treats null/undefined as 0 lines. Empty string returns 0.
 * Non-empty text is split by newline and counted.
 *
 * @param text - The configuration text to count lines in
 * @returns Number of lines in the configuration
 */
export function countConfigLines(text: string | null | undefined): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  return text.split("\n").length;
}

/**
 * Returns a distribution of configurations by kind.
 *
 * @param record - The environment record to analyze
 * @returns Object mapping config kind to count
 */
export function getConfigKindDistribution(
  record: LocalEnvironmentRecord
): Readonly<Record<string, number>> {
  const distribution: Record<string, number> = {};

  for (const config of record.lab_payload.configs) {
    const kind = config.config_kind;
    distribution[kind] = (distribution[kind] ?? 0) + 1;
  }

  return Object.freeze(distribution);
}
