import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { TrainerProfileId } from './trainer-profile-id';

/** Cross-feature port — live trainer_profiles affiliation at a gym. */
export interface LiveTrainerProfilePort {
  findLiveProfileId(userId: UserId, gymOrgId: GymOrgId): Promise<TrainerProfileId | null>;

  isLiveAtGym(trainerProfileId: TrainerProfileId, gymOrgId: GymOrgId): Promise<boolean>;
}
