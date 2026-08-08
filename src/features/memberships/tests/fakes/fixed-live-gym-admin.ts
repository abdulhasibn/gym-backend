import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { LiveGymAdminPort } from '../../domain/live-gym-admin.port';

export class FixedLiveGymAdmin implements LiveGymAdminPort {
  private readonly admins = new Set<string>();

  seed(userId: UserId, gymOrgId: GymOrgId): void {
    this.admins.add(`${userId}:${gymOrgId}`);
  }

  async isLiveAdmin(userId: UserId, gymOrgId: GymOrgId): Promise<boolean> {
    return this.admins.has(`${userId}:${gymOrgId}`);
  }
}
