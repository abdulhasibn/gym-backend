import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { ExerciseItemId } from './exercise-item-id';
import { InvalidWorkoutPlanError } from './invalid-workout-plan.error';
import type { TrainerProfileId } from './trainer-profile-id';
import type { WorkoutPlanTemplateExerciseId } from './workout-plan-template-exercise-id';
import type { WorkoutPlanTemplateId } from './workout-plan-template-id';
import type { WorkoutPlanTitle } from './workout-plan-title.value-object';

const MAX_SETS = 99;
const MAX_REPS_LENGTH = 40;

export interface WorkoutPlanTemplateExerciseData {
  readonly id: WorkoutPlanTemplateExerciseId;
  readonly exerciseItemId: ExerciseItemId;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
  readonly sortOrder: number;
}

export interface WorkoutPlanTemplateData {
  readonly id: WorkoutPlanTemplateId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly title: WorkoutPlanTitle;
  readonly notes: string | null;
  readonly clonedFromId: WorkoutPlanTemplateId | null;
  readonly exercises: readonly WorkoutPlanTemplateExerciseData[];
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateWorkoutPlanTemplateProps {
  readonly id: WorkoutPlanTemplateId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly title: WorkoutPlanTitle;
  readonly notes: string | null;
  readonly clonedFromId: WorkoutPlanTemplateId | null;
  readonly exercises: readonly WorkoutPlanTemplateExerciseData[];
  readonly now: Date;
}

export interface ReplaceWorkoutPlanTemplateDefinitionProps {
  readonly title: WorkoutPlanTitle;
  readonly notes: string | null;
  readonly exercises: readonly WorkoutPlanTemplateExerciseData[];
  readonly now: Date;
}

export class WorkoutPlanTemplate {
  private constructor(private data: WorkoutPlanTemplateData) {}

  static create(props: CreateWorkoutPlanTemplateProps): WorkoutPlanTemplate {
    const exercises = normalizeExercises(props.exercises);
    return new WorkoutPlanTemplate({
      ...props,
      notes: normalizeNotes(props.notes),
      exercises,
      deletedAt: null,
      createdAt: props.now,
      updatedAt: props.now,
    });
  }

  static reconstitute(data: WorkoutPlanTemplateData): WorkoutPlanTemplate {
    return new WorkoutPlanTemplate(data);
  }

  get id(): WorkoutPlanTemplateId {
    return this.data.id;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get trainerId(): TrainerProfileId {
    return this.data.trainerId;
  }

  get title(): WorkoutPlanTitle {
    return this.data.title;
  }

  get notes(): string | null {
    return this.data.notes;
  }

  get clonedFromId(): WorkoutPlanTemplateId | null {
    return this.data.clonedFromId;
  }

  get exercises(): readonly WorkoutPlanTemplateExerciseData[] {
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

  replaceDefinition(props: ReplaceWorkoutPlanTemplateDefinitionProps): void {
    if (this.data.deletedAt !== null) {
      throw new InvalidWorkoutPlanError('Cannot edit a deleted workout plan template');
    }
    this.data = {
      ...this.data,
      title: props.title,
      notes: normalizeNotes(props.notes),
      exercises: normalizeExercises(props.exercises),
      updatedAt: props.now,
    };
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

function normalizeExercises(
  exercises: readonly WorkoutPlanTemplateExerciseData[],
): WorkoutPlanTemplateExerciseData[] {
  if (exercises.length === 0) {
    throw new InvalidWorkoutPlanError('Workout plan template must include at least one exercise');
  }
  return exercises.map((exercise) => ({
    ...exercise,
    sets: normalizeSets(exercise.sets),
    reps: normalizeReps(exercise.reps),
    notes: normalizeLineNotes(exercise.notes),
  }));
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

function normalizeLineNotes(notes: string | null): string | null {
  if (notes === null) {
    return null;
  }
  const trimmed = notes.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 5000) {
    throw new InvalidWorkoutPlanError('Exercise notes max 5000 chars');
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
