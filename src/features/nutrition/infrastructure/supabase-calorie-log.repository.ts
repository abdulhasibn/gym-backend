import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { UniqueViolationError } from '../../../domain/errors/unique-violation.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { CalorieLogEntry } from '../domain/calorie-log-entry.entity';
import type { CalorieLogItemId } from '../domain/calorie-log-item-id';
import type { CalorieLogRepository } from '../domain/calorie-log.repository';
import {
  toCalorieLogEntry,
  toCalorieLogEntryInsert,
  toCalorieLogEntryUpdate,
  toCalorieLogItemUpsert,
} from './nutrition.mapper';

type EntryWithItems = Database['public']['Tables']['calorie_log_entries']['Row'] & {
  calorie_log_items: Database['public']['Tables']['calorie_log_items']['Row'][] | null;
};

export class SupabaseCalorieLogRepository implements CalorieLogRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByClientAndDate(
    clientUserId: UserId,
    logDate: CalendarDate,
  ): Promise<CalorieLogEntry | null> {
    const { data, error } = await this.client
      .from('calorie_log_entries')
      .select('*, calorie_log_items(*)')
      .eq('client_user_id', clientUserId)
      .eq('log_date', logDate.value)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read calorie log', { cause: error });
    }
    if (data === null) {
      return null;
    }
    const row = data as EntryWithItems;
    return toCalorieLogEntry(row, row.calorie_log_items ?? []);
  }

  async findByClientAndItem(
    clientUserId: UserId,
    itemId: CalorieLogItemId,
  ): Promise<CalorieLogEntry | null> {
    const { data: item, error: itemError } = await this.client
      .from('calorie_log_items')
      .select('calorie_log_entry_id')
      .eq('id', itemId)
      .is('deleted_at', null)
      .maybeSingle();

    if (itemError !== null) {
      throw new TransientDatabaseFailureError('Unable to read calorie log item', {
        cause: itemError,
      });
    }
    if (item === null) {
      return null;
    }

    const { data, error } = await this.client
      .from('calorie_log_entries')
      .select('*, calorie_log_items(*)')
      .eq('id', item.calorie_log_entry_id)
      .eq('client_user_id', clientUserId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read calorie log', { cause: error });
    }
    if (data === null) {
      return null;
    }
    const row = data as EntryWithItems;
    return toCalorieLogEntry(row, row.calorie_log_items ?? []);
  }

  async save(entry: CalorieLogEntry): Promise<void> {
    const existing = await this.findByClientAndDate(entry.clientUserId, entry.logDate);
    if (existing === null) {
      const { error } = await this.client
        .from('calorie_log_entries')
        .insert(toCalorieLogEntryInsert(entry));
      if (error !== null) {
        throw translateCalorieWriteError(error, 'Unable to create calorie log');
      }
    } else {
      const { error } = await this.client
        .from('calorie_log_entries')
        .update(toCalorieLogEntryUpdate(entry))
        .eq('id', entry.id)
        .eq('client_user_id', entry.clientUserId)
        .is('deleted_at', null);
      if (error !== null) {
        throw translateCalorieWriteError(error, 'Unable to update calorie log');
      }
    }

    const items = toCalorieLogItemUpsert(entry);
    if (items.length === 0) {
      return;
    }
    const { error: itemError } = await this.client.from('calorie_log_items').upsert(items, {
      onConflict: 'id',
    });
    if (itemError !== null) {
      throw translateCalorieWriteError(itemError, 'Unable to save calorie log items');
    }
  }
}

function translateCalorieWriteError(
  error: { code?: string; message?: string },
  fallback: string,
): Error {
  if (error.code === '23505' || (error.message ?? '').includes('calorie_log_items_plan_item_day')) {
    return new UniqueViolationError('This diet plan item is already logged for the day');
  }
  return new TransientDatabaseFailureError(fallback, { cause: error });
}
