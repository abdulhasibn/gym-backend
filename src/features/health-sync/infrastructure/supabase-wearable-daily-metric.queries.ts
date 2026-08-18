import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { toPage, type Page, type Pagination } from '../../../shared/pagination/pagination';
import type {
  WearableDailyMetricQueries,
  WearableDailyMetricSummary,
  WearableMetricsFilter,
} from '../domain/wearable-daily-metric.queries';
import { toWearableDailyMetricSummary } from './health-sync.mapper';

export class SupabaseWearableDailyMetricQueries implements WearableDailyMetricQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForClient(
    clientUserId: UserId,
    filter: WearableMetricsFilter,
    page: Pagination,
  ): Promise<Page<WearableDailyMetricSummary>> {
    const from = page.offset;
    const to = page.offset + page.limit - 1;

    let query = this.client
      .from('wearable_daily_metrics')
      .select('*', { count: 'exact' })
      .eq('client_user_id', clientUserId)
      .order('metric_on', { ascending: false });

    if (filter.provider !== undefined) {
      query = query.eq('provider', filter.provider);
    }
    if (filter.from !== undefined) {
      query = query.gte('metric_on', filter.from.value);
    }
    if (filter.to !== undefined) {
      query = query.lte('metric_on', filter.to.value);
    }

    const { data, error, count } = await query.range(from, to);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list wearable daily metrics', {
        cause: error,
      });
    }

    return toPage((data ?? []).map(toWearableDailyMetricSummary), count ?? 0, page);
  }
}
