import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';

export interface ClientDataGrantSnapshot {
  readonly classGrants: readonly string[];
}

export interface ClientDataGrantGate {
  loadForActiveMembership(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<ClientDataGrantSnapshot | null>;
}
