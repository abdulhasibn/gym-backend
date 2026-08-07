import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { LeadId } from '../domain/lead-id';
import type { LeadName } from '../domain/lead-name.value-object';
import type { LeadPhone } from '../domain/lead-phone.value-object';
import type { LeadRepository } from '../domain/lead.repository';
import { duplicatePhoneWarning, toLeadDto, type LeadMutationResult } from './lead.dto';
import type { LeadAdminPolicy } from './lead-admin.policy';

export interface UpdateLeadCommand {
  readonly gymOrgId: GymOrgId;
  readonly leadId: LeadId;
  readonly name: LeadName;
  readonly phone: LeadPhone;
  readonly source: string | null;
  readonly interest: string | null;
  readonly notes: string | null;
  /** Omit to keep existing; `null` clears. */
  readonly followUpDate?: string | null;
}

export class UpdateLeadUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly policy: LeadAdminPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, command: UpdateLeadCommand): Promise<LeadMutationResult> {
    await this.policy.requireLeadAccess(actor, command.gymOrgId);

    const lead = await this.leads.findById(command.gymOrgId, command.leadId);
    if (lead === null) {
      throw new NotFoundError('Lead not found');
    }

    const openIds = await this.leads.findOpenLeadIdsByPhone(
      command.gymOrgId,
      command.phone,
      command.leadId,
    );

    lead.updateProfile(
      {
        name: command.name,
        phone: command.phone,
        source: command.source,
        interest: command.interest,
        notes: command.notes,
        followUpDate:
          command.followUpDate === undefined ? lead.followUpDate : command.followUpDate,
      },
      this.clock.now(),
    );
    await this.leads.save(lead);

    const warnings =
      openIds.length > 0 ? [duplicatePhoneWarning(openIds.map((id) => id))] : [];

    return { lead: toLeadDto(lead), warnings };
  }
}
