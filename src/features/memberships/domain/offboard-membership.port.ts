import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { ClientMembership } from './client-membership.entity';
import type { MembershipId } from './membership-id';

/**
 * Atomic offboard: membership → INACTIVE + clear all DataGrants for (client, gym).
 * Implemented via PostgreSQL RPC (architecture §10 Transactions).
 */
export interface OffboardMembershipPort {
  offboard(gymOrgId: GymOrgId, membershipId: MembershipId, now: Date): Promise<ClientMembership>;
}
