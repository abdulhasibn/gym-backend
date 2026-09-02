import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { WorkoutScheduleCompletionQueries } from '../domain/workout-schedule-completion.queries';
import {
  toWorkoutScheduleExerciseId,
  type WorkoutScheduleExerciseId,
} from '../domain/workout-schedule-exercise-id';

export class SupabaseWorkoutScheduleCompletionQueries
  implements WorkoutScheduleCompletionQueries
{
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findCompletedExerciseIds(
    clientUserId: UserId,
    completedOn: CalendarDate,
    exerciseIds: readonly WorkoutScheduleExerciseId[],
  ): Promise<readonly WorkoutScheduleExerciseId[]> {
    if (exerciseIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('workout_schedule_exercise_completions')
      .select('workout_schedule_exercise_id')
      .eq('client_user_id', clientUserId)
      .eq('completed_on', completedOn.value)
      .in('workout_schedule_exercise_id', [...exerciseIds]);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read schedule completions', {
        cause: error,
      });
    }

    return (data ?? []).map((row) =>
      toWorkoutScheduleExerciseId(row.workout_schedule_exercise_id),
    );
  }
}
