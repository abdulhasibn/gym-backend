import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { DataGrantsSnapshot } from './data-grant.queries';
import type { GrantChecklist } from './grant-checklist';

export interface DataGrantRepository {
  /**
   * Replaces optional profile-attribute and class grants for (client, gym).
   * Required DOB/HEIGHT/WEIGHT grants are never soft-deleted.
   * Returns the live grant snapshot after the write.
   */
  replaceOptionalGrants(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    checklist: GrantChecklist,
    now: Date,
  ): Promise<DataGrantsSnapshot>;
}
