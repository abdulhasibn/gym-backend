import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { WorkoutScheduleDay } from '../domain/workout-schedule-day.entity';
import type { WorkoutScheduleExerciseId } from '../domain/workout-schedule-exercise-id';
import type { WorkoutScheduleRepository } from '../domain/workout-schedule.repository';
import {
  toWorkoutScheduleDay,
  toWorkoutScheduleDayInsert,
  type ScheduleDayWithSessions,
} from './coaching.mapper';

const SCHEDULE_DAY_SELECT =
  '*, workout_schedule_sessions(*, workout_schedule_exercises(*, exercise_items(name)))';

export class SupabaseWorkoutScheduleRepository implements WorkoutScheduleRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByClientGymAndDate(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    scheduleDate: CalendarDate,
  ): Promise<WorkoutScheduleDay | null> {
    const { data, error } = await this.client
      .from('workout_schedule_days')
      .select(SCHEDULE_DAY_SELECT)
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .eq('schedule_date', scheduleDate.value)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read workout schedule day', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }
    return toWorkoutScheduleDay(data as ScheduleDayWithSessions);
  }

  async findExerciseContext(
    exerciseId: WorkoutScheduleExerciseId,
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutScheduleDay | null> {
    const { data: exerciseRow, error: exerciseError } = await this.client
      .from('workout_schedule_exercises')
      .select('id, session_id, deleted_at, workout_schedule_sessions!inner(schedule_day_id)')
      .eq('id', exerciseId)
      .is('deleted_at', null)
      .maybeSingle();

    if (exerciseError !== null) {
      throw new TransientDatabaseFailureError('Unable to resolve scheduled exercise', {
        cause: exerciseError,
      });
    }
    if (exerciseRow === null) {
      return null;
    }

    const session = exerciseRow.workout_schedule_sessions as
      | { schedule_day_id: string }
      | { schedule_day_id: string }[]
      | null;
    const scheduleDayId = Array.isArray(session)
      ? session[0]?.schedule_day_id
      : session?.schedule_day_id;
    if (scheduleDayId === undefined) {
      return null;
    }

    const { data, error } = await this.client
      .from('workout_schedule_days')
      .select(SCHEDULE_DAY_SELECT)
      .eq('id', scheduleDayId)
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read workout schedule day', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }
    return toWorkoutScheduleDay(data as ScheduleDayWithSessions);
  }

  async upsertDays(days: readonly WorkoutScheduleDay[]): Promise<void> {
    if (days.length === 0) {
      return;
    }

    const clientUserId = days[0]!.clientUserId;
    const gymOrgId = days[0]!.gymOrgId;
    const dates = days.map((day) => day.scheduleDate.value);
    const nowIso = days[0]!.updatedAt.toISOString();

    const { error: softDeleteError } = await this.client
      .from('workout_schedule_days')
      .update({ deleted_at: nowIso, updated_at: nowIso })
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .in('schedule_date', dates)
      .is('deleted_at', null);

    if (softDeleteError !== null) {
      throw new TransientDatabaseFailureError('Unable to replace prior schedule days', {
        cause: softDeleteError,
      });
    }

    const { error: dayError } = await this.client
      .from('workout_schedule_days')
      .insert(days.map(toWorkoutScheduleDayInsert));
    if (dayError !== null) {
      throw new TransientDatabaseFailureError('Unable to create workout schedule days', {
        cause: dayError,
      });
    }

    const sessions = days.flatMap((day) =>
      day.sessions.map((session) => ({
        id: session.id,
        schedule_day_id: day.id,
        slot: session.slot,
        title: session.title,
        cloned_from_template_id: session.clonedFromTemplateId,
        deleted_at: null,
        created_at: day.createdAt.toISOString(),
        updated_at: day.updatedAt.toISOString(),
      })),
    );
    if (sessions.length > 0) {
      const { error: sessionError } = await this.client
        .from('workout_schedule_sessions')
        .insert(sessions);
      if (sessionError !== null) {
        throw new TransientDatabaseFailureError('Unable to create workout schedule sessions', {
          cause: sessionError,
        });
      }
    }

    const exercises = days.flatMap((day) =>
      day.sessions.flatMap((session) =>
        session.exercises.map((exercise) => ({
          id: exercise.id,
          session_id: session.id,
          exercise_item_id: exercise.exerciseItemId,
          sets: exercise.sets,
          reps: exercise.reps,
          notes: exercise.notes,
          sort_order: exercise.sortOrder,
          deleted_at: null,
          created_at: day.createdAt.toISOString(),
          updated_at: day.updatedAt.toISOString(),
        })),
      ),
    );
    if (exercises.length === 0) {
      return;
    }
    const { error: exerciseError } = await this.client
      .from('workout_schedule_exercises')
      .insert(exercises);
    if (exerciseError !== null) {
      throw new TransientDatabaseFailureError('Unable to create workout schedule exercises', {
        cause: exerciseError,
      });
    }
  }
}
