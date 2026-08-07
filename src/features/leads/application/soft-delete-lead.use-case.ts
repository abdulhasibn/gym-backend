import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { LeadId } from '../domain/lead-id';
import type { LeadRepository } from '../domain/lead.repository';
import type { LeadAdminPolicy } from './lead-admin.policy';

export class SoftDeleteLeadUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly policy: LeadAdminPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    leadId: LeadId,
  ): Promise<void> {
    await this.policy.requireLeadAccess(actor, gymOrgId);

    const lead = await this.leads.findById(gymOrgId, leadId);
    if (lead === null) {
      throw new NotFoundError('Lead not found');
    }

    lead.softDelete(this.clock.now());
    await this.leads.save(lead);
  }
}
