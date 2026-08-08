import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { ClientMembership } from './client-membership.entity';

export interface ClientMembershipRepository {
  findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<ClientMembership | null>;
}
