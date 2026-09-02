import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { WorkoutPlanTemplate } from '../domain/workout-plan-template.entity';
import type { WorkoutPlanTemplateId } from '../domain/workout-plan-template-id';
import type { WorkoutPlanTemplateRepository } from '../domain/workout-plan-template.repository';
import {
  toWorkoutPlanTemplate,
  toWorkoutPlanTemplateInsert,
  type WorkoutTemplateWithExercises,
} from './coaching.mapper';

const TEMPLATE_SELECT = '*, workout_plan_template_exercises(*, exercise_items(name))';

export class SupabaseWorkoutPlanTemplateRepository implements WorkoutPlanTemplateRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(
    id: WorkoutPlanTemplateId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutPlanTemplate | null> {
    const { data, error } = await this.client
      .from('workout_plan_templates')
      .select(TEMPLATE_SELECT)
      .eq('id', id)
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read workout plan template', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }
    return toWorkoutPlanTemplate(data as WorkoutTemplateWithExercises);
  }

  async save(template: WorkoutPlanTemplate): Promise<void> {
    const { error } = await this.client
      .from('workout_plan_templates')
      .insert(toWorkoutPlanTemplateInsert(template));
    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to create workout plan template', {
        cause: error,
      });
    }
    await this.insertExercises(template);
  }

  async replace(template: WorkoutPlanTemplate): Promise<void> {
    const { error: headerError } = await this.client
      .from('workout_plan_templates')
      .update({
        title: template.title.value,
        notes: template.notes,
        deleted_at: template.deletedAt === null ? null : template.deletedAt.toISOString(),
        updated_at: template.updatedAt.toISOString(),
      })
      .eq('id', template.id)
      .eq('gym_org_id', template.gymOrgId)
      .is('deleted_at', null);

    if (headerError !== null) {
      throw new TransientDatabaseFailureError('Unable to update workout plan template', {
        cause: headerError,
      });
    }

    await this.softDeleteLiveExercises(template.id, template.updatedAt.toISOString());
    if (template.deletedAt === null) {
      await this.insertExercises(template);
    }
  }

  private async softDeleteLiveExercises(
    templateId: WorkoutPlanTemplateId,
    deletedAt: string,
  ): Promise<void> {
    const { error } = await this.client
      .from('workout_plan_template_exercises')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('workout_plan_template_id', templateId)
      .is('deleted_at', null);
    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to archive workout plan template exercises', {
        cause: error,
      });
    }
  }

  private async insertExercises(template: WorkoutPlanTemplate): Promise<void> {
    const exercises = template.exercises.map((exercise) => ({
      id: exercise.id,
      workout_plan_template_id: template.id,
      exercise_item_id: exercise.exerciseItemId,
      sets: exercise.sets,
      reps: exercise.reps,
      notes: exercise.notes,
      sort_order: exercise.sortOrder,
    }));
    if (exercises.length === 0) {
      return;
    }
    const { error } = await this.client.from('workout_plan_template_exercises').insert(exercises);
    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to create workout plan template exercises', {
        cause: error,
      });
    }
  }
}
