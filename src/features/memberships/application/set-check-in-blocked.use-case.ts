import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { ClientMembershipRepository } from '../domain/client-membership.repository';
import type { MembershipId } from '../domain/membership-id';
import type { PlanAdminPolicy } from './plan-admin.policy';
import { toMembershipMutationDto, type MembershipMutationDto } from './roster.dto';

export interface SetCheckInBlockedCommand {
  readonly gymOrgId: GymOrgId;
  readonly membershipId: MembershipId;
  readonly blocked: boolean;
}

export class SetCheckInBlockedUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly memberships: ClientMembershipRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: SetCheckInBlockedCommand,
  ): Promise<MembershipMutationDto> {
    await this.policy.requirePlanAccess(actor, command.gymOrgId);

    const membership = await this.memberships.findById(command.gymOrgId, command.membershipId);
    if (membership === null || !membership.isActive) {
      throw new NotFoundError('Active membership not found');
    }

    const now = this.clock.now();
    if (command.blocked) {
      membership.blockCheckIn(now);
    } else {
      membership.unblockCheckIn(now);
    }
    await this.memberships.save(membership);

    return toMembershipMutationDto(membership);
  }
}
