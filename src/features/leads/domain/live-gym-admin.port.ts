import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';

export interface LiveGymAdminPort {
  isLiveAdmin(userId: UserId, gymOrgId: GymOrgId): Promise<boolean>;
}
