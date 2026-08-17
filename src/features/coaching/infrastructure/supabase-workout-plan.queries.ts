import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { WorkoutPlanQueries, WorkoutPlanSummary } from '../domain/workout-plan.queries';
import { toWorkoutPlanSummary, type WorkoutPlanWithDays } from './coaching.mapper';

const WORKOUT_PLAN_SELECT =
  '*, workout_plan_days(*, workout_plan_exercises(*, exercise_items(name)))';

export class SupabaseWorkoutPlanQueries implements WorkoutPlanQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutPlanSummary | null> {
    const { data, error } = await this.client
      .from('workout_plans')
      .select(WORKOUT_PLAN_SELECT)
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read workout plan', { cause: error });
    }
    if (data === null) {
      return null;
    }
    return toWorkoutPlanSummary(data as WorkoutPlanWithDays);
  }
}
