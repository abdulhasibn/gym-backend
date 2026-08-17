import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { TrainerProfileId } from './trainer-profile-id';

export interface LiveGymAdminPort {
  isLiveAdmin(userId: UserId, gymOrgId: GymOrgId): Promise<boolean>;
}

export interface LiveTrainerProfilePort {
  findLiveProfileId(userId: UserId, gymOrgId: GymOrgId): Promise<TrainerProfileId | null>;
}
