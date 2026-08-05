import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { GymOrgId } from '../domain/gym-org-id';
import type { StaffInviteQueries } from '../domain/staff-invite.queries';
import type { GymOrgAdminPolicy } from './gym-org-admin.policy';
import type { StaffInviteDto } from './gym-org.dto';
import { toStaffInviteDtoFromSummary } from './staff-invite.dto';

export class ListGymStaffInvitesUseCase {
  constructor(
    private readonly policy: GymOrgAdminPolicy,
    private readonly staffInviteQueries: StaffInviteQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
  ): Promise<Page<StaffInviteDto>> {
    await this.policy.requireStaffInvite(actor, gymOrgId);

    const result = await this.staffInviteQueries.listForGym(gymOrgId, page);
    return {
      ...result,
      items: result.items.map(toStaffInviteDtoFromSummary),
    };
  }
}
