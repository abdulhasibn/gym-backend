import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { WorkoutScheduleExerciseId } from './workout-schedule-exercise-id';

export interface WorkoutScheduleCompletionQueries {
  findCompletedExerciseIds(
    clientUserId: UserId,
    completedOn: CalendarDate,
    exerciseIds: readonly WorkoutScheduleExerciseId[],
  ): Promise<readonly WorkoutScheduleExerciseId[]>;
}
