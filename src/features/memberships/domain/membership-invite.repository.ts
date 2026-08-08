import type { UserId } from '../../../domain/shared/user-id';
import type { GrantChecklist } from './grant-checklist';
import type { MembershipInvite } from './membership-invite.entity';
import type { MembershipInviteId } from './membership-invite-id';

export interface MembershipInviteRepository {
  findById(inviteId: MembershipInviteId): Promise<MembershipInvite | null>;
  save(invite: MembershipInvite): Promise<void>;
  accept(
    inviteId: MembershipInviteId,
    actorUserId: UserId,
    checklist: GrantChecklist,
  ): Promise<MembershipInvite>;
}
