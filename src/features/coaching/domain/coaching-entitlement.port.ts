import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';

export interface CoachingMembershipSnapshot {
  readonly assignedTrainerId: string | null;
}

export interface CoachingEntitlementPort {
  findActiveMembership(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<CoachingMembershipSnapshot | null>;

  hasInDateCoachingAddon(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    today: CalendarDate,
  ): Promise<boolean>;
}
