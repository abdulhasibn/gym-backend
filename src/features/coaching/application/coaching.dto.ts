import type { DietPlanSummary } from '../domain/diet-plan.queries';
import type { DietPlan } from '../domain/diet-plan.entity';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { DietPlanTemplate } from '../domain/diet-plan-template.entity';
import type { DietPlanTemplateSummary } from '../domain/diet-plan-template.queries';
import type { ExerciseSearchHit } from '../domain/exercise-catalog.queries';
import type { WorkoutPlan } from '../domain/workout-plan.entity';
import type { WorkoutPlanExerciseId } from '../domain/workout-plan-exercise-id';
import type { WorkoutPlanSummary } from '../domain/workout-plan.queries';

export interface DietPlanItemDto {
  readonly id: string;
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
  readonly mealSlot: MealSlot;
  readonly logged?: boolean;
}

export interface DietPlanMealDto {
  readonly id: string;
  readonly mealSlot: MealSlot;
  readonly items: readonly DietPlanItemDto[];
}

export interface DietPlanDto {
  readonly id: string;
  readonly clientUserId: string;
  readonly trainerId: string;
  readonly gymOrgId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly status: string;
  readonly writable: boolean;
  readonly logDate: string | null;
  readonly meals: readonly DietPlanMealDto[];
  readonly clonedFromTemplateId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toDietPlanDtoFromEntity(
  plan: DietPlan,
  extras: { writable: boolean; logDate: string | null; loggedItemIds?: ReadonlySet<string> },
): DietPlanDto {
  return {
    id: plan.id,
    clientUserId: plan.clientUserId,
    trainerId: plan.trainerId,
    gymOrgId: plan.gymOrgId,
    title: plan.title.value,
    notes: plan.notes,
    status: plan.status,
    writable: extras.writable,
    logDate: extras.logDate,
    meals: plan.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity.value,
        mealSlot: meal.mealSlot,
        logged: extras.loggedItemIds === undefined ? undefined : extras.loggedItemIds.has(item.id),
      })),
    })),
    clonedFromTemplateId: plan.clonedFromTemplateId,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function toDietPlanDtoFromSummary(
  summary: DietPlanSummary,
  extras: {
    writable: boolean;
    logDate: string | null;
    loggedItemIds?: ReadonlySet<DietPlanMealItemId>;
  },
): DietPlanDto {
  return {
    id: summary.id,
    clientUserId: summary.clientUserId,
    trainerId: summary.trainerId,
    gymOrgId: summary.gymOrgId,
    title: summary.title,
    notes: summary.notes,
    status: summary.status,
    writable: extras.writable,
    logDate: extras.logDate,
    meals: summary.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity,
        mealSlot: meal.mealSlot,
        logged: extras.loggedItemIds === undefined ? undefined : extras.loggedItemIds.has(item.id),
      })),
    })),
    clonedFromTemplateId: summary.clonedFromTemplateId,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export interface DietPlanTemplateItemDto {
  readonly id: string;
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
}

export interface DietPlanTemplateMealDto {
  readonly id: string;
  readonly mealSlot: MealSlot;
  readonly items: readonly DietPlanTemplateItemDto[];
}

export interface DietPlanTemplateDto {
  readonly id: string;
  readonly gymOrgId: string;
  readonly trainerId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly clonedFromId: string | null;
  readonly meals: readonly DietPlanTemplateMealDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toDietPlanTemplateDto(template: DietPlanTemplate): DietPlanTemplateDto {
  return {
    id: template.id,
    gymOrgId: template.gymOrgId,
    trainerId: template.trainerId,
    title: template.title.value,
    notes: template.notes,
    clonedFromId: template.clonedFromId,
    meals: template.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity.value,
      })),
    })),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function toDietPlanTemplateDtoFromSummary(
  summary: DietPlanTemplateSummary,
): DietPlanTemplateDto {
  return {
    id: summary.id,
    gymOrgId: summary.gymOrgId,
    trainerId: summary.trainerId,
    title: summary.title,
    notes: summary.notes,
    clonedFromId: summary.clonedFromId,
    meals: summary.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity,
      })),
    })),
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export interface ExerciseSearchDto {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly primaryMuscle: string;
  readonly equipment: string;
  readonly measurement: string;
}

export function toExerciseSearchDto(hit: ExerciseSearchHit): ExerciseSearchDto {
  return {
    id: hit.id,
    name: hit.name,
    aliases: hit.aliases,
    primaryMuscle: hit.primaryMuscle,
    equipment: hit.equipment,
    measurement: hit.measurement,
  };
}

export interface WorkoutPlanExerciseDto {
  readonly id: string;
  readonly exerciseItemId: string;
  readonly name?: string;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
  readonly completed?: boolean;
}

export interface WorkoutPlanDayDto {
  readonly id: string;
  readonly dayLabel: string;
  readonly exercises: readonly WorkoutPlanExerciseDto[];
}

export interface WorkoutPlanDto {
  readonly id: string;
  readonly clientUserId: string;
  readonly trainerId: string;
  readonly gymOrgId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly status: string;
  readonly writable: boolean;
  readonly completionDate: string | null;
  readonly days: readonly WorkoutPlanDayDto[];
  readonly clonedFromId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toWorkoutPlanDtoFromEntity(
  plan: WorkoutPlan,
  extras: { writable: boolean; completionDate: string | null },
): WorkoutPlanDto {
  return {
    id: plan.id,
    clientUserId: plan.clientUserId,
    trainerId: plan.trainerId,
    gymOrgId: plan.gymOrgId,
    title: plan.title.value,
    notes: plan.notes,
    status: plan.status,
    writable: extras.writable,
    completionDate: extras.completionDate,
    days: plan.days.map((day) => ({
      id: day.id,
      dayLabel: day.dayLabel.value,
      exercises: day.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseItemId: exercise.exerciseItemId,
        sets: exercise.sets,
        reps: exercise.reps,
        notes: exercise.notes,
      })),
    })),
    clonedFromId: plan.clonedFromId,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function toWorkoutPlanDtoFromSummary(
  summary: WorkoutPlanSummary,
  extras: {
    writable: boolean;
    completionDate: string | null;
    completedExerciseIds?: ReadonlySet<WorkoutPlanExerciseId>;
  },
): WorkoutPlanDto {
  return {
    id: summary.id,
    clientUserId: summary.clientUserId,
    trainerId: summary.trainerId,
    gymOrgId: summary.gymOrgId,
    title: summary.title,
    notes: summary.notes,
    status: summary.status,
    writable: extras.writable,
    completionDate: extras.completionDate,
    days: summary.days.map((day) => ({
      id: day.id,
      dayLabel: day.dayLabel,
      exercises: day.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseItemId: exercise.exerciseItemId,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        notes: exercise.notes,
        completed:
          extras.completedExerciseIds === undefined
            ? undefined
            : extras.completedExerciseIds.has(exercise.id),
      })),
    })),
    clonedFromId: summary.clonedFromId,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}
