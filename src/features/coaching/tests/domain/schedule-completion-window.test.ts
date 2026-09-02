import { describe, expect, it } from 'vitest';

import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { InvalidWorkoutScheduleError } from '../../domain/invalid-workout-schedule.error';
import { assertScheduleCompletionWindow } from '../../domain/schedule-completion-window';

describe('assertScheduleCompletionWindow', () => {
  const today = CalendarDate.create('2026-08-17');

  it('allows D, D+1, and D+2', () => {
    expect(() =>
      assertScheduleCompletionWindow(CalendarDate.create('2026-08-17'), today),
    ).not.toThrow();
    expect(() =>
      assertScheduleCompletionWindow(CalendarDate.create('2026-08-16'), today),
    ).not.toThrow();
    expect(() =>
      assertScheduleCompletionWindow(CalendarDate.create('2026-08-15'), today),
    ).not.toThrow();
  });

  it('rejects future D and days before the window', () => {
    expect(() =>
      assertScheduleCompletionWindow(CalendarDate.create('2026-08-18'), today),
    ).toThrow(InvalidWorkoutScheduleError);
    expect(() =>
      assertScheduleCompletionWindow(CalendarDate.create('2026-08-14'), today),
    ).toThrow(InvalidWorkoutScheduleError);
  });
});
