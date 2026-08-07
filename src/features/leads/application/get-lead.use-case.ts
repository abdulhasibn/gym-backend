import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { LeadId } from '../domain/lead-id';
import type { LeadQueries } from '../domain/lead.queries';
import { toLeadDtoFromSummary, type LeadDto } from './lead.dto';
import type { LeadAdminPolicy } from './lead-admin.policy';

export class GetLeadUseCase {
  constructor(
    private readonly queries: LeadQueries,
    private readonly policy: LeadAdminPolicy,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    leadId: LeadId,
  ): Promise<LeadDto> {
    await this.policy.requireLeadAccess(actor, gymOrgId);

    const summary = await this.queries.get(gymOrgId, leadId);
    if (summary === null) {
      throw new NotFoundError('Lead not found');
    }

    return toLeadDtoFromSummary(summary);
  }
}
