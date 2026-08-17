import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { toDietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { DietPlanRepository } from '../domain/diet-plan.repository';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { LogPrescribedFood } from '../domain/log-prescribed-food.port';
import { CoachingAddonRequiredError } from './coaching-addon-required.error';
import { DietClientPolicy } from './diet-client.policy';

export class UncompleteDietItemUseCase {
  constructor(
    private readonly policy: DietClientPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly plans: DietPlanRepository,
    private readonly logPrescribed: LogPrescribedFood,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId, itemId: string): Promise<void> {
    this.policy.requireClientSelf(actor);

    const membership = await this.entitlement.findActiveMembership(actor.userId, gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }

    const today = await this.gymClock.today(gymOrgId, this.clock.now());
    if (!(await this.entitlement.hasInDateCoachingAddon(actor.userId, gymOrgId, today))) {
      throw new CoachingAddonRequiredError(
        'Diet plan is read-only after the coaching addon expires',
      );
    }

    const plan = await this.plans.findActiveByClientAtGym(actor.userId, gymOrgId);
    if (plan === null || !plan.isActive) {
      throw new NotFoundError('Active diet plan not found');
    }

    const found = plan.findItem(toDietPlanMealItemId(itemId));
    if (found === null) {
      throw new NotFoundError('Diet plan item not found');
    }

    await this.logPrescribed.unlog({
      clientUserId: actor.userId,
      logDate: today,
      dietPlanMealItemId: found.item.id,
    });
  }
}
