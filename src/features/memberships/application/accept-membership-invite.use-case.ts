import { ConflictError } from '../../../domain/errors/conflict.error';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Clock } from '../../../shared/clock/clock';
import type { GrantChecklist } from '../domain/grant-checklist';
import { MembershipInviteInvalidTransitionError } from '../domain/membership-invite-invalid-transition.error';
import type { MembershipInviteId } from '../domain/membership-invite-id';
import type { MembershipInviteRepository } from '../domain/membership-invite.repository';
import { REQUIRED_PROFILE_ATTRIBUTES } from '../domain/profile-attribute';
import { ActiveMembershipConflictError } from './active-membership-conflict.error';
import type { AcceptMembershipInviteResultDto } from './membership-invite.dto';
import { toMembershipInviteDto } from './membership-invite.dto';
import { MembershipInviteExpiredError } from './membership-invite-expired.error';
import { MembershipInviteForbiddenError } from './membership-invite-forbidden.error';

export class AcceptMembershipInviteUseCase {
  constructor(
    private readonly invites: MembershipInviteRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    inviteId: MembershipInviteId,
    checklist: GrantChecklist,
  ): Promise<AcceptMembershipInviteResultDto> {
    if (actor.lane !== 'CLIENT') {
      throw new MembershipInviteForbiddenError(
        'Only client accounts can accept membership invites',
      );
    }

    const invite = await this.invites.findById(inviteId);
    if (invite === null) {
      throw new NotFoundError('Membership invite not found');
    }

    const now = this.clock.now();

    if (invite.status === 'PENDING' && invite.isExpiredAt(now)) {
      invite.markExpired(now);
      await this.invites.save(invite);
      throw new MembershipInviteExpiredError();
    }

    try {
      invite.assertAcceptableBy(actor.userId, actor.email, now);
    } catch (error) {
      if (error instanceof MembershipInviteInvalidTransitionError) {
        throw new MembershipInviteForbiddenError('Membership invite cannot be accepted');
      }
      throw error;
    }

    try {
      const accepted = await this.invites.accept(inviteId, actor.userId, checklist);
      const profileAttributes = [
        ...REQUIRED_PROFILE_ATTRIBUTES,
        ...checklist.optionalProfileAttributes,
      ];

      return {
        membershipInvite: toMembershipInviteDto(accepted),
        membershipId: accepted.acceptedMembershipId,
        grants: {
          profileAttributes: [...new Set(profileAttributes)],
          classGrants: [...checklist.optionalClassGrants],
        },
      };
    } catch (error) {
      if (error instanceof ConflictError) {
        const message = error.message.toLowerCase();
        if (message.includes('active membership')) {
          throw new ActiveMembershipConflictError(error.message);
        }
        if (message.includes('expired')) {
          throw new MembershipInviteExpiredError(error.message);
        }
        if (
          message.includes('not addressed') ||
          message.includes('only client') ||
          message.includes('not pending')
        ) {
          throw new MembershipInviteForbiddenError(error.message);
        }
      }
      throw error;
    }
  }
}
