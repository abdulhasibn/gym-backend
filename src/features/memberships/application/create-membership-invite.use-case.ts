import { ConflictError } from '../../../domain/errors/conflict.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { ClientUserLookup } from '../domain/client-user-lookup';
import type { InviteeEmail } from '../domain/invitee-email.value-object';
import type { InviteeName } from '../domain/invitee-name.value-object';
import type { InviteePhone } from '../domain/invitee-phone.value-object';
import { DEFAULT_MEMBERSHIP_INVITE_TTL_DAYS } from '../domain/membership-invite.constants';
import { MembershipInvite } from '../domain/membership-invite.entity';
import { toMembershipInviteId } from '../domain/membership-invite-id';
import type { MembershipInviteRepository } from '../domain/membership-invite.repository';
import type { MembershipPlanRepository } from '../domain/membership-plan.repository';
import type { MembershipPlanId } from '../domain/membership-plan-id';
import type { PaymentStatus } from '../domain/payment-status';
import { InvalidInvitePlanError } from './invalid-invite-plan.error';
import { InvalidMembershipInviteeError } from './invalid-membership-invitee.error';
import type { MembershipInviteDto } from './membership-invite.dto';
import { toMembershipInviteDto } from './membership-invite.dto';
import type { PlanAdminPolicy } from './plan-admin.policy';

export interface CreateMembershipInviteCommand {
  readonly gymOrgId: GymOrgId;
  readonly inviteeName: InviteeName;
  readonly invitedEmail: InviteeEmail;
  readonly inviteePhone: InviteePhone | null;
  readonly basePlanId: MembershipPlanId;
  readonly basePaymentStatus: PaymentStatus;
  readonly addonPlanId: MembershipPlanId | null;
  readonly addonPaymentStatus: PaymentStatus | null;
  readonly expiresAt?: Date;
}

export class CreateMembershipInviteUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly invites: MembershipInviteRepository,
    private readonly plans: MembershipPlanRepository,
    private readonly clientUsers: ClientUserLookup,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: CreateMembershipInviteCommand,
  ): Promise<MembershipInviteDto> {
    await this.policy.requirePlanAccess(actor, command.gymOrgId);

    if ((command.addonPlanId === null) !== (command.addonPaymentStatus === null)) {
      throw new InvalidInvitePlanError(
        'Addon plan and addon payment status must both be set or both be omitted',
      );
    }

    const basePlan = await this.plans.findById(command.gymOrgId, command.basePlanId);
    if (basePlan === null || !basePlan.active || basePlan.kind !== 'BASE') {
      throw new InvalidInvitePlanError('Base plan must be an active BASE plan for this gym');
    }

    if (command.addonPlanId !== null) {
      const addonPlan = await this.plans.findById(command.gymOrgId, command.addonPlanId);
      if (
        addonPlan === null ||
        !addonPlan.active ||
        addonPlan.kind !== 'ADDON' ||
        addonPlan.capability !== 'TRAINER_COACHING'
      ) {
        throw new InvalidInvitePlanError(
          'Addon plan must be an active TRAINER_COACHING ADDON for this gym',
        );
      }
    }

    const invitee = await this.clientUsers.findLiveByEmail(command.invitedEmail);
    if (invitee !== null && invitee.lane === 'STAFF') {
      throw new InvalidMembershipInviteeError(
        'Cannot invite a staff account with a membership invite',
      );
    }
    const invitedUserId = invitee !== null && invitee.lane === 'CLIENT' ? invitee.userId : null;

    const now = this.clock.now();
    const expiresAt =
      command.expiresAt ??
      new Date(now.getTime() + DEFAULT_MEMBERSHIP_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    if (expiresAt.getTime() <= now.getTime()) {
      throw new ConflictError('Invite expiry must be in the future');
    }

    const invite = MembershipInvite.create({
      id: toMembershipInviteId(this.ids.generate()),
      gymOrgId: command.gymOrgId,
      invitedEmail: command.invitedEmail,
      invitedUserId,
      inviteeName: command.inviteeName,
      inviteePhone: command.inviteePhone,
      basePlanId: command.basePlanId,
      basePaymentStatus: command.basePaymentStatus,
      addonPlanId: command.addonPlanId,
      addonPaymentStatus: command.addonPaymentStatus,
      expiresAt,
      createdBy: actor.userId,
      now,
    });

    await this.invites.save(invite);

    return toMembershipInviteDto(invite);
  }
}
