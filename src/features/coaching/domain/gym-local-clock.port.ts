import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';

export interface GymLocalClock {
  today(gymOrgId: GymOrgId, now: Date): Promise<CalendarDate>;
}
