import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { WorkoutScheduleDay } from './workout-schedule-day.entity';
import type { WorkoutScheduleExerciseId } from './workout-schedule-exercise-id';

export interface WorkoutScheduleRepository {
  findByClientGymAndDate(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    scheduleDate: CalendarDate,
  ): Promise<WorkoutScheduleDay | null>;

  findExerciseContext(
    exerciseId: WorkoutScheduleExerciseId,
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutScheduleDay | null>;

  upsertDays(days: readonly WorkoutScheduleDay[]): Promise<void>;
}
