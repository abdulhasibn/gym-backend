import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { toPage, type Page, type Pagination } from '../../../shared/pagination/pagination';
import type { ProgressLogQueries, ProgressLogSummary } from '../domain/progress-log.queries';
import { toProgressLogSummary } from './users.mapper';

export class SupabaseProgressLogQueries implements ProgressLogQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForClient(clientUserId: UserId, page: Pagination): Promise<Page<ProgressLogSummary>> {
    const from = page.offset;
    const to = page.offset + page.limit - 1;

    const { data, error, count } = await this.client
      .from('progress_logs')
      .select('*', { count: 'exact' })
      .eq('client_user_id', clientUserId)
      .is('deleted_at', null)
      .order('log_date', { ascending: false })
      .range(from, to);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list progress logs', { cause: error });
    }

    return toPage((data ?? []).map(toProgressLogSummary), count ?? 0, page);
  }
}
