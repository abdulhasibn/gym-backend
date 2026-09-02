import { describe, expect, it } from 'vitest';

import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import {
  computeWorkoutStreaks,
  type WorkoutStreakDayStatus,
} from '../../domain/compute-workout-streaks';

const asOf = CalendarDate.create('2026-08-17');

function mapOf(
  entries: readonly (readonly [string, WorkoutStreakDayStatus])[],
): Map<string, WorkoutStreakDayStatus> {
  return new Map(entries);
}

describe('computeWorkoutStreaks', () => {
  it('counts TRAINING dayDone days and preserves across REST', () => {
    const result = computeWorkoutStreaks({
      asOf,
      days: mapOf([
        ['2026-08-15', { kind: 'TRAINING', dayDone: true }],
        ['2026-08-16', { kind: 'REST', dayDone: true }],
        ['2026-08-17', { kind: 'TRAINING', dayDone: true }],
      ]),
    });
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
  });

  it('breaks on incomplete TRAINING and on missing schedule', () => {
    const incomplete = computeWorkoutStreaks({
      asOf,
      days: mapOf([
        ['2026-08-16', { kind: 'TRAINING', dayDone: true }],
        ['2026-08-17', { kind: 'TRAINING', dayDone: false }],
      ]),
    });
    // open today skipped → current ends at 16
    expect(incomplete.currentStreak).toBe(1);

    const missingBreaks = computeWorkoutStreaks({
      asOf,
      days: mapOf([
        ['2026-08-15', { kind: 'TRAINING', dayDone: true }],
        // 16 missing
        ['2026-08-17', { kind: 'TRAINING', dayDone: true }],
      ]),
    });
    expect(missingBreaks.currentStreak).toBe(1);
    expect(missingBreaks.longestStreak).toBe(1);
  });

  it('skips open today for current but still tracks longest historically', () => {
    const result = computeWorkoutStreaks({
      asOf,
      days: mapOf([
        ['2026-08-10', { kind: 'TRAINING', dayDone: true }],
        ['2026-08-11', { kind: 'TRAINING', dayDone: true }],
        ['2026-08-12', { kind: 'TRAINING', dayDone: true }],
        ['2026-08-13', { kind: 'TRAINING', dayDone: false }],
        ['2026-08-16', { kind: 'TRAINING', dayDone: true }],
        ['2026-08-17', { kind: 'TRAINING', dayDone: false }],
      ]),
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(3);
  });
});
