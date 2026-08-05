import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrgId } from './gym-org-id';

/** Narrow authz port — live Admin affiliation at a gym. */
export interface GymOrgAdminDirectory {
  isLiveAdmin(userId: UserId, gymOrgId: GymOrgId): Promise<boolean>;
}
