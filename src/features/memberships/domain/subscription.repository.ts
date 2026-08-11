import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { CalendarDate } from './calendar-date.value-object';
import type { MembershipId } from './membership-id';
import type { Subscription } from './subscription.entity';
import type { SubscriptionId } from './subscription-id';

export interface SubscriptionRepository {
  findById(gymOrgId: GymOrgId, subscriptionId: SubscriptionId): Promise<Subscription | null>;

  /**
   * In-date TRAINER_COACHING ADDON for a membership (command-side lookup).
   * Payment status is ignored.
   */
  findInDateCoachingAddon(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
    today: CalendarDate,
  ): Promise<Subscription | null>;

  save(subscription: Subscription): Promise<void>;
}
