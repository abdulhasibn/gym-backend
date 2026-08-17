import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import { toDietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { CalorieLogDaySummary, CalorieLogQueries } from '../domain/calorie-log.queries';
import { toCalorieLogDaySummary } from './nutrition.mapper';

type EntryWithItems = Database['public']['Tables']['calorie_log_entries']['Row'] & {
  calorie_log_items: Database['public']['Tables']['calorie_log_items']['Row'][] | null;
};

export class SupabaseCalorieLogQueries implements CalorieLogQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findDay(clientUserId: UserId, logDate: CalendarDate): Promise<CalorieLogDaySummary | null> {
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
    return toCalorieLogDaySummary(row, row.calorie_log_items ?? []);
  }

  async findLoggedPrescribedItemIds(
    clientUserId: UserId,
    logDate: CalendarDate,
    dietPlanMealItemIds: readonly DietPlanMealItemId[],
  ): Promise<readonly DietPlanMealItemId[]> {
    if (dietPlanMealItemIds.length === 0) {
      return [];
    }

    const { data: entry, error: entryError } = await this.client
      .from('calorie_log_entries')
      .select('id')
      .eq('client_user_id', clientUserId)
      .eq('log_date', logDate.value)
      .is('deleted_at', null)
      .maybeSingle();

    if (entryError !== null) {
      throw new TransientDatabaseFailureError('Unable to read calorie log', { cause: entryError });
    }
    if (entry === null) {
      return [];
    }

    const { data, error } = await this.client
      .from('calorie_log_items')
      .select('diet_plan_meal_item_id')
      .eq('calorie_log_entry_id', entry.id)
      .in('diet_plan_meal_item_id', [...dietPlanMealItemIds])
      .is('deleted_at', null);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read prescribed diary items', {
        cause: error,
      });
    }

    return (data ?? [])
      .map((row) => row.diet_plan_meal_item_id)
      .filter((id): id is string => id !== null)
      .map(toDietPlanMealItemId);
  }
}
