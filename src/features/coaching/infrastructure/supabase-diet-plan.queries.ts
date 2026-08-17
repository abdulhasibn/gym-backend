import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { DietPlanQueries, DietPlanSummary } from '../domain/diet-plan.queries';
import { toDietPlanSummary, type PlanWithMeals } from './coaching.mapper';

export class SupabaseDietPlanQueries implements DietPlanQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<DietPlanSummary | null> {
    const { data, error } = await this.client
      .from('diet_plans')
      .select('*, diet_plan_meals(*, diet_plan_meal_items(*))')
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read diet plan', { cause: error });
    }
    if (data === null) {
      return null;
    }
    return toDietPlanSummary(data as PlanWithMeals);
  }
}
