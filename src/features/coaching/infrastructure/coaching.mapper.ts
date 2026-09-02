import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { toDietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import { toFoodItemId } from '../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../domain/shared/food-serving-id';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { parseMealSlot } from '../../../domain/shared/meal-slot';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { DietPlan } from '../domain/diet-plan.entity';
import { toDietPlanId } from '../domain/diet-plan-id';
import { toDietPlanMealId } from '../domain/diet-plan-meal-id';
import { toDietPlanTemplateId } from '../domain/diet-plan-template-id';
import { toDietPlanTemplateMealId } from '../domain/diet-plan-template-meal-id';
import { toDietPlanTemplateMealItemId } from '../domain/diet-plan-template-meal-item-id';
import { DietPlanTemplate } from '../domain/diet-plan-template.entity';
import type { DietPlanTemplateSummary } from '../domain/diet-plan-template.queries';
import type { DietPlanSummary } from '../domain/diet-plan.queries';
import { DietPlanTitle } from '../domain/diet-plan-title.value-object';
import { toExerciseItemId } from '../domain/exercise-item-id';
import type { ExerciseSearchHit } from '../domain/exercise-catalog.queries';
import { toTrainerProfileId } from '../domain/trainer-profile-id';
import { WorkoutPlan } from '../domain/workout-plan.entity';
import { toWorkoutPlanDayId } from '../domain/workout-plan-day-id';
import { toWorkoutPlanExerciseId } from '../domain/workout-plan-exercise-id';
import { toWorkoutPlanId } from '../domain/workout-plan-id';
import type { WorkoutPlanSummary } from '../domain/workout-plan.queries';
import { WorkoutDayLabel } from '../domain/workout-day-label.value-object';
import { WorkoutPlanTitle } from '../domain/workout-plan-title.value-object';
import { WorkoutPlanTemplate } from '../domain/workout-plan-template.entity';
import type { WorkoutPlanTemplateSummary } from '../domain/workout-plan-template.queries';
import { toWorkoutPlanTemplateExerciseId } from '../domain/workout-plan-template-exercise-id';
import { toWorkoutPlanTemplateId } from '../domain/workout-plan-template-id';
import { WorkoutScheduleDay } from '../domain/workout-schedule-day.entity';
import { parseWorkoutScheduleDayKind } from '../domain/workout-schedule-day-kind';
import { toWorkoutScheduleDayId } from '../domain/workout-schedule-day-id';
import { toWorkoutScheduleExerciseId } from '../domain/workout-schedule-exercise-id';
import { toWorkoutScheduleSessionId } from '../domain/workout-schedule-session-id';
import type { WorkoutScheduleDaySummary } from '../domain/workout-schedule.queries';
import { parseWorkoutSessionSlot } from '../domain/workout-session-slot';

type PlanRow = Database['public']['Tables']['diet_plans']['Row'];
type MealRow = Database['public']['Tables']['diet_plan_meals']['Row'];
type ItemRow = Database['public']['Tables']['diet_plan_meal_items']['Row'];

export type MealWithItems = MealRow & {
  diet_plan_meal_items: ItemRow[] | null;
};

export type PlanWithMeals = PlanRow & {
  diet_plan_meals: MealWithItems[] | null;
};

export function toDietPlan(row: PlanWithMeals): DietPlan {
  try {
    const meals = (row.diet_plan_meals ?? [])
      .filter((meal) => meal.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((meal) => ({
        id: toDietPlanMealId(meal.id),
        mealSlot: parseMealSlot(meal.meal_slot),
        sortOrder: meal.sort_order,
        items: (meal.diet_plan_meal_items ?? [])
          .filter((item) => item.deleted_at === null)
          .map((item) => ({
            id: toDietPlanMealItemId(item.id),
            foodItemId: toFoodItemId(item.food_item_id),
            servingId: toFoodServingId(item.serving_id),
            quantity: ServingQuantity.create(Number(item.quantity)),
          })),
      }));
    return DietPlan.reconstitute({
      id: toDietPlanId(row.id),
      clientUserId: toUserId(row.client_user_id),
      trainerId: toTrainerProfileId(row.trainer_id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      title: DietPlanTitle.create(row.title),
      notes: row.notes,
      status: row.status,
      meals,
      clonedFromTemplateId:
        row.cloned_from_template_id === null
          ? null
          : toDietPlanTemplateId(row.cloned_from_template_id),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored diet plan is invalid', { cause: error });
  }
}

export function toDietPlanSummary(row: PlanWithMeals): DietPlanSummary {
  const meals = (row.diet_plan_meals ?? [])
    .filter((meal) => meal.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((meal) => ({
      id: meal.id,
      mealSlot: parseMealSlot(meal.meal_slot),
      sortOrder: meal.sort_order,
      items: (meal.diet_plan_meal_items ?? [])
        .filter((item) => item.deleted_at === null)
        .map((item) => ({
          id: toDietPlanMealItemId(item.id),
          foodItemId: item.food_item_id,
          servingId: item.serving_id,
          quantity: Number(item.quantity),
        })),
    }));
  return {
    id: toDietPlanId(row.id),
    clientUserId: toUserId(row.client_user_id),
    trainerId: row.trainer_id,
    gymOrgId: toGymOrgId(row.gym_org_id),
    title: row.title,
    notes: row.notes,
    status: row.status,
    meals,
    clonedFromTemplateId: row.cloned_from_template_id,
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toDietPlanInsert(
  plan: DietPlan,
): Database['public']['Tables']['diet_plans']['Insert'] {
  return {
    id: plan.id,
    client_user_id: plan.clientUserId,
    trainer_id: plan.trainerId,
    gym_org_id: plan.gymOrgId,
    title: plan.title.value,
    notes: plan.notes,
    status: plan.status,
    cloned_from_template_id: plan.clonedFromTemplateId,
    created_at: plan.createdAt.toISOString(),
    updated_at: plan.updatedAt.toISOString(),
  };
}

type TemplateRow = Database['public']['Tables']['diet_plan_templates']['Row'];
type TemplateMealRow = Database['public']['Tables']['diet_plan_template_meals']['Row'];
type TemplateItemRow = Database['public']['Tables']['diet_plan_template_meal_items']['Row'];

export type TemplateMealWithItems = TemplateMealRow & {
  diet_plan_template_meal_items: TemplateItemRow[] | null;
};

export type TemplateWithMeals = TemplateRow & {
  diet_plan_template_meals: TemplateMealWithItems[] | null;
};

export function toDietPlanTemplate(row: TemplateWithMeals): DietPlanTemplate {
  try {
    return DietPlanTemplate.reconstitute({
      id: toDietPlanTemplateId(row.id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      trainerId: toTrainerProfileId(row.trainer_id),
      title: DietPlanTitle.create(row.title),
      notes: row.notes,
      clonedFromId: row.cloned_from_id === null ? null : toDietPlanTemplateId(row.cloned_from_id),
      meals: toTemplateMeals(row),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored diet plan template is invalid', { cause: error });
  }
}

export function toDietPlanTemplateSummary(row: TemplateWithMeals): DietPlanTemplateSummary {
  return {
    id: toDietPlanTemplateId(row.id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    trainerId: toTrainerProfileId(row.trainer_id),
    title: row.title,
    notes: row.notes,
    clonedFromId: row.cloned_from_id === null ? null : toDietPlanTemplateId(row.cloned_from_id),
    meals: toTemplateMeals(row).map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      sortOrder: meal.sortOrder,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity.value,
      })),
    })),
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toDietPlanTemplateInsert(
  template: DietPlanTemplate,
): Database['public']['Tables']['diet_plan_templates']['Insert'] {
  return {
    id: template.id,
    gym_org_id: template.gymOrgId,
    trainer_id: template.trainerId,
    title: template.title.value,
    notes: template.notes,
    cloned_from_id: template.clonedFromId,
    deleted_at: template.deletedAt === null ? null : template.deletedAt.toISOString(),
    created_at: template.createdAt.toISOString(),
    updated_at: template.updatedAt.toISOString(),
  };
}

function toTemplateMeals(row: TemplateWithMeals) {
  return (row.diet_plan_template_meals ?? [])
    .filter((meal) => meal.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((meal) => ({
      id: toDietPlanTemplateMealId(meal.id),
      mealSlot: parseMealSlot(meal.meal_slot),
      sortOrder: meal.sort_order,
      items: (meal.diet_plan_template_meal_items ?? [])
        .filter((item) => item.deleted_at === null)
        .map((item) => ({
          id: toDietPlanTemplateMealItemId(item.id),
          foodItemId: toFoodItemId(item.food_item_id),
          servingId: toFoodServingId(item.serving_id),
          quantity: ServingQuantity.create(Number(item.quantity)),
        })),
    }));
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}

type ExerciseRow = Database['public']['Tables']['exercise_items']['Row'];
type WorkoutPlanRow = Database['public']['Tables']['workout_plans']['Row'];
type WorkoutDayRow = Database['public']['Tables']['workout_plan_days']['Row'];
type WorkoutExerciseRow = Database['public']['Tables']['workout_plan_exercises']['Row'];

export type WorkoutExerciseWithItem = WorkoutExerciseRow & {
  exercise_items: { name: string } | { name: string }[] | null;
};

export type WorkoutDayWithExercises = WorkoutDayRow & {
  workout_plan_exercises: WorkoutExerciseWithItem[] | null;
};

export type WorkoutPlanWithDays = WorkoutPlanRow & {
  workout_plan_days: WorkoutDayWithExercises[] | null;
};

export function toExerciseSearchHit(row: ExerciseRow): ExerciseSearchHit {
  return {
    id: toExerciseItemId(row.id),
    name: row.name,
    aliases: row.aliases ?? [],
    primaryMuscle: row.primary_muscle,
    equipment: row.equipment,
    measurement: row.measurement,
  };
}

export function toWorkoutPlan(row: WorkoutPlanWithDays): WorkoutPlan {
  try {
    return WorkoutPlan.reconstitute({
      id: toWorkoutPlanId(row.id),
      clientUserId: toUserId(row.client_user_id),
      trainerId: toTrainerProfileId(row.trainer_id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      title: WorkoutPlanTitle.create(row.title),
      notes: row.notes,
      status: row.status,
      days: toWorkoutDays(row),
      clonedFromId: row.cloned_from_id === null ? null : toWorkoutPlanId(row.cloned_from_id),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored workout plan is invalid', { cause: error });
  }
}

export function toWorkoutPlanSummary(row: WorkoutPlanWithDays): WorkoutPlanSummary {
  return {
    id: toWorkoutPlanId(row.id),
    clientUserId: toUserId(row.client_user_id),
    trainerId: row.trainer_id,
    gymOrgId: toGymOrgId(row.gym_org_id),
    title: row.title,
    notes: row.notes,
    status: row.status,
    days: toWorkoutDays(row).map((day) => ({
      id: day.id,
      dayLabel: day.dayLabel.value,
      sortOrder: day.sortOrder,
      exercises: day.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseItemId: exercise.exerciseItemId,
        name: exerciseNameAt(row, day.id, exercise.id) ?? exercise.exerciseItemId,
        sets: exercise.sets,
        reps: exercise.reps,
        notes: exercise.notes,
      })),
    })),
    clonedFromId: row.cloned_from_id,
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toWorkoutPlanInsert(
  plan: WorkoutPlan,
): Database['public']['Tables']['workout_plans']['Insert'] {
  return {
    id: plan.id,
    client_user_id: plan.clientUserId,
    trainer_id: plan.trainerId,
    gym_org_id: plan.gymOrgId,
    title: plan.title.value,
    notes: plan.notes,
    status: plan.status,
    cloned_from_id: plan.clonedFromId,
    created_at: plan.createdAt.toISOString(),
    updated_at: plan.updatedAt.toISOString(),
  };
}

function toWorkoutDays(row: WorkoutPlanWithDays) {
  return (row.workout_plan_days ?? [])
    .filter((day) => day.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((day) => ({
      id: toWorkoutPlanDayId(day.id),
      dayLabel: WorkoutDayLabel.create(day.day_label),
      sortOrder: day.sort_order,
      exercises: (day.workout_plan_exercises ?? [])
        .filter((exercise) => exercise.deleted_at === null)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((exercise) => ({
          id: toWorkoutPlanExerciseId(exercise.id),
          exerciseItemId: toExerciseItemId(exercise.exercise_item_id),
          sets: exercise.sets,
          reps: exercise.reps,
          notes: exercise.notes,
          sortOrder: exercise.sort_order,
        })),
    }));
}

function exerciseNameAt(
  row: WorkoutPlanWithDays,
  dayId: string,
  exerciseId: string,
): string | null {
  const day = (row.workout_plan_days ?? []).find((candidate) => candidate.id === dayId);
  const exercise = (day?.workout_plan_exercises ?? []).find(
    (candidate) => candidate.id === exerciseId,
  );
  if (exercise === undefined) {
    return null;
  }
  const nested = exercise.exercise_items;
  if (Array.isArray(nested)) {
    return nested[0]?.name ?? null;
  }
  return nested?.name ?? null;
}

type WorkoutTemplateRow = Database['public']['Tables']['workout_plan_templates']['Row'];
type WorkoutTemplateExerciseRow =
  Database['public']['Tables']['workout_plan_template_exercises']['Row'];

export type WorkoutTemplateExerciseWithItem = WorkoutTemplateExerciseRow & {
  exercise_items: { name: string } | { name: string }[] | null;
};

export type WorkoutTemplateWithExercises = WorkoutTemplateRow & {
  workout_plan_template_exercises: WorkoutTemplateExerciseWithItem[] | null;
};

export function toWorkoutPlanTemplate(row: WorkoutTemplateWithExercises): WorkoutPlanTemplate {
  try {
    return WorkoutPlanTemplate.reconstitute({
      id: toWorkoutPlanTemplateId(row.id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      trainerId: toTrainerProfileId(row.trainer_id),
      title: WorkoutPlanTitle.create(row.title),
      notes: row.notes,
      clonedFromId:
        row.cloned_from_id === null ? null : toWorkoutPlanTemplateId(row.cloned_from_id),
      exercises: toTemplateExercises(row),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored workout plan template is invalid', { cause: error });
  }
}

export function toWorkoutPlanTemplateSummary(
  row: WorkoutTemplateWithExercises,
): WorkoutPlanTemplateSummary {
  return {
    id: toWorkoutPlanTemplateId(row.id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    trainerId: toTrainerProfileId(row.trainer_id),
    title: row.title,
    notes: row.notes,
    clonedFromId: row.cloned_from_id === null ? null : toWorkoutPlanTemplateId(row.cloned_from_id),
    exercises: toTemplateExercises(row).map((exercise) => ({
      id: exercise.id,
      exerciseItemId: exercise.exerciseItemId,
      name: templateExerciseName(row, exercise.id) ?? exercise.exerciseItemId,
      sets: exercise.sets,
      reps: exercise.reps,
      notes: exercise.notes,
      sortOrder: exercise.sortOrder,
    })),
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toWorkoutPlanTemplateInsert(
  template: WorkoutPlanTemplate,
): Database['public']['Tables']['workout_plan_templates']['Insert'] {
  return {
    id: template.id,
    gym_org_id: template.gymOrgId,
    trainer_id: template.trainerId,
    title: template.title.value,
    notes: template.notes,
    cloned_from_id: template.clonedFromId,
    deleted_at: template.deletedAt === null ? null : template.deletedAt.toISOString(),
    created_at: template.createdAt.toISOString(),
    updated_at: template.updatedAt.toISOString(),
  };
}

function toTemplateExercises(row: WorkoutTemplateWithExercises) {
  return (row.workout_plan_template_exercises ?? [])
    .filter((exercise) => exercise.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((exercise) => ({
      id: toWorkoutPlanTemplateExerciseId(exercise.id),
      exerciseItemId: toExerciseItemId(exercise.exercise_item_id),
      sets: exercise.sets,
      reps: exercise.reps,
      notes: exercise.notes,
      sortOrder: exercise.sort_order,
    }));
}

function templateExerciseName(
  row: WorkoutTemplateWithExercises,
  exerciseId: string,
): string | null {
  const exercise = (row.workout_plan_template_exercises ?? []).find(
    (candidate) => candidate.id === exerciseId,
  );
  if (exercise === undefined) {
    return null;
  }
  const nested = exercise.exercise_items;
  if (Array.isArray(nested)) {
    return nested[0]?.name ?? null;
  }
  return nested?.name ?? null;
}

type ScheduleDayRow = Database['public']['Tables']['workout_schedule_days']['Row'];
type ScheduleSessionRow = Database['public']['Tables']['workout_schedule_sessions']['Row'];
type ScheduleExerciseRow = Database['public']['Tables']['workout_schedule_exercises']['Row'];

export type ScheduleExerciseWithItem = ScheduleExerciseRow & {
  exercise_items: { name: string } | { name: string }[] | null;
};

export type ScheduleSessionWithExercises = ScheduleSessionRow & {
  workout_schedule_exercises: ScheduleExerciseWithItem[] | null;
};

export type ScheduleDayWithSessions = ScheduleDayRow & {
  workout_schedule_sessions: ScheduleSessionWithExercises[] | null;
};

export function toWorkoutScheduleDay(row: ScheduleDayWithSessions): WorkoutScheduleDay {
  try {
    return WorkoutScheduleDay.reconstitute({
      id: toWorkoutScheduleDayId(row.id),
      clientUserId: toUserId(row.client_user_id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      trainerId: toTrainerProfileId(row.trainer_id),
      scheduleDate: CalendarDate.create(row.schedule_date),
      kind: parseWorkoutScheduleDayKind(row.kind),
      sessions: toScheduleSessions(row),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored workout schedule day is invalid', { cause: error });
  }
}

export function toWorkoutScheduleDaySummary(
  row: ScheduleDayWithSessions,
): WorkoutScheduleDaySummary {
  return {
    id: toWorkoutScheduleDayId(row.id),
    clientUserId: toUserId(row.client_user_id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    trainerId: row.trainer_id,
    scheduleDate: row.schedule_date,
    kind: parseWorkoutScheduleDayKind(row.kind),
    sessions: toScheduleSessions(row).map((session) => ({
      id: session.id,
      slot: session.slot,
      title: session.title,
      clonedFromTemplateId: session.clonedFromTemplateId,
      exercises: session.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseItemId: exercise.exerciseItemId,
        name: scheduleExerciseName(row, exercise.id) ?? exercise.exerciseItemId,
        sets: exercise.sets,
        reps: exercise.reps,
        notes: exercise.notes,
        sortOrder: exercise.sortOrder,
      })),
    })),
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toWorkoutScheduleDayInsert(
  day: WorkoutScheduleDay,
): Database['public']['Tables']['workout_schedule_days']['Insert'] {
  return {
    id: day.id,
    client_user_id: day.clientUserId,
    gym_org_id: day.gymOrgId,
    trainer_id: day.trainerId,
    schedule_date: day.scheduleDate.value,
    kind: day.kind,
    deleted_at: day.deletedAt === null ? null : day.deletedAt.toISOString(),
    created_at: day.createdAt.toISOString(),
    updated_at: day.updatedAt.toISOString(),
  };
}

function toScheduleSessions(row: ScheduleDayWithSessions) {
  return (row.workout_schedule_sessions ?? [])
    .filter((session) => session.deleted_at === null)
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((session) => ({
      id: toWorkoutScheduleSessionId(session.id),
      slot: parseWorkoutSessionSlot(session.slot),
      title: session.title,
      clonedFromTemplateId: toWorkoutPlanTemplateId(session.cloned_from_template_id),
      exercises: (session.workout_schedule_exercises ?? [])
        .filter((exercise) => exercise.deleted_at === null)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((exercise) => ({
          id: toWorkoutScheduleExerciseId(exercise.id),
          exerciseItemId: toExerciseItemId(exercise.exercise_item_id),
          sets: exercise.sets,
          reps: exercise.reps,
          notes: exercise.notes,
          sortOrder: exercise.sort_order,
        })),
    }));
}

function scheduleExerciseName(
  row: ScheduleDayWithSessions,
  exerciseId: string,
): string | null {
  for (const session of row.workout_schedule_sessions ?? []) {
    const exercise = (session.workout_schedule_exercises ?? []).find(
      (candidate) => candidate.id === exerciseId,
    );
    if (exercise === undefined) {
      continue;
    }
    const nested = exercise.exercise_items;
    if (Array.isArray(nested)) {
      return nested[0]?.name ?? null;
    }
    return nested?.name ?? null;
  }
  return null;
}
