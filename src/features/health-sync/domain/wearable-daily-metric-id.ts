export type WearableDailyMetricId = string & { readonly __brand: 'WearableDailyMetricId' };

export function toWearableDailyMetricId(raw: string): WearableDailyMetricId {
  return raw as WearableDailyMetricId;
}
