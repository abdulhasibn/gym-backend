import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { RenewalDueSummary, SubscriptionQueries } from '../domain/subscription.queries';
import type { PlanAdminPolicy } from './plan-admin.policy';
import { toSubscriptionDtoFromSummary, type SubscriptionDto } from './subscription.dto';

export interface RenewalDueDto extends SubscriptionDto {
  readonly clientUserId: string;
}

function toRenewalDueDto(summary: RenewalDueSummary): RenewalDueDto {
  return {
    ...toSubscriptionDtoFromSummary(summary),
    clientUserId: summary.clientUserId,
  };
}

export class ListRenewalsDueUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly queries: SubscriptionQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    onOrBefore: string,
    onOrAfter: string | undefined,
    page: Pagination,
  ): Promise<Page<RenewalDueDto>> {
    await this.policy.requirePlanAccess(actor, gymOrgId);

    const result = await this.queries.listExpiringSoon({ gymOrgId, onOrBefore, onOrAfter }, page);

    return {
      items: result.items.map(toRenewalDueDto),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
