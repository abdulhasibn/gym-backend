import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { WorkoutPlanTemplateId } from './workout-plan-template-id';
import type { WorkoutScheduleDayId } from './workout-schedule-day-id';
import type { WorkoutScheduleDayKind } from './workout-schedule-day-kind';
import type { WorkoutScheduleExerciseId } from './workout-schedule-exercise-id';

export interface WorkoutScheduleExerciseSummary {
  readonly id: WorkoutScheduleExerciseId;
  readonly exerciseItemId: string;
  readonly name?: string;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
  readonly sortOrder: number;
}

export interface WorkoutScheduleDaySummary {
  readonly id: WorkoutScheduleDayId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: string;
  readonly scheduleDate: string;
  readonly kind: WorkoutScheduleDayKind;
  readonly title: string | null;
  readonly clonedFromTemplateId: WorkoutPlanTemplateId | null;
  readonly exercises: readonly WorkoutScheduleExerciseSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListWorkoutScheduleRangeCriteria {
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly from: string;
  readonly to: string;
}

export interface WorkoutScheduleQueries {
  listRange(
    criteria: ListWorkoutScheduleRangeCriteria,
  ): Promise<readonly WorkoutScheduleDaySummary[]>;
}
