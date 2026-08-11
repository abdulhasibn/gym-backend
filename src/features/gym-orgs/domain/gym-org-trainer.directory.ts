import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrgId } from './gym-org-id';

/** Narrow authz port — live trainer_profiles affiliation at a gym. */
export interface GymOrgTrainerDirectory {
  findLiveTrainerProfileId(userId: UserId, gymOrgId: GymOrgId): Promise<string | null>;

  isLiveTrainerProfile(trainerProfileId: string, gymOrgId: GymOrgId): Promise<boolean>;
}
