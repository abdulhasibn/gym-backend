import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type {
  ListWorkoutScheduleRangeCriteria,
  WorkoutScheduleDaySummary,
  WorkoutScheduleQueries,
} from '../domain/workout-schedule.queries';
import {
  toWorkoutScheduleDaySummary,
  type ScheduleDayWithSessions,
} from './coaching.mapper';

const SCHEDULE_DAY_SELECT =
  '*, workout_schedule_sessions(*, workout_schedule_exercises(*, exercise_items(name)))';

export class SupabaseWorkoutScheduleQueries implements WorkoutScheduleQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listRange(
    criteria: ListWorkoutScheduleRangeCriteria,
  ): Promise<readonly WorkoutScheduleDaySummary[]> {
    const { data, error } = await this.client
      .from('workout_schedule_days')
      .select(SCHEDULE_DAY_SELECT)
      .eq('client_user_id', criteria.clientUserId)
      .eq('gym_org_id', criteria.gymOrgId)
      .gte('schedule_date', criteria.from)
      .lte('schedule_date', criteria.to)
      .is('deleted_at', null)
      .order('schedule_date', { ascending: true });

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list workout schedule', {
        cause: error,
      });
    }

    return (data ?? []).map((row) =>
      toWorkoutScheduleDaySummary(row as ScheduleDayWithSessions),
    );
  }
}
