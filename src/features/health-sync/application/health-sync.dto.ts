import type { WearableConnectionSummary } from '../domain/wearable-connection.queries';
import type { WearableDailyMetricSummary } from '../domain/wearable-daily-metric.queries';

export interface WearableConnectionDto {
  readonly id: string;
  readonly provider: string;
  readonly lastSyncedAt: string | null;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface WearableDailyMetricDto {
  readonly id: string;
  readonly provider: string;
  readonly metricOn: string;
  readonly steps: number | null;
  readonly activeKcal: number | null;
  readonly workoutMinutes: number | null;
  readonly weightKg: number | null;
  readonly ingestedAt: string;
}

export function toWearableConnectionDto(summary: WearableConnectionSummary): WearableConnectionDto {
  return {
    id: summary.id,
    provider: summary.provider,
    lastSyncedAt: summary.lastSyncedAt,
    active: summary.active,
    createdAt: summary.createdAt,
  };
}

export function toWearableDailyMetricDto(
  summary: WearableDailyMetricSummary,
): WearableDailyMetricDto {
  return {
    id: summary.id,
    provider: summary.provider,
    metricOn: summary.metricOn,
    steps: summary.steps,
    activeKcal: summary.activeKcal,
    workoutMinutes: summary.workoutMinutes,
    weightKg: summary.weightKg,
    ingestedAt: summary.ingestedAt,
  };
}

export function hasWearablesGrant(classGrants: readonly string[]): boolean {
  return classGrants.includes('WEARABLES');
}
