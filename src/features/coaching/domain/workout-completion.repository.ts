import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { WorkoutPlanExerciseId } from './workout-plan-exercise-id';

export interface WorkoutCompletionRepository {
  complete(input: {
    readonly exerciseId: WorkoutPlanExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void>;

  uncomplete(input: {
    readonly exerciseId: WorkoutPlanExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void>;
}
