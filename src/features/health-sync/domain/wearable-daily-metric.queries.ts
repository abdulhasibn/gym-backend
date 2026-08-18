import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { WearableProviderCode } from './wearable-provider';

export interface WearableDailyMetricSummary {
  readonly id: string;
  readonly provider: WearableProviderCode;
  readonly metricOn: string;
  readonly steps: number | null;
  readonly activeKcal: number | null;
  readonly workoutMinutes: number | null;
  readonly weightKg: number | null;
  readonly ingestedAt: string;
}

export interface WearableMetricsFilter {
  readonly provider?: WearableProviderCode;
  readonly from?: CalendarDate;
  readonly to?: CalendarDate;
}

export interface WearableDailyMetricQueries {
  listForClient(
    clientUserId: UserId,
    filter: WearableMetricsFilter,
    page: Pagination,
  ): Promise<Page<WearableDailyMetricSummary>>;
}
