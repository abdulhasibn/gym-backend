import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrgId } from './gym-org-id';
import type { StaffInvite } from './staff-invite.entity';
import type { StaffInviteId } from './staff-invite-id';

export interface StaffInviteRepository {
  findById(id: StaffInviteId): Promise<StaffInvite | null>;
  save(invite: StaffInvite): Promise<void>;
  countPendingAdminInvites(gymOrgId: GymOrgId): Promise<number>;
  hasLiveStaffAffiliation(userId: UserId, gymOrgId: GymOrgId): Promise<boolean>;
  countLiveAdmins(gymOrgId: GymOrgId): Promise<number>;
  /** Atomic accept: status, role upgrade, affiliations. */
  accept(inviteId: StaffInviteId, actorUserId: UserId): Promise<StaffInvite>;
}
