import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrgId } from './gym-org-id';

export interface GymOrgSummary {
  readonly id: GymOrgId;
  readonly name: string;
  readonly timezone: string;
  readonly isOwner: boolean;
}

export interface GymOrgDetail {
  readonly id: GymOrgId;
  readonly name: string;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: string;
  readonly ownerUserId: UserId;
  readonly isOwner: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GymOrgQueries {
  listForUser(userId: UserId): Promise<readonly GymOrgSummary[]>;
  getForUser(userId: UserId, gymOrgId: GymOrgId): Promise<GymOrgDetail | null>;
}
