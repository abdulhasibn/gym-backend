import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MembershipPlanId } from '../domain/membership-plan-id';
import type { MembershipPlanQueries } from '../domain/membership-plan.queries';
import { toMembershipPlanDtoFromSummary, type MembershipPlanDto } from './membership-plan.dto';
import type { PlanAdminPolicy } from './plan-admin.policy';

export class GetMembershipPlanUseCase {
  constructor(
    private readonly queries: MembershipPlanQueries,
    private readonly policy: PlanAdminPolicy,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    planId: MembershipPlanId,
  ): Promise<MembershipPlanDto> {
    await this.policy.requirePlanAccess(actor, gymOrgId);

    const summary = await this.queries.get(gymOrgId, planId);
    if (summary === null) {
      throw new NotFoundError('Membership plan not found');
    }

    return toMembershipPlanDtoFromSummary(summary);
  }
}
