import type { UserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { GymOrgId } from './gym-org-id';
import type { StaffInviteId } from './staff-invite-id';
import type { StaffInviteStatus } from './staff-invite-status';
import type { StaffInviteTargetRole } from './staff-invite-target-role';

export interface StaffInviteSummary {
  readonly id: StaffInviteId;
  readonly gymOrgId: GymOrgId;
  readonly invitedUserId: UserId;
  readonly targetRole: StaffInviteTargetRole;
  /** Effective status — may be computed EXPIRED when expires_at is past. */
  readonly status: StaffInviteStatus;
  readonly expiresAt: string | null;
  readonly createdBy: UserId;
  readonly acceptedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Public gym profile embedded on invitee inbox items. */
export interface StaffInviteGymSummary {
  readonly id: GymOrgId;
  readonly name: string;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: string;
}

export interface StaffInviteInboxItem extends StaffInviteSummary {
  readonly gym: StaffInviteGymSummary;
}

export interface StaffInviteQueries {
  listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<StaffInviteSummary>>;
  listInboxForUser(userId: UserId, page: Pagination): Promise<Page<StaffInviteInboxItem>>;
}
