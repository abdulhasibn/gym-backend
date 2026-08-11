import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { ClientMembershipQueries } from '../domain/client-membership.queries';
import type { MembershipStatus } from '../domain/membership-status';
import { toRosterMemberDto, type RosterMemberDto } from './roster.dto';
import type { TrainerRosterPolicy } from './trainer-roster.policy';

export interface ListMyAssignedMembersCommand {
  readonly gymOrgId: GymOrgId;
  readonly status: MembershipStatus | null;
  readonly q: string | null;
}

export class ListMyAssignedMembersUseCase {
  constructor(
    private readonly policy: TrainerRosterPolicy,
    private readonly members: ClientMembershipQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: ListMyAssignedMembersCommand,
  ): Promise<readonly RosterMemberDto[]> {
    const assignedTrainerId = await this.policy.requireAssignedRosterAccess(
      actor,
      command.gymOrgId,
    );

    const rows = await this.members.listAssigned({
      gymOrgId: command.gymOrgId,
      assignedTrainerId,
      status: command.status,
      q: command.q,
    });

    return rows.map(toRosterMemberDto);
  }
}
