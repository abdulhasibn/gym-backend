import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { MembershipInviteId } from './membership-invite-id';
import type { MembershipInviteStatus } from './membership-invite-status';
import type { MembershipPlanId } from './membership-plan-id';
import type { PaymentStatus } from './payment-status';

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
  readonly acceptedMembershipId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MembershipInviteQueries {
  listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<MembershipInviteSummary>>;
}
