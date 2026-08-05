import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgAdminDirectory } from '../domain/gym-org-admin.directory';
import type { GymOrgId } from '../domain/gym-org-id';
import { GymOrgWriteForbiddenError } from './gym-org-write-forbidden.error';
import { StaffInviteForbiddenError } from './staff-invite-forbidden.error';

export class GymOrgAdminPolicy {
  constructor(private readonly admins: GymOrgAdminDirectory) {}

  async requireOrgWrite(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<void> {
    if (actor.roleCode !== 'ADMIN') {
      throw new GymOrgWriteForbiddenError();
    }
    const isAdmin = await this.admins.isLiveAdmin(actor.userId, gymOrgId);
    if (!isAdmin) {
      throw new GymOrgWriteForbiddenError();
    }
  }

  async requireStaffInvite(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<void> {
    if (actor.roleCode !== 'ADMIN') {
      throw new StaffInviteForbiddenError();
    }
    const isAdmin = await this.admins.isLiveAdmin(actor.userId, gymOrgId);
    if (!isAdmin) {
      throw new StaffInviteForbiddenError();
    }
  }
}
