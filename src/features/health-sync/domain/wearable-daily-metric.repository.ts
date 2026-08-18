import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { ActiveKcal } from './active-kcal.value-object';
import type { Steps } from './steps.value-object';
import type { SyncWeightKg } from './sync-weight-kg.value-object';
import type { WearableProvider } from './wearable-provider';
import type { WorkoutMinutes } from './workout-minutes.value-object';

export interface WearableDailyMetricUpsert {
  readonly metricOn: CalendarDate;
  readonly steps: Steps | null;
  readonly activeKcal: ActiveKcal | null;
  readonly workoutMinutes: WorkoutMinutes | null;
  readonly weightKg: SyncWeightKg | null;
}

export interface WearableDailyMetricRepository {
  upsertBatch(
    clientUserId: UserId,
    provider: WearableProvider,
    days: readonly WearableDailyMetricUpsert[],
    ingestedAt: Date,
  ): Promise<void>;
}
