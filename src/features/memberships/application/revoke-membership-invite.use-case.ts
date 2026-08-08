import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { MembershipInviteId } from '../domain/membership-invite-id';
import type { MembershipInviteRepository } from '../domain/membership-invite.repository';
import type { MembershipInviteDto } from './membership-invite.dto';
import { toMembershipInviteDto } from './membership-invite.dto';
import type { PlanAdminPolicy } from './plan-admin.policy';

export class RevokeMembershipInviteUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly invites: MembershipInviteRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    inviteId: MembershipInviteId,
  ): Promise<MembershipInviteDto> {
    await this.policy.requirePlanAccess(actor, gymOrgId);

    const invite = await this.invites.findById(gymOrgId, inviteId);
    if (invite === null) {
      throw new NotFoundError('Membership invite not found');
    }

    const now = this.clock.now();
    invite.revoke(now);
    await this.invites.save(invite);

    return toMembershipInviteDto(invite);
  }
}
