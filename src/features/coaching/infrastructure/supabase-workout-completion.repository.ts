import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { AlreadyCompletedWorkoutExerciseError } from '../domain/already-completed-workout-exercise.error';
import type { WorkoutCompletionRepository } from '../domain/workout-completion.repository';
import type { WorkoutPlanExerciseId } from '../domain/workout-plan-exercise-id';

export class SupabaseWorkoutCompletionRepository implements WorkoutCompletionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async complete(input: {
    readonly exerciseId: WorkoutPlanExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void> {
    const { error } = await this.client.from('workout_plan_exercise_completions').insert({
      workout_plan_exercise_id: input.exerciseId,
      client_user_id: input.clientUserId,
      completed_on: input.completedOn.value,
    });
    if (error !== null) {
      if (error.code === '23505') {
        throw new AlreadyCompletedWorkoutExerciseError();
      }
      throw new TransientDatabaseFailureError('Unable to complete workout exercise', {
        cause: error,
      });
    }
  }

  async uncomplete(input: {
    readonly exerciseId: WorkoutPlanExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void> {
    const { error } = await this.client
      .from('workout_plan_exercise_completions')
      .delete()
      .eq('workout_plan_exercise_id', input.exerciseId)
      .eq('client_user_id', input.clientUserId)
      .eq('completed_on', input.completedOn.value);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to uncomplete workout exercise', {
        cause: error,
      });
    }
  }
}
