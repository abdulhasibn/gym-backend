import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { ClientMembershipRepository } from '../domain/client-membership.repository';
import type { MembershipId } from '../domain/membership-id';
import type { OffboardMembershipPort } from '../domain/offboard-membership.port';
import type { PlanAdminPolicy } from './plan-admin.policy';
import { toMembershipMutationDto, type MembershipMutationDto } from './roster.dto';

export interface OffboardClientCommand {
  readonly gymOrgId: GymOrgId;
  readonly membershipId: MembershipId;
}

export class OffboardClientUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly memberships: ClientMembershipRepository,
    private readonly offboardPort: OffboardMembershipPort,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: OffboardClientCommand,
  ): Promise<MembershipMutationDto> {
    await this.policy.requirePlanAccess(actor, command.gymOrgId);

    const membership = await this.memberships.findById(command.gymOrgId, command.membershipId);
    if (membership === null || !membership.isActive) {
      throw new NotFoundError('Active membership not found');
    }

    const offboarded = await this.offboardPort.offboard(
      command.gymOrgId,
      command.membershipId,
      this.clock.now(),
    );

    return toMembershipMutationDto(offboarded);
  }
}
