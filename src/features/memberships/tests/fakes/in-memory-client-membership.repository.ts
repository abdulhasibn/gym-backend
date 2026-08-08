import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { ClientMembership } from '../../domain/client-membership.entity';
import { ClientMembership as ClientMembershipEntity } from '../../domain/client-membership.entity';
import type { ClientMembershipRepository } from '../../domain/client-membership.repository';
import { toMembershipId } from '../../domain/membership-id';
import type { MembershipInviteId } from '../../domain/membership-invite-id';

export class InMemoryClientMembershipStore implements ClientMembershipRepository {
  private readonly byKey = new Map<string, ClientMembership>();
  private counter = 0;

  seedActive(clientUserId: UserId, gymOrgId: GymOrgId, sourceInviteId?: MembershipInviteId): void {
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
    this.byKey.set(`${clientUserId}:${gymOrgId}`, membership);
  }

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<ClientMembership | null> {
    return this.byKey.get(`${clientUserId}:${gymOrgId}`) ?? null;
  }
}
