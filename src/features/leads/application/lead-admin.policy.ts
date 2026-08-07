import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { LiveGymAdminPort } from '../domain/live-gym-admin.port';
import { LeadForbiddenError } from './lead-forbidden.error';

export class LeadAdminPolicy {
  constructor(private readonly admins: LiveGymAdminPort) {}

  async requireLeadAccess(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<void> {
    if (actor.roleCode !== 'ADMIN') {
      throw new LeadForbiddenError();
    }
    const isAdmin = await this.admins.isLiveAdmin(actor.userId, gymOrgId);
    if (!isAdmin) {
      throw new LeadForbiddenError();
    }
  }
}
