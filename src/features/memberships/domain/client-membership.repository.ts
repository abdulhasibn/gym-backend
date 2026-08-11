import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { ClientMembership } from './client-membership.entity';
import type { MembershipId } from './membership-id';

export interface ClientMembershipRepository {
  findById(gymOrgId: GymOrgId, membershipId: MembershipId): Promise<ClientMembership | null>;

  findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<ClientMembership | null>;

  save(membership: ClientMembership): Promise<void>;
}
