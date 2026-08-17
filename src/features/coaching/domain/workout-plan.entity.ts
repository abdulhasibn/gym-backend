import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { CoachingPlanStatus } from './coaching-plan-status';
import type { ExerciseItemId } from './exercise-item-id';
import { InvalidWorkoutPlanError } from './invalid-workout-plan.error';
import type { TrainerProfileId } from './trainer-profile-id';
import type { WorkoutPlanDayId } from './workout-plan-day-id';
import type { WorkoutPlanExerciseId } from './workout-plan-exercise-id';
import type { WorkoutPlanId } from './workout-plan-id';
import type { WorkoutDayLabel } from './workout-day-label.value-object';
import type { WorkoutPlanTitle } from './workout-plan-title.value-object';

const MAX_SETS = 99;
const MAX_REPS_LENGTH = 40;

export interface WorkoutPlanExerciseData {
  readonly id: WorkoutPlanExerciseId;
  readonly exerciseItemId: ExerciseItemId;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
  readonly sortOrder: number;
}

export interface WorkoutPlanDayData {
  readonly id: WorkoutPlanDayId;
  readonly dayLabel: WorkoutDayLabel;
  readonly sortOrder: number;
  readonly exercises: readonly WorkoutPlanExerciseData[];
}

export interface WorkoutPlanData {
  readonly id: WorkoutPlanId;
  readonly clientUserId: UserId;
  readonly trainerId: TrainerProfileId;
  readonly gymOrgId: GymOrgId;
  readonly title: WorkoutPlanTitle;
  readonly notes: string | null;
  readonly status: CoachingPlanStatus;
  readonly days: readonly WorkoutPlanDayData[];
  readonly clonedFromId: WorkoutPlanId | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateWorkoutPlanProps {
  readonly id: WorkoutPlanId;
  readonly clientUserId: UserId;
  readonly trainerId: TrainerProfileId;
  readonly gymOrgId: GymOrgId;
  readonly title: WorkoutPlanTitle;
  readonly notes: string | null;
  readonly days: readonly WorkoutPlanDayData[];
  readonly clonedFromId?: WorkoutPlanId | null;
  readonly now: Date;
}

export class WorkoutPlan {
  private constructor(private data: WorkoutPlanData) {}

  static create(props: CreateWorkoutPlanProps): WorkoutPlan {
    if (props.days.length === 0) {
      throw new InvalidWorkoutPlanError('Workout plan must include at least one day');
    }
    const days = props.days.map((day) => {
      if (day.exercises.length === 0) {
        throw new InvalidWorkoutPlanError('Each day must include at least one exercise');
      }
      return {
        ...day,
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          sets: normalizeSets(exercise.sets),
          reps: normalizeReps(exercise.reps),
          notes: normalizeNotes(exercise.notes),
        })),
      };
    });
    return new WorkoutPlan({
      ...props,
      notes: normalizeNotes(props.notes),
      days,
      clonedFromId: props.clonedFromId ?? null,
      status: 'ACTIVE',
      deletedAt: null,
      createdAt: props.now,
      updatedAt: props.now,
    });
  }

  static reconstitute(data: WorkoutPlanData): WorkoutPlan {
    return new WorkoutPlan(data);
  }

  get id(): WorkoutPlanId {
    return this.data.id;
  }

  get clientUserId(): UserId {
    return this.data.clientUserId;
  }

  get trainerId(): TrainerProfileId {
    return this.data.trainerId;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get title(): WorkoutPlanTitle {
    return this.data.title;
  }

  get notes(): string | null {
    return this.data.notes;
  }

  get status(): CoachingPlanStatus {
    return this.data.status;
  }

  get days(): readonly WorkoutPlanDayData[] {
    return this.data.days;
  }

  get clonedFromId(): WorkoutPlanId | null {
    return this.data.clonedFromId;
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  get isActive(): boolean {
    return this.data.status === 'ACTIVE' && this.data.deletedAt === null;
  }

  findExercise(
    exerciseId: WorkoutPlanExerciseId,
  ): { day: WorkoutPlanDayData; exercise: WorkoutPlanExerciseData } | null {
    for (const day of this.data.days) {
      const exercise = day.exercises.find((row) => row.id === exerciseId);
      if (exercise !== undefined) {
        return { day, exercise };
      }
    }
    return null;
  }

  archive(now: Date): void {
    if (this.data.status === 'ARCHIVED') {
      return;
    }
    this.data = {
      ...this.data,
      status: 'ARCHIVED',
      updatedAt: now,
    };
  }
}

function normalizeSets(sets: number | null): number | null {
  if (sets === null) {
    return null;
  }
  if (!Number.isInteger(sets) || sets < 1 || sets > MAX_SETS) {
    throw new InvalidWorkoutPlanError(`Sets must be an integer from 1 to ${MAX_SETS}`);
  }
  return sets;
}

function normalizeReps(reps: string | null): string | null {
  if (reps === null) {
    return null;
  }
  const trimmed = reps.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > MAX_REPS_LENGTH) {
    throw new InvalidWorkoutPlanError(`Reps prescription max ${MAX_REPS_LENGTH} chars`);
  }
  return trimmed;
}

function normalizeNotes(notes: string | null): string | null {
  if (notes === null) {
    return null;
  }
  const trimmed = notes.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 5000) {
    throw new InvalidWorkoutPlanError('Workout plan notes max 5000 chars');
  }
  return trimmed;
}
