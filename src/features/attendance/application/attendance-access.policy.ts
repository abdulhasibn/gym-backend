import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { LiveGymAdminPort } from '../domain/live-gym-admin.port';
import type { LiveTrainerPort } from '../domain/live-trainer.port';
import { AttendanceForbiddenError } from './attendance-forbidden.error';

export class AttendanceAccessPolicy {
  constructor(
    private readonly admins: LiveGymAdminPort,
    private readonly trainers: LiveTrainerPort,
  ) {}

  async requireAdmin(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<void> {
    if (actor.roleCode !== 'ADMIN') {
      throw new AttendanceForbiddenError();
    }
    if (!(await this.admins.isLiveAdmin(actor.userId, gymOrgId))) {
      throw new AttendanceForbiddenError();
    }
  }

  /** Admin or live trainer at the gym may read gym-owned attendance. */
  async requireStaffRead(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<void> {
    if (actor.lane !== 'STAFF') {
      throw new AttendanceForbiddenError();
    }
    if (actor.roleCode === 'ADMIN') {
      if (!(await this.admins.isLiveAdmin(actor.userId, gymOrgId))) {
        throw new AttendanceForbiddenError();
      }
      return;
    }
    if (actor.roleCode === 'TRAINER') {
      if (!(await this.trainers.isLiveTrainer(actor.userId, gymOrgId))) {
        throw new AttendanceForbiddenError();
      }
      return;
    }
    throw new AttendanceForbiddenError();
  }

  requireClientSelf(actor: AuthenticatedActor): void {
    if (actor.roleCode !== 'CLIENT' || actor.lane !== 'CLIENT') {
      throw new AttendanceForbiddenError();
    }
  }
}
