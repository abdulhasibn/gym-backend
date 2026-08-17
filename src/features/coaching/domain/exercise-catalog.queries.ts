import type { ExerciseItemId } from './exercise-item-id';

export type ExerciseMuscle =
  | 'CHEST'
  | 'LATS'
  | 'UPPER_BACK'
  | 'LOWER_BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'CORE'
  | 'FULL_BODY'
  | 'CARDIO'
  | 'OTHER';

export type ExerciseEquipment =
  'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT' | 'KETTLEBELL' | 'BAND' | 'OTHER';

export type ExerciseMeasurement = 'WEIGHT_REPS' | 'REPS_ONLY' | 'DURATION' | 'BODYWEIGHT_ASSISTED';

export interface ExerciseSearchHit {
  readonly id: ExerciseItemId;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly primaryMuscle: ExerciseMuscle;
  readonly equipment: ExerciseEquipment;
  readonly measurement: ExerciseMeasurement;
}

export interface ExerciseCatalogQueries {
  searchSeed(query: string): Promise<readonly ExerciseSearchHit[]>;
}
