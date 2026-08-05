import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Clock } from '../../../shared/clock/clock';
import type { StaffInviteId } from '../domain/staff-invite-id';
import type { StaffInviteRepository } from '../domain/staff-invite.repository';
import type { GymOrgAdminPolicy } from './gym-org-admin.policy';
import type { StaffInviteDto } from './gym-org.dto';
import { toStaffInviteDto } from './staff-invite.dto';

export class RevokeStaffInviteUseCase {
  constructor(
    private readonly policy: GymOrgAdminPolicy,
    private readonly staffInvites: StaffInviteRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, inviteId: StaffInviteId): Promise<StaffInviteDto> {
    const invite = await this.staffInvites.findById(inviteId);
    if (invite === null) {
      throw new NotFoundError('Staff invite not found');
    }

    await this.policy.requireStaffInvite(actor, invite.gymOrgId);

    const now = this.clock.now();
    invite.revoke(now);
    await this.staffInvites.save(invite);

    return toStaffInviteDto(invite);
  }
}
