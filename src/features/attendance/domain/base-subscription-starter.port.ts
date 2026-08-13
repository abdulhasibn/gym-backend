import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';

/**
 * Starts an unstarted BASE subscription from first attendance.
 */
export interface BaseSubscriptionStarter {
  startFromFirstAttendance(
    gymOrgId: GymOrgId,
    subscriptionId: string,
    today: CalendarDate,
    now: Date,
  ): Promise<void>;
}
