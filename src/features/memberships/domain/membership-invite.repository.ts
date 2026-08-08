import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MembershipInvite } from './membership-invite.entity';
import type { MembershipInviteId } from './membership-invite-id';

export interface MembershipInviteRepository {
  findById(gymOrgId: GymOrgId, inviteId: MembershipInviteId): Promise<MembershipInvite | null>;
  save(invite: MembershipInvite): Promise<void>;
}
