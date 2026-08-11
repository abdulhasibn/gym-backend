import { ConflictError } from '../../../../domain/errors/conflict.error';
import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { ClientMembership } from '../../domain/client-membership.entity';
import type { MembershipId } from '../../domain/membership-id';
import type { OffboardMembershipPort } from '../../domain/offboard-membership.port';
import type { InMemoryClientMembershipStore } from './in-memory-client-membership.repository';

export class InMemoryOffboardMembership implements OffboardMembershipPort {
  readonly clearedGrantKeys: string[] = [];

  constructor(private readonly memberships: InMemoryClientMembershipStore) {}

  async offboard(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
    now: Date,
  ): Promise<ClientMembership> {
    const membership = await this.memberships.findById(gymOrgId, membershipId);
    if (membership === null) {
      throw new NotFoundError('Client membership not found');
    }
    if (!membership.isActive) {
      throw new ConflictError('Client membership is not active');
    }

    membership.offboard(now);
    await this.memberships.save(membership);
    this.clearedGrantKeys.push(`${membership.clientUserId}:${gymOrgId}`);
    return membership;
  }
}
