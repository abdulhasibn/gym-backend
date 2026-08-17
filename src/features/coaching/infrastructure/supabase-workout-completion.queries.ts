import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { WorkoutCompletionQueries } from '../domain/workout-completion.queries';
import {
  toWorkoutPlanExerciseId,
  type WorkoutPlanExerciseId,
} from '../domain/workout-plan-exercise-id';

export class SupabaseWorkoutCompletionQueries implements WorkoutCompletionQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findCompletedExerciseIds(
    clientUserId: UserId,
    completedOn: CalendarDate,
    exerciseIds: readonly WorkoutPlanExerciseId[],
  ): Promise<readonly WorkoutPlanExerciseId[]> {
    if (exerciseIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('workout_plan_exercise_completions')
      .select('workout_plan_exercise_id')
      .eq('client_user_id', clientUserId)
      .eq('completed_on', completedOn.value)
      .in('workout_plan_exercise_id', [...exerciseIds]);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read workout completions', {
        cause: error,
      });
    }

    return (data ?? []).map((row) => toWorkoutPlanExerciseId(row.workout_plan_exercise_id));
  }
}
