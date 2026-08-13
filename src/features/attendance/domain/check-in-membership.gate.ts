import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';

export interface CheckInBaseSubscription {
  readonly subscriptionId: string;
  readonly startDate: CalendarDate | null;
  readonly endDate: CalendarDate | null;
}

export interface CheckInMembershipSnapshot {
  readonly membershipId: string;
  readonly checkInBlocked: boolean;
  readonly base: CheckInBaseSubscription | null;
}

/**
 * Command-side eligibility lookup for check-in (not a query/read-model port).
 */
export interface CheckInMembershipGate {
  loadActive(clientUserId: UserId, gymOrgId: GymOrgId): Promise<CheckInMembershipSnapshot | null>;
}
