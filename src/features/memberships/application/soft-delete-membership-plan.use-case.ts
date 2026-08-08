import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { MembershipPlanId } from '../domain/membership-plan-id';
import type { MembershipPlanRepository } from '../domain/membership-plan.repository';
import type { PlanAdminPolicy } from './plan-admin.policy';

export class SoftDeleteMembershipPlanUseCase {
  constructor(
    private readonly plans: MembershipPlanRepository,
    private readonly policy: PlanAdminPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    planId: MembershipPlanId,
  ): Promise<void> {
    await this.policy.requirePlanAccess(actor, gymOrgId);

    const plan = await this.plans.findById(gymOrgId, planId);
    if (plan === null) {
      throw new NotFoundError('Membership plan not found');
    }

    plan.softDelete(this.clock.now());
    await this.plans.save(plan);
  }
}
