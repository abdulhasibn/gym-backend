import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { MembershipId } from './membership-id';
import type { MembershipInviteId } from './membership-invite-id';
import type { MembershipInviteStatus } from './membership-invite-status';
import type { MembershipPlanId } from './membership-plan-id';
import type { PaymentStatus } from './payment-status';

export interface MembershipInviteGymSummary {
  readonly id: GymOrgId;
  readonly name: string;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: string;
}

export interface MembershipInviteSummary {
  readonly id: MembershipInviteId;
  readonly gymOrgId: GymOrgId;
  readonly invitedEmail: string;
  readonly invitedUserId: UserId | null;
  readonly inviteeName: string;
  readonly inviteePhone: string | null;
  readonly basePlanId: MembershipPlanId;
  readonly basePaymentStatus: PaymentStatus;
  readonly addonPlanId: MembershipPlanId | null;
  readonly addonPaymentStatus: PaymentStatus | null;
  /** Effective status — may be computed EXPIRED when expires_at is past. */
  readonly status: MembershipInviteStatus;
  readonly expiresAt: string | null;
  readonly createdBy: UserId;
  readonly acceptedAt: string | null;
  readonly acceptedMembershipId: MembershipId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MembershipInviteInboxItem extends MembershipInviteSummary {
  readonly gym: MembershipInviteGymSummary;
}

export interface MembershipInviteQueries {
  listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<MembershipInviteSummary>>;
  listInboxForUser(
    userId: UserId,
    email: string,
    page: Pagination,
  ): Promise<Page<MembershipInviteInboxItem>>;
}
