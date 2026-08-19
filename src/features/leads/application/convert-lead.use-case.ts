import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CreateMembershipInviteFromLead } from '../domain/create-membership-invite.port';
import type { LeadEmail } from '../domain/lead-email.value-object';
import type { LeadId } from '../domain/lead-id';
import type { LeadRepository } from '../domain/lead.repository';
import type { LeadAdminPolicy } from './lead-admin.policy';
import { LeadEmailRequiredError } from './lead-email-required.error';
import { toLeadDto, type ConvertLeadResult } from './lead.dto';

export const LEAD_CONVERT_PAYMENT_STATUSES = ['paid', 'unpaid', 'partial'] as const;
export type LeadConvertPaymentStatus = (typeof LEAD_CONVERT_PAYMENT_STATUSES)[number];

export interface ConvertLeadCommand {
  readonly gymOrgId: GymOrgId;
  readonly leadId: LeadId;
  readonly invitedEmail?: LeadEmail;
  readonly basePlanId: string;
  readonly basePaymentStatus: LeadConvertPaymentStatus;
  readonly addonPlanId: string | null;
  readonly addonPaymentStatus: LeadConvertPaymentStatus | null;
  readonly expiresAt?: Date;
}

export class ConvertLeadUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly policy: LeadAdminPolicy,
    private readonly createInvite: CreateMembershipInviteFromLead,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: ConvertLeadCommand,
  ): Promise<ConvertLeadResult> {
    await this.policy.requireLeadAccess(actor, command.gymOrgId);

    const lead = await this.leads.findById(command.gymOrgId, command.leadId);
    if (lead === null) {
      throw new NotFoundError('Lead not found');
    }

    const now = this.clock.now();
    lead.assertCanConvert();
    if (command.invitedEmail !== undefined) {
      lead.recordEmail(command.invitedEmail, now);
    }
    if (lead.email === null) {
      throw new LeadEmailRequiredError();
    }

    const membershipInvite = await this.createInvite.execute(actor, {
      gymOrgId: command.gymOrgId,
      inviteeName: lead.name.value,
      invitedEmail: lead.email.value,
      inviteePhone: lead.phone.value,
      basePlanId: command.basePlanId,
      basePaymentStatus: command.basePaymentStatus,
      addonPlanId: command.addonPlanId,
      addonPaymentStatus: command.addonPaymentStatus,
      expiresAt: command.expiresAt,
    });

    lead.markConverted(membershipInvite.id, now);
    await this.leads.save(lead);

    return { lead: toLeadDto(lead), membershipInvite };
  }
}
