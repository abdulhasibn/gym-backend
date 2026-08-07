import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { LeadQueries } from '../domain/lead.queries';
import type { LeadStatus } from '../domain/lead-status';
import { toLeadDtoFromSummary, type LeadDto } from './lead.dto';
import type { LeadAdminPolicy } from './lead-admin.policy';

export class ListLeadsUseCase {
  constructor(
    private readonly queries: LeadQueries,
    private readonly policy: LeadAdminPolicy,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
    status?: LeadStatus,
  ): Promise<Page<LeadDto>> {
    await this.policy.requireLeadAccess(actor, gymOrgId);

    const result = await this.queries.list({ gymOrgId, status }, page);
    return {
      items: result.items.map(toLeadDtoFromSummary),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
