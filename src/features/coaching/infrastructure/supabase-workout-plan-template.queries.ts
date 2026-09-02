import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import { toPage } from '../../../shared/pagination/pagination';
import type { WorkoutPlanTemplateId } from '../domain/workout-plan-template-id';
import type {
  ListWorkoutPlanTemplatesCriteria,
  WorkoutPlanTemplateQueries,
  WorkoutPlanTemplateSummary,
} from '../domain/workout-plan-template.queries';
import {
  toWorkoutPlanTemplateSummary,
  type WorkoutTemplateWithExercises,
} from './coaching.mapper';

const TEMPLATE_SELECT = '*, workout_plan_template_exercises(*, exercise_items(name))';

export class SupabaseWorkoutPlanTemplateQueries implements WorkoutPlanTemplateQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(
    id: WorkoutPlanTemplateId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutPlanTemplateSummary | null> {
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
    return toWorkoutPlanTemplateSummary(data as WorkoutTemplateWithExercises);
  }

  async list(
    criteria: ListWorkoutPlanTemplatesCriteria,
    page: Pagination,
  ): Promise<Page<WorkoutPlanTemplateSummary>> {
    const { data, error, count } = await this.client
      .from('workout_plan_templates')
      .select(TEMPLATE_SELECT, { count: 'exact' })
      .eq('gym_org_id', criteria.gymOrgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list workout plan templates', {
        cause: error,
      });
    }

    return toPage(
      (data ?? []).map((row) => toWorkoutPlanTemplateSummary(row as WorkoutTemplateWithExercises)),
      count ?? 0,
      page,
    );
  }
}
