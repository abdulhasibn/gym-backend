import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { Clock } from '../../../shared/clock/clock';
import { ActiveKcal } from '../domain/active-kcal.value-object';
import { Steps } from '../domain/steps.value-object';
import type { SyncWearableWeight } from '../domain/sync-wearable-weight.port';
import { SyncWeightKg } from '../domain/sync-weight-kg.value-object';
import type { WearableConnectionRepository } from '../domain/wearable-connection.repository';
import type { WearableDailyMetricRepository } from '../domain/wearable-daily-metric.repository';
import { WearableProvider } from '../domain/wearable-provider';
import { WorkoutMinutes } from '../domain/workout-minutes.value-object';
import { ClientSelfPolicy } from './client-self.policy';

export interface SyncWearableDayCommand {
  readonly metricOn: string;
  readonly steps?: number | null;
  readonly activeKcal?: number | null;
  readonly workoutMinutes?: number | null;
  readonly weightKg?: number | null;
}

export interface SyncWearableMetricsCommand {
  readonly provider: string;
  readonly days: readonly SyncWearableDayCommand[];
}

export interface SyncWearableMetricsResult {
  readonly syncedDays: number;
  readonly lastSyncedAt: string;
}

export class SyncWearableMetricsUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly connections: WearableConnectionRepository,
    private readonly metrics: WearableDailyMetricRepository,
    private readonly syncWeight: SyncWearableWeight,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: SyncWearableMetricsCommand,
  ): Promise<SyncWearableMetricsResult> {
    this.policy.requireClientSelf(actor);

    const provider = WearableProvider.create(command.provider);
    const connection = await this.connections.findLiveByClientAndProvider(actor.userId, provider);
    if (connection === null) {
      throw new NotFoundError('Wearable connection not found');
    }

    const now = this.clock.now();
    const upserts = command.days.map((day) => ({
      metricOn: CalendarDate.create(day.metricOn),
      steps: day.steps === null || day.steps === undefined ? null : Steps.create(day.steps),
      activeKcal:
        day.activeKcal === null || day.activeKcal === undefined
          ? null
          : ActiveKcal.create(day.activeKcal),
      workoutMinutes:
        day.workoutMinutes === null || day.workoutMinutes === undefined
          ? null
          : WorkoutMinutes.create(day.workoutMinutes),
      weightKg:
        day.weightKg === null || day.weightKg === undefined
          ? null
          : SyncWeightKg.create(day.weightKg),
    }));

    await this.metrics.upsertBatch(actor.userId, provider, upserts, now);

    for (const day of upserts) {
      if (day.weightKg !== null) {
        await this.syncWeight.upsert(actor.userId, day.metricOn, day.weightKg.value);
      }
    }

    connection.recordSync(now);
    await this.connections.save(connection);

    return {
      syncedDays: upserts.length,
      lastSyncedAt: now.toISOString(),
    };
  }
}
