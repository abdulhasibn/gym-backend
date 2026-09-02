import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import {
  WORKOUT_STREAK_LOOKBACK_DAYS,
  computeWorkoutStreaks,
  type WorkoutStreakDayStatus,
} from '../domain/compute-workout-streaks';
import type { WorkoutScheduleCompletionQueries } from '../domain/workout-schedule-completion.queries';
import type {
  WorkoutScheduleDaySummary,
  WorkoutScheduleQueries,
} from '../domain/workout-schedule.queries';
import type { WorkoutStreakDto } from './coaching.dto';
import { loadCompletionsByScheduleDate } from './get-my-workout-schedule.use-case';

export async function loadWorkoutStreakDto(input: {
  readonly clientUserId: UserId;
  readonly gymOrgId: Parameters<WorkoutScheduleQueries['listRange']>[0]['gymOrgId'];
  readonly asOf: CalendarDate;
  readonly scheduleQueries: WorkoutScheduleQueries;
  readonly completionQueries: WorkoutScheduleCompletionQueries;
}): Promise<WorkoutStreakDto> {
  const from = input.asOf.addDays(-(WORKOUT_STREAK_LOOKBACK_DAYS - 1));
  const summaries = await input.scheduleQueries.listRange({
    clientUserId: input.clientUserId,
    gymOrgId: input.gymOrgId,
    from: from.value,
    to: input.asOf.value,
  });

  const completedByDate = await loadCompletionsByScheduleDate(
    input.completionQueries,
    input.clientUserId,
    summaries,
  );

  const days = toStreakDayStatuses(summaries, completedByDate);
  const { currentStreak, longestStreak } = computeWorkoutStreaks({
    asOf: input.asOf,
    days,
  });

  return {
    asOf: input.asOf.value,
    currentStreak,
    longestStreak,
    lookbackDays: WORKOUT_STREAK_LOOKBACK_DAYS,
  };
}

export function toStreakDayStatuses(
  summaries: readonly WorkoutScheduleDaySummary[],
  completedByDate: ReadonlyMap<string, ReadonlySet<string>>,
): Map<string, WorkoutStreakDayStatus> {
  const map = new Map<string, WorkoutStreakDayStatus>();
  for (const summary of summaries) {
    const exerciseIds = summary.sessions.flatMap((session) =>
      session.exercises.map((exercise) => exercise.id),
    );
    const completed = completedByDate.get(summary.scheduleDate) ?? new Set();
    if (summary.kind === 'REST') {
      map.set(summary.scheduleDate, { kind: 'REST', dayDone: true });
      continue;
    }
    const dayDone =
      exerciseIds.length > 0 && exerciseIds.every((id) => completed.has(id));
    map.set(summary.scheduleDate, { kind: 'TRAINING', dayDone });
  }
  return map;
}

export function emptyWorkoutStreakDto(asOf: CalendarDate): WorkoutStreakDto {
  return {
    asOf: asOf.value,
    currentStreak: 0,
    longestStreak: 0,
    lookbackDays: WORKOUT_STREAK_LOOKBACK_DAYS,
  };
}
