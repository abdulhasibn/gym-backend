import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { DietPlan } from '../domain/diet-plan.entity';
import type { DietPlanRepository } from '../domain/diet-plan.repository';
import { toDietPlan, toDietPlanInsert, type PlanWithMeals } from './coaching.mapper';

export class SupabaseDietPlanRepository implements DietPlanRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<DietPlan | null> {
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
    return toDietPlan(data as PlanWithMeals);
  }

  async assign(plan: DietPlan): Promise<void> {
    const { error: archiveError } = await this.client
      .from('diet_plans')
      .update({ status: 'ARCHIVED', updated_at: plan.updatedAt.toISOString() })
      .eq('client_user_id', plan.clientUserId)
      .eq('gym_org_id', plan.gymOrgId)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null);

    if (archiveError !== null) {
      throw new TransientDatabaseFailureError('Unable to archive previous diet plan', {
        cause: archiveError,
      });
    }

    const { error: planError } = await this.client
      .from('diet_plans')
      .insert(toDietPlanInsert(plan));
    if (planError !== null) {
      throw new TransientDatabaseFailureError('Unable to create diet plan', { cause: planError });
    }

    const meals = plan.meals.map((meal) => ({
      id: meal.id,
      diet_plan_id: plan.id,
      meal_slot: meal.mealSlot,
      sort_order: meal.sortOrder,
    }));
    const { error: mealError } = await this.client.from('diet_plan_meals').insert(meals);
    if (mealError !== null) {
      throw new TransientDatabaseFailureError('Unable to create diet plan meals', {
        cause: mealError,
      });
    }

    const items = plan.meals.flatMap((meal) =>
      meal.items.map((item) => ({
        id: item.id,
        diet_plan_meal_id: meal.id,
        food_item_id: item.foodItemId,
        serving_id: item.servingId,
        quantity: item.quantity.value,
      })),
    );
    if (items.length === 0) {
      return;
    }
    const { error: itemError } = await this.client.from('diet_plan_meal_items').insert(items);
    if (itemError !== null) {
      throw new TransientDatabaseFailureError('Unable to create diet plan items', {
        cause: itemError,
      });
    }
  }
}
