import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import { Lead } from '../domain/lead.entity';
import { toLeadId } from '../domain/lead-id';
import type { LeadEmail } from '../domain/lead-email.value-object';
import type { LeadName } from '../domain/lead-name.value-object';
import type { LeadPhone } from '../domain/lead-phone.value-object';
import type { LeadRepository } from '../domain/lead.repository';
import { duplicatePhoneWarning, toLeadDto, type LeadMutationResult } from './lead.dto';
import type { LeadAdminPolicy } from './lead-admin.policy';

export interface CreateLeadCommand {
  readonly gymOrgId: GymOrgId;
  readonly name: LeadName;
  readonly phone: LeadPhone;
  readonly email?: LeadEmail | null;
  readonly source: string | null;
  readonly interest: string | null;
  readonly notes: string | null;
}

export class CreateLeadUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly policy: LeadAdminPolicy,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: CreateLeadCommand,
  ): Promise<LeadMutationResult> {
    await this.policy.requireLeadAccess(actor, command.gymOrgId);

    const openIds = await this.leads.findOpenLeadIdsByPhone(command.gymOrgId, command.phone);
    const lead = Lead.create({
      id: toLeadId(this.ids.generate()),
      gymOrgId: command.gymOrgId,
      name: command.name,
      phone: command.phone,
      email: command.email ?? null,
      source: command.source,
      interest: command.interest,
      notes: command.notes,
      createdBy: actor.userId,
      now: this.clock.now(),
    });
    await this.leads.save(lead);

    const warnings = openIds.length > 0 ? [duplicatePhoneWarning(openIds.map((id) => id))] : [];

    return { lead: toLeadDto(lead), warnings };
  }
}
