import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { LiveTrainerProfilePort } from '../../domain/live-trainer-profile.port';
import type { TrainerProfileId } from '../../domain/trainer-profile-id';

export class FixedLiveTrainerProfile implements LiveTrainerProfilePort {
  private readonly byUserGym = new Map<string, TrainerProfileId>();
  private readonly liveIds = new Set<string>();

  seed(userId: UserId, gymOrgId: GymOrgId, trainerProfileId: TrainerProfileId): void {
    this.byUserGym.set(`${userId}:${gymOrgId}`, trainerProfileId);
    this.liveIds.add(`${trainerProfileId}:${gymOrgId}`);
  }

  async findLiveProfileId(userId: UserId, gymOrgId: GymOrgId): Promise<TrainerProfileId | null> {
    return this.byUserGym.get(`${userId}:${gymOrgId}`) ?? null;
  }

  async isLiveAtGym(trainerProfileId: TrainerProfileId, gymOrgId: GymOrgId): Promise<boolean> {
    return this.liveIds.has(`${trainerProfileId}:${gymOrgId}`);
  }
}
