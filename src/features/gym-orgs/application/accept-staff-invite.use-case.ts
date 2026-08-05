import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Clock } from '../../../shared/clock/clock';
import { StaffInviteInvalidTransitionError } from '../domain/staff-invite-invalid-transition.error';
import type { StaffInviteId } from '../domain/staff-invite-id';
import type { StaffInviteRepository } from '../domain/staff-invite.repository';
import type { StaffInviteDto } from './gym-org.dto';
import { StaffInviteExpiredError } from './staff-invite-expired.error';
import { StaffInviteForbiddenError } from './staff-invite-forbidden.error';
import { toStaffInviteDto } from './staff-invite.dto';

export class AcceptStaffInviteUseCase {
  constructor(
    private readonly staffInvites: StaffInviteRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, inviteId: StaffInviteId): Promise<StaffInviteDto> {
    if (actor.lane !== 'STAFF') {
      throw new StaffInviteForbiddenError('Only staff accounts can accept staff invites');
    }

    const invite = await this.staffInvites.findById(inviteId);
    if (invite === null) {
      throw new NotFoundError('Staff invite not found');
    }

    const now = this.clock.now();

    if (invite.status === 'PENDING' && invite.isExpiredAt(now)) {
      invite.markExpired(now);
      await this.staffInvites.save(invite);
      throw new StaffInviteExpiredError();
    }

    if (invite.invitedUserId !== actor.userId) {
      throw new StaffInviteForbiddenError('This invite is not addressed to you');
    }

    try {
      invite.assertAcceptableBy(actor.userId, now);
    } catch (error) {
      if (error instanceof StaffInviteInvalidTransitionError) {
        throw new StaffInviteForbiddenError('Staff invite cannot be accepted');
      }
      throw error;
    }

    const accepted = await this.staffInvites.accept(inviteId, actor.userId);
    return toStaffInviteDto(accepted);
  }
}
