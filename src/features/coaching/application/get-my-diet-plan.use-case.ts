import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { DietPlanQueries } from '../domain/diet-plan.queries';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { PrescribedDiaryQueries } from '../domain/prescribed-diary.queries';
import { DietClientPolicy } from './diet-client.policy';
import { toDietPlanDtoFromSummary, type DietPlanDto } from './coaching.dto';

export class GetMyDietPlanUseCase {
  constructor(
    private readonly policy: DietClientPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly queries: DietPlanQueries,
    private readonly diary: PrescribedDiaryQueries,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<DietPlanDto | null> {
    this.policy.requireClientSelf(actor);

    const membership = await this.entitlement.findActiveMembership(actor.userId, gymOrgId);
    if (membership === null) {
      return null;
    }

    const summary = await this.queries.findActiveByClientAtGym(actor.userId, gymOrgId);
    if (summary === null) {
      return null;
    }

    const today = await this.gymClock.today(gymOrgId, this.clock.now());
    const writable = await this.entitlement.hasInDateCoachingAddon(actor.userId, gymOrgId, today);
    const itemIds = summary.meals.flatMap((meal) => meal.items.map((item) => item.id));
    const logged = await this.diary.findLoggedItemIds(actor.userId, today, itemIds);

    return toDietPlanDtoFromSummary(summary, {
      writable,
      logDate: today.value,
      loggedItemIds: new Set(logged),
    });
  }
}
