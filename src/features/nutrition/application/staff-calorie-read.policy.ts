import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { LiveGymAdminPort, LiveTrainerPort } from '../domain/live-staff.port';
import { NutritionForbiddenError } from './nutrition-forbidden.error';

export class StaffCalorieReadPolicy {
  constructor(
    private readonly admins: LiveGymAdminPort,
    private readonly trainers: LiveTrainerPort,
  ) {}

  async requireStaffAtGym(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<void> {
    if (actor.lane !== 'STAFF') {
      throw new NutritionForbiddenError();
    }
    if (actor.roleCode === 'ADMIN') {
      if (!(await this.admins.isLiveAdmin(actor.userId, gymOrgId))) {
        throw new NutritionForbiddenError();
      }
      return;
    }
    if (actor.roleCode === 'TRAINER') {
      if (!(await this.trainers.isLiveTrainer(actor.userId, gymOrgId))) {
        throw new NutritionForbiddenError();
      }
      return;
    }
    throw new NutritionForbiddenError();
  }
}
