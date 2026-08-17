import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { WorkoutPlan } from '../domain/workout-plan.entity';
import type { WorkoutPlanRepository } from '../domain/workout-plan.repository';
import { toWorkoutPlan, toWorkoutPlanInsert, type WorkoutPlanWithDays } from './coaching.mapper';

const WORKOUT_PLAN_SELECT =
  '*, workout_plan_days(*, workout_plan_exercises(*, exercise_items(name)))';

export class SupabaseWorkoutPlanRepository implements WorkoutPlanRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutPlan | null> {
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
    return toWorkoutPlan(data as WorkoutPlanWithDays);
  }

  async assign(plan: WorkoutPlan): Promise<void> {
    const { error: archiveError } = await this.client
      .from('workout_plans')
      .update({ status: 'ARCHIVED', updated_at: plan.updatedAt.toISOString() })
      .eq('client_user_id', plan.clientUserId)
      .eq('gym_org_id', plan.gymOrgId)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null);

    if (archiveError !== null) {
      throw new TransientDatabaseFailureError('Unable to archive previous workout plan', {
        cause: archiveError,
      });
    }

    const { error: planError } = await this.client
      .from('workout_plans')
      .insert(toWorkoutPlanInsert(plan));
    if (planError !== null) {
      throw new TransientDatabaseFailureError('Unable to create workout plan', {
        cause: planError,
      });
    }

    const days = plan.days.map((day) => ({
      id: day.id,
      workout_plan_id: plan.id,
      day_label: day.dayLabel.value,
      sort_order: day.sortOrder,
    }));
    const { error: dayError } = await this.client.from('workout_plan_days').insert(days);
    if (dayError !== null) {
      throw new TransientDatabaseFailureError('Unable to create workout plan days', {
        cause: dayError,
      });
    }

    const exercises = plan.days.flatMap((day) =>
      day.exercises.map((exercise) => ({
        id: exercise.id,
        workout_plan_day_id: day.id,
        exercise_item_id: exercise.exerciseItemId,
        sets: exercise.sets,
        reps: exercise.reps,
        notes: exercise.notes,
        sort_order: exercise.sortOrder,
      })),
    );
    if (exercises.length === 0) {
      return;
    }
    const { error: exerciseError } = await this.client
      .from('workout_plan_exercises')
      .insert(exercises);
    if (exerciseError !== null) {
      throw new TransientDatabaseFailureError('Unable to create workout plan exercises', {
        cause: exerciseError,
      });
    }
  }
}
