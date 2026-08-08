import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { MembershipInviteQueries } from '../domain/membership-invite.queries';
import type { MembershipInviteDto } from './membership-invite.dto';
import { toMembershipInviteDtoFromSummary } from './membership-invite.dto';
import type { PlanAdminPolicy } from './plan-admin.policy';

export class ListMembershipInvitesUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly inviteQueries: MembershipInviteQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
  ): Promise<Page<MembershipInviteDto>> {
    await this.policy.requirePlanAccess(actor, gymOrgId);

    const result = await this.inviteQueries.listForGym(gymOrgId, page);
    return {
      ...result,
      items: result.items.map(toMembershipInviteDtoFromSummary),
    };
  }
}
