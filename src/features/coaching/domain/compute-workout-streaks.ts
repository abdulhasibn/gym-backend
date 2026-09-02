import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';

export const WORKOUT_STREAK_LOOKBACK_DAYS = 366;

export type WorkoutStreakDayKind = 'REST' | 'TRAINING';

export interface WorkoutStreakDayStatus {
  readonly kind: WorkoutStreakDayKind;
  readonly dayDone: boolean;
}

export interface ComputeWorkoutStreaksInput {
  /** Inclusive end date (gym-local today). */
  readonly asOf: CalendarDate;
  /** Status by `YYYY-MM-DD`. Missing keys = unscheduled (break). */
  readonly days: ReadonlyMap<string, WorkoutStreakDayStatus>;
}

export interface WorkoutStreakResult {
  readonly currentStreak: number;
  readonly longestStreak: number;
}

/**
 * Walk calendar days backward. REST preserves without increment;
 * TRAINING+dayDone increments; incomplete TRAINING or missing schedule breaks.
 * Open today (TRAINING !dayDone) is skipped for the current streak only.
 */
export function computeWorkoutStreaks(input: ComputeWorkoutStreaksInput): WorkoutStreakResult {
  const lookbackStart = input.asOf.addDays(-(WORKOUT_STREAK_LOOKBACK_DAYS - 1));
  const dates = enumerateDatesInclusive(lookbackStart, input.asOf);

  const longestStreak = longestRun(dates, input.days);

  const asOfStatus = input.days.get(input.asOf.value);
  const skipAsOf =
    asOfStatus !== undefined &&
    asOfStatus.kind === 'TRAINING' &&
    asOfStatus.dayDone === false;

  const currentEnd = skipAsOf ? input.asOf.addDays(-1) : input.asOf;
  if (currentEnd.value < lookbackStart.value) {
    return { currentStreak: 0, longestStreak };
  }

  const currentDates = enumerateDatesInclusive(lookbackStart, currentEnd);
  const currentStreak = currentRunEndingAt(currentDates, input.days);

  return { currentStreak, longestStreak };
}

function longestRun(
  datesAsc: readonly CalendarDate[],
  days: ReadonlyMap<string, WorkoutStreakDayStatus>,
): number {
  let longest = 0;
  let run = 0;
  for (const date of datesAsc) {
    const outcome = classify(date, days);
    if (outcome === 'break') {
      run = 0;
      continue;
    }
    if (outcome === 'count') {
      run += 1;
      if (run > longest) {
        longest = run;
      }
    }
    // preserve: leave run unchanged
  }
  return longest;
}

function currentRunEndingAt(
  datesAsc: readonly CalendarDate[],
  days: ReadonlyMap<string, WorkoutStreakDayStatus>,
): number {
  let run = 0;
  for (let i = datesAsc.length - 1; i >= 0; i -= 1) {
    const date = datesAsc[i]!;
    const outcome = classify(date, days);
    if (outcome === 'break') {
      return run;
    }
    if (outcome === 'count') {
      run += 1;
    }
    // preserve: continue without increment
  }
  return run;
}

function classify(
  date: CalendarDate,
  days: ReadonlyMap<string, WorkoutStreakDayStatus>,
): 'count' | 'preserve' | 'break' {
  const status = days.get(date.value);
  if (status === undefined) {
    return 'break';
  }
  if (status.kind === 'REST') {
    return 'preserve';
  }
  return status.dayDone ? 'count' : 'break';
}

function enumerateDatesInclusive(from: CalendarDate, to: CalendarDate): CalendarDate[] {
  const dates: CalendarDate[] = [];
  let cursor = from;
  while (cursor.value <= to.value) {
    dates.push(cursor);
    if (cursor.value === to.value) {
      break;
    }
    cursor = cursor.addDays(1);
  }
  return dates;
}
