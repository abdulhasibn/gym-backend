import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { InvalidWorkoutScheduleError } from './invalid-workout-schedule.error';

const CATCH_UP_DAYS = 2;

/**
 * Phase 3 (ADR-0011): allow complete/uncomplete when gym-local today ∈ [D, D+2]
 * and schedule date D is not in the future.
 */
export function assertScheduleCompletionWindow(
  scheduleDate: CalendarDate,
  today: CalendarDate,
): void {
  if (scheduleDate.value > today.value) {
    throw new InvalidWorkoutScheduleError(
      'Cannot complete exercises scheduled for a future calendar day',
    );
  }
  const latest = scheduleDate.addDays(CATCH_UP_DAYS);
  if (today.value > latest.value) {
    throw new InvalidWorkoutScheduleError(
      'Exercises can only be completed within two days after their scheduled date',
    );
  }
}
