import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { WorkoutPlanExerciseId } from './workout-plan-exercise-id';

export interface WorkoutCompletionQueries {
  findCompletedExerciseIds(
    clientUserId: UserId,
    completedOn: CalendarDate,
    exerciseIds: readonly WorkoutPlanExerciseId[],
  ): Promise<readonly WorkoutPlanExerciseId[]>;
}
