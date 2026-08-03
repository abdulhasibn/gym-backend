import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrgId } from './gym-org-id';

export interface GymOrgSummary {
  readonly id: GymOrgId;
  readonly name: string;
  readonly timezone: string;
  readonly isOwner: boolean;
}

export interface GymOrgQueries {
  listForUser(userId: UserId): Promise<readonly GymOrgSummary[]>;
}
