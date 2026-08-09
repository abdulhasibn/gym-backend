import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { ClientMembership } from '../../domain/client-membership.entity';
import { ClientMembership as ClientMembershipEntity } from '../../domain/client-membership.entity';
import type { ClientMembershipRepository } from '../../domain/client-membership.repository';
import { toMembershipId, type MembershipId } from '../../domain/membership-id';
import type { MembershipInviteId } from '../../domain/membership-invite-id';

export class InMemoryClientMembershipStore implements ClientMembershipRepository {
  private readonly byId = new Map<string, ClientMembership>();
  private readonly activeByClientGym = new Map<string, MembershipId>();
  private counter = 0;

  seedActive(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    sourceInviteId?: MembershipInviteId,
  ): ClientMembership {
    this.counter += 1;
    const membership = ClientMembershipEntity.create({
      id: toMembershipId(`eeeeeeee-eeee-4eee-8eee-${String(this.counter).padStart(12, '0')}`),
      clientUserId,
      gymOrgId,
      sourceInviteId:
        sourceInviteId ??
        (`dddddddd-dddd-4ddd-8ddd-${String(this.counter).padStart(12, '0')}` as MembershipInviteId),
      now: new Date('2026-08-08T00:00:00.000Z'),
    });
    this.byId.set(membership.id, membership);
    this.activeByClientGym.set(`${clientUserId}:${gymOrgId}`, membership.id);
    return membership;
  }

  async findById(gymOrgId: GymOrgId, membershipId: MembershipId): Promise<ClientMembership | null> {
    const membership = this.byId.get(membershipId) ?? null;
    if (membership === null || membership.gymOrgId !== gymOrgId || membership.isDeleted) {
      return null;
    }
    return membership;
  }

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<ClientMembership | null> {
    const id = this.activeByClientGym.get(`${clientUserId}:${gymOrgId}`);
    if (id === undefined) {
      return null;
    }
    return this.findById(gymOrgId, id);
  }
}
