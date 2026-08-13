import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { ProgressLog } from '../domain/progress-log.entity';
import type { ProgressLogRepository } from '../domain/progress-log.repository';
import { toProgressLog, toProgressLogInsert, toProgressLogUpdate } from './users.mapper';

export class SupabaseProgressLogRepository implements ProgressLogRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByClientAndDate(
    clientUserId: UserId,
    logDate: CalendarDate,
  ): Promise<ProgressLog | null> {
    const { data, error } = await this.client
      .from('progress_logs')
      .select('*')
      .eq('client_user_id', clientUserId)
      .eq('log_date', logDate.value)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read progress log', { cause: error });
    }
    if (data === null) {
      return null;
    }
    return toProgressLog(data);
  }

  async save(log: ProgressLog): Promise<void> {
    const existing = await this.findByClientAndDate(log.clientUserId, log.logDate);
    if (existing === null) {
      const { error } = await this.client.from('progress_logs').insert(toProgressLogInsert(log));
      if (error !== null) {
        throw new TransientDatabaseFailureError('Unable to create progress log', { cause: error });
      }
      return;
    }

    const { error } = await this.client
      .from('progress_logs')
      .update(toProgressLogUpdate(log))
      .eq('id', log.id)
      .eq('client_user_id', log.clientUserId)
      .is('deleted_at', null);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to update progress log', { cause: error });
    }
  }
}
