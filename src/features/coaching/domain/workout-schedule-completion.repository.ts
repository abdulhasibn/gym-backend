import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { WorkoutScheduleExerciseId } from './workout-schedule-exercise-id';

export interface WorkoutScheduleCompletionRepository {
  complete(input: {
    readonly exerciseId: WorkoutScheduleExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void>;

  uncomplete(input: {
    readonly exerciseId: WorkoutScheduleExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void>;
}
