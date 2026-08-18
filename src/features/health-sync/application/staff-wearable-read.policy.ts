import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { LiveGymAdminPort, LiveTrainerPort } from '../domain/live-staff.port';
import { HealthSyncForbiddenError } from './health-sync-forbidden.error';

export class StaffWearableReadPolicy {
  constructor(
    private readonly admins: LiveGymAdminPort,
    private readonly trainers: LiveTrainerPort,
  ) {}

  async requireStaffAtGym(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<void> {
    if (actor.lane !== 'STAFF') {
      throw new HealthSyncForbiddenError();
    }
    if (actor.roleCode === 'ADMIN') {
      if (!(await this.admins.isLiveAdmin(actor.userId, gymOrgId))) {
        throw new HealthSyncForbiddenError();
      }
      return;
    }
    if (actor.roleCode === 'TRAINER') {
      if (!(await this.trainers.isLiveTrainer(actor.userId, gymOrgId))) {
        throw new HealthSyncForbiddenError();
      }
      return;
    }
    throw new HealthSyncForbiddenError();
  }
}
