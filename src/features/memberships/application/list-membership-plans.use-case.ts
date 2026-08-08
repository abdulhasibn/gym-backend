import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { MembershipPlanQueries } from '../domain/membership-plan.queries';
import type { PlanKind } from '../domain/plan-kind';
import { toMembershipPlanDtoFromSummary, type MembershipPlanDto } from './membership-plan.dto';
import type { PlanAdminPolicy } from './plan-admin.policy';

export class ListMembershipPlansUseCase {
  constructor(
    private readonly queries: MembershipPlanQueries,
    private readonly policy: PlanAdminPolicy,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
    filters: { kind?: PlanKind; active?: boolean } = {},
  ): Promise<Page<MembershipPlanDto>> {
    await this.policy.requirePlanAccess(actor, gymOrgId);

    const result = await this.queries.list(
      { gymOrgId, kind: filters.kind, active: filters.active },
      page,
    );
    return {
      items: result.items.map(toMembershipPlanDtoFromSummary),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
