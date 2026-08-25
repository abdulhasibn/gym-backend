import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { MembershipId } from './membership-id';
import type { PaymentStatus } from './payment-status';
import type { PlanCapability } from './plan-capability';
import type { PlanKind } from './plan-kind';
import type { SubscriptionStartSource } from './subscription-start-source';

export interface SubscriptionSummary {
  readonly id: string;
  readonly clientMembershipId: string;
  readonly gymOrgId: string;
  readonly planId: string;
  readonly kind: PlanKind;
  readonly capability: PlanCapability | null;
  readonly priceAmount: number;
  readonly durationDays: number;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly startSource: SubscriptionStartSource | null;
  readonly paymentStatus: PaymentStatus;
  readonly amountPaid: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RenewalDueSummary extends SubscriptionSummary {
  readonly clientUserId: string;
}

export interface ListExpiringSoonCriteria {
  readonly gymOrgId: GymOrgId;
  /** Inclusive upper bound on end_date (YYYY-MM-DD). */
  readonly onOrBefore: string;
  /** Inclusive lower bound on end_date (YYYY-MM-DD). Optional. */
  readonly onOrAfter?: string;
}

export interface SubscriptionQueries {
  listForMembership(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
  ): Promise<readonly SubscriptionSummary[]>;

  /**
   * Lists live subscription lines for the client's membership at the gym.
   * When `requireActive` is true (default), only an ACTIVE membership qualifies.
   * When false, returns lines for the latest non-deleted membership (ACTIVE or
   * INACTIVE) so Admin billing history survives offboard.
   * Returns `null` when no qualifying membership exists.
   */
  listForClientAtGym(
    gymOrgId: GymOrgId,
    clientUserId: UserId,
    options?: { readonly requireActive?: boolean },
  ): Promise<readonly SubscriptionSummary[] | null>;

  /**
   * Admin renewals due-list: live BASE + ADDON lines with end_date in window.
   */
  listExpiringSoon(
    criteria: ListExpiringSoonCriteria,
    page: Pagination,
  ): Promise<Page<RenewalDueSummary>>;
}
