import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { ExerciseItemId } from './exercise-item-id';
import { InvalidWorkoutScheduleError } from './invalid-workout-schedule.error';
import type { TrainerProfileId } from './trainer-profile-id';
import type { WorkoutPlanTemplateId } from './workout-plan-template-id';
import type { WorkoutScheduleDayId } from './workout-schedule-day-id';
import type { WorkoutScheduleDayKind } from './workout-schedule-day-kind';
import type { WorkoutScheduleExerciseId } from './workout-schedule-exercise-id';
import type { WorkoutScheduleSessionId } from './workout-schedule-session-id';
import type { WorkoutSessionSlot } from './workout-session-slot';

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

export interface WorkoutScheduleSessionData {
  readonly id: WorkoutScheduleSessionId;
  readonly slot: WorkoutSessionSlot;
  readonly title: string;
  readonly clonedFromTemplateId: WorkoutPlanTemplateId;
  readonly exercises: readonly WorkoutScheduleExerciseData[];
}

export interface WorkoutScheduleDayData {
  readonly id: WorkoutScheduleDayId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly scheduleDate: CalendarDate;
  readonly kind: WorkoutScheduleDayKind;
  readonly sessions: readonly WorkoutScheduleSessionData[];
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
  readonly sessions: readonly WorkoutScheduleSessionData[];
  readonly now: Date;
}

export class WorkoutScheduleDay {
  private constructor(private data: WorkoutScheduleDayData) {}

  static create(props: CreateWorkoutScheduleDayProps): WorkoutScheduleDay {
    const sessions = normalizeSessions(props.kind, props.sessions);
    return new WorkoutScheduleDay({
      ...props,
      sessions,
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

  get sessions(): readonly WorkoutScheduleSessionData[] {
    return this.data.sessions;
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

  findExercise(exerciseId: WorkoutScheduleExerciseId): {
    session: WorkoutScheduleSessionData;
    exercise: WorkoutScheduleExerciseData;
  } | null {
    for (const session of this.data.sessions) {
      const exercise = session.exercises.find((row) => row.id === exerciseId);
      if (exercise !== undefined) {
        return { session, exercise };
      }
    }
    return null;
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

function normalizeSessions(
  kind: WorkoutScheduleDayKind,
  sessions: readonly WorkoutScheduleSessionData[],
): WorkoutScheduleSessionData[] {
  if (kind === 'REST') {
    if (sessions.length > 0) {
      throw new InvalidWorkoutScheduleError('REST days cannot include sessions');
    }
    return [];
  }

  if (sessions.length < 1 || sessions.length > 2) {
    throw new InvalidWorkoutScheduleError('TRAINING days must include 1 or 2 sessions');
  }

  const slots = new Set<WorkoutSessionSlot>();
  return sessions.map((session) => {
    if (slots.has(session.slot)) {
      throw new InvalidWorkoutScheduleError('Session slots must be unique on a day');
    }
    slots.add(session.slot);
    if (session.exercises.length === 0) {
      throw new InvalidWorkoutScheduleError('Each session must include at least one exercise');
    }
    const title = session.title.trim();
    if (!title) {
      throw new InvalidWorkoutScheduleError('Session title is required');
    }
    return {
      ...session,
      title,
      exercises: session.exercises.map((exercise, index) => ({
        ...exercise,
        sets: normalizeSets(exercise.sets),
        reps: normalizeReps(exercise.reps),
        notes: normalizeNotes(exercise.notes),
        sortOrder: index,
      })),
    };
  });
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
