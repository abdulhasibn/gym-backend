import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';

/** Gym-local calendar day for entitlement windows (matches accept RPC / coaching). */
export interface GymLocalClock {
  today(gymOrgId: GymOrgId, now: Date): Promise<CalendarDate>;
}
