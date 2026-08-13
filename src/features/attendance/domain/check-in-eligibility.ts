import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { CheckInNotAllowedError } from './check-in-not-allowed.error';
import type { CheckInMembershipSnapshot } from './check-in-membership.gate';

/**
 * ACTIVE + !blocked + (unstarted BASE OR in-date BASE).
 * Returns whether the BASE still needs to be started.
 */
export function assertCheckInAllowed(
  snapshot: CheckInMembershipSnapshot | null,
  today: CalendarDate,
): { needsBaseStart: boolean; subscriptionId: string | null } {
  if (snapshot === null) {
    throw new CheckInNotAllowedError('NO_ACTIVE_MEMBERSHIP', 'No active membership at this gym');
  }
  if (snapshot.checkInBlocked) {
    throw new CheckInNotAllowedError('CHECK_IN_BLOCKED', 'Check-in is blocked for this member');
  }
  if (snapshot.base === null) {
    throw new CheckInNotAllowedError('NO_BASE_SUBSCRIPTION', 'No BASE subscription found');
  }

  const { base } = snapshot;
  if (base.startDate === null || base.endDate === null) {
    return { needsBaseStart: true, subscriptionId: base.subscriptionId };
  }

  if (base.startDate.value <= today.value && today.value <= base.endDate.value) {
    return { needsBaseStart: false, subscriptionId: null };
  }

  throw new CheckInNotAllowedError(
    'BASE_OUT_OF_DATE',
    'BASE subscription is not in date for check-in',
  );
}
