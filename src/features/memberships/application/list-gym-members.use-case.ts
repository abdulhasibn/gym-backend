import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { ClientMembershipQueries } from '../domain/client-membership.queries';
import type { MembershipStatus } from '../domain/membership-status';
import type { PlanAdminPolicy } from './plan-admin.policy';
import { toRosterMemberDto, type RosterMemberDto } from './roster.dto';

export interface ListGymMembersCommand {
  readonly gymOrgId: GymOrgId;
  readonly status: MembershipStatus;
  readonly q: string | null;
}

export class ListGymMembersUseCase {
  constructor(
    private readonly policy: PlanAdminPolicy,
    private readonly members: ClientMembershipQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: ListGymMembersCommand,
  ): Promise<readonly RosterMemberDto[]> {
    await this.policy.requirePlanAccess(actor, command.gymOrgId);

    const rows = await this.members.listForGym({
      gymOrgId: command.gymOrgId,
      status: command.status,
      q: command.q,
    });

    return rows.map(toRosterMemberDto);
  }
}
