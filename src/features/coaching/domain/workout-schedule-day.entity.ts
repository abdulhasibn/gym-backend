import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { ExerciseItemId } from './exercise-item-id';
import { InvalidWorkoutScheduleError } from './invalid-workout-schedule.error';
import type { TrainerProfileId } from './trainer-profile-id';
import type { WorkoutPlanTemplateId } from './workout-plan-template-id';
import { WorkoutPlanTitle } from './workout-plan-title.value-object';
import type { WorkoutScheduleDayId } from './workout-schedule-day-id';
import type { WorkoutScheduleDayKind } from './workout-schedule-day-kind';
import type { WorkoutScheduleExerciseId } from './workout-schedule-exercise-id';
import type { WorkoutScheduleSessionId } from './workout-schedule-session-id';

const MAX_SETS = 99;
const MAX_REPS_LENGTH = 40;

export interface WorkoutScheduleExerciseData {
  readonly id: WorkoutScheduleExerciseId;
  readonly exerciseItemId: ExerciseItemId;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
  readonly sortOrder: number;
}

export interface WorkoutScheduleDayData {
  readonly id: WorkoutScheduleDayId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly scheduleDate: CalendarDate;
  readonly kind: WorkoutScheduleDayKind;
  readonly title: WorkoutPlanTitle | null;
  readonly clonedFromTemplateId: WorkoutPlanTemplateId | null;
  readonly sessionId: WorkoutScheduleSessionId | null;
  readonly exercises: readonly WorkoutScheduleExerciseData[];
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateWorkoutScheduleDayProps {
  readonly id: WorkoutScheduleDayId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly scheduleDate: CalendarDate;
  readonly kind: WorkoutScheduleDayKind;
  readonly title: string | null;
  readonly clonedFromTemplateId: WorkoutPlanTemplateId | null;
  readonly sessionId: WorkoutScheduleSessionId | null;
  readonly exercises: readonly WorkoutScheduleExerciseData[];
  readonly now: Date;
}

export class WorkoutScheduleDay {
  private constructor(private data: WorkoutScheduleDayData) {}

  static create(props: CreateWorkoutScheduleDayProps): WorkoutScheduleDay {
    const snapshot = normalizeSnapshot(props);
    return new WorkoutScheduleDay({
      ...props,
      ...snapshot,
      deletedAt: null,
      createdAt: props.now,
      updatedAt: props.now,
    });
  }

  static reconstitute(data: WorkoutScheduleDayData): WorkoutScheduleDay {
    return new WorkoutScheduleDay(data);
  }

  get id(): WorkoutScheduleDayId {
    return this.data.id;
  }

  get clientUserId(): UserId {
    return this.data.clientUserId;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get trainerId(): TrainerProfileId {
    return this.data.trainerId;
  }

  get scheduleDate(): CalendarDate {
    return this.data.scheduleDate;
  }

  get kind(): WorkoutScheduleDayKind {
    return this.data.kind;
  }

  get title(): WorkoutPlanTitle | null {
    return this.data.title;
  }

  get clonedFromTemplateId(): WorkoutPlanTemplateId | null {
    return this.data.clonedFromTemplateId;
  }

  get sessionId(): WorkoutScheduleSessionId | null {
    return this.data.sessionId;
  }

  get exercises(): readonly WorkoutScheduleExerciseData[] {
    return this.data.exercises;
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

  get isLive(): boolean {
    return this.data.deletedAt === null;
  }

  findExercise(exerciseId: WorkoutScheduleExerciseId): WorkoutScheduleExerciseData | null {
    return this.data.exercises.find((row) => row.id === exerciseId) ?? null;
  }

  softDelete(now: Date): void {
    if (this.data.deletedAt !== null) {
      return;
    }
    this.data = {
      ...this.data,
      deletedAt: now,
      updatedAt: now,
    };
  }
}

function normalizeSnapshot(props: CreateWorkoutScheduleDayProps): {
  title: WorkoutPlanTitle | null;
  clonedFromTemplateId: WorkoutPlanTemplateId | null;
  sessionId: WorkoutScheduleSessionId | null;
  exercises: WorkoutScheduleExerciseData[];
} {
  if (props.kind === 'REST') {
    if (props.exercises.length > 0 || props.sessionId !== null || props.title !== null) {
      throw new InvalidWorkoutScheduleError('REST days cannot include a workout list');
    }
    return {
      title: null,
      clonedFromTemplateId: null,
      sessionId: null,
      exercises: [],
    };
  }

  if (props.sessionId === null) {
    throw new InvalidWorkoutScheduleError('TRAINING days require a session container');
  }
  if (props.exercises.length === 0) {
    throw new InvalidWorkoutScheduleError('TRAINING days require at least one exercise');
  }

  return {
    title: toOptionalTitle(props.title),
    clonedFromTemplateId: props.clonedFromTemplateId,
    sessionId: props.sessionId,
    exercises: props.exercises.map((exercise, index) => ({
      ...exercise,
      sets: normalizeSets(exercise.sets),
      reps: normalizeReps(exercise.reps),
      notes: normalizeNotes(exercise.notes),
      sortOrder: index,
    })),
  };
}

function toOptionalTitle(title: string | null): WorkoutPlanTitle | null {
  if (title === null) {
    return null;
  }
  try {
    return WorkoutPlanTitle.create(title);
  } catch (error) {
    throw new InvalidWorkoutScheduleError(
      error instanceof Error ? error.message : 'Session title is invalid',
    );
  }
}

function normalizeSets(sets: number | null): number | null {
  if (sets === null) {
    return null;
  }
  if (!Number.isInteger(sets) || sets < 1 || sets > MAX_SETS) {
    throw new InvalidWorkoutScheduleError(`Sets must be an integer from 1 to ${MAX_SETS}`);
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
    throw new InvalidWorkoutScheduleError(`Reps prescription max ${MAX_REPS_LENGTH} chars`);
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
    throw new InvalidWorkoutScheduleError('Exercise notes max 5000 chars');
  }
  return trimmed;
}
