import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';

export interface GymLocalDayBounds {
  readonly startInclusive: Date;
  readonly endExclusive: Date;
}

export interface GymLocalClock {
  /** Calendar day in the gym's IANA timezone for the given instant. */
  today(gymOrgId: GymOrgId, now: Date): Promise<CalendarDate>;

  /** UTC bounds for a gym-local calendar day (for attendance queries). */
  dayBounds(gymOrgId: GymOrgId, day: CalendarDate): Promise<GymLocalDayBounds>;
}
