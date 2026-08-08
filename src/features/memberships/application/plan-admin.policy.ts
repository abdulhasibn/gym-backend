import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { LiveGymAdminPort } from '../domain/live-gym-admin.port';
import { PlanForbiddenError } from './plan-forbidden.error';

export class PlanAdminPolicy {
  constructor(private readonly admins: LiveGymAdminPort) {}

  async requirePlanAccess(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<void> {
    if (actor.roleCode !== 'ADMIN') {
      throw new PlanForbiddenError();
    }
    const isAdmin = await this.admins.isLiveAdmin(actor.userId, gymOrgId);
    if (!isAdmin) {
      throw new PlanForbiddenError();
    }
  }
}
