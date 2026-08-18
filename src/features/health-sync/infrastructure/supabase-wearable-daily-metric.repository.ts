import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type {
  WearableDailyMetricRepository,
  WearableDailyMetricUpsert,
} from '../domain/wearable-daily-metric.repository';
import type { WearableProvider } from '../domain/wearable-provider';

export class SupabaseWearableDailyMetricRepository implements WearableDailyMetricRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async upsertBatch(
    clientUserId: UserId,
    provider: WearableProvider,
    days: readonly WearableDailyMetricUpsert[],
    ingestedAt: Date,
  ): Promise<void> {
    if (days.length === 0) {
      return;
    }

    const rows: Database['public']['Tables']['wearable_daily_metrics']['Insert'][] = days.map(
      (day) => ({
        client_user_id: clientUserId,
        provider: provider.code,
        metric_on: day.metricOn.value,
        steps: day.steps?.value ?? null,
        active_kcal: day.activeKcal?.value ?? null,
        weight_kg: day.weightKg?.value ?? null,
        workout_minutes: day.workoutMinutes?.value ?? null,
        ingested_at: ingestedAt.toISOString(),
      }),
    );

    const { error } = await this.client.from('wearable_daily_metrics').upsert(rows, {
      onConflict: 'client_user_id,provider,metric_on',
    });

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to upsert wearable daily metrics', {
        cause: error,
      });
    }
  }
}
