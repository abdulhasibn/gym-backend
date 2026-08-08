import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { DataGrantClass } from './data-grant-class';
import type { ProfileAttribute } from './profile-attribute';

export interface DataGrantsSnapshot {
  readonly gymOrgId: GymOrgId;
  readonly clientUserId: UserId;
  readonly profileAttributes: readonly ProfileAttribute[];
  readonly classGrants: readonly DataGrantClass[];
}

export interface DataGrantQueries {
  /**
   * Live grants for (client, gym) when the client has an ACTIVE membership there.
   * Returns null when no ACTIVE membership exists.
   */
  listForActiveMembership(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<DataGrantsSnapshot | null>;
}
