import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { toDietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import { toFoodItemId } from '../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../domain/shared/food-serving-id';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import { toUserId } from '../../../domain/shared/user-id';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import { DietPlan } from '../domain/diet-plan.entity';
import { toDietPlanId } from '../domain/diet-plan-id';
import { toDietPlanMealId } from '../domain/diet-plan-meal-id';
import type { DietPlanRepository } from '../domain/diet-plan.repository';
import { DietPlanTitle } from '../domain/diet-plan-title.value-object';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import { InvalidDietPlanError } from '../domain/invalid-diet-plan.error';
import type { SeedCatalogPort } from '../domain/seed-catalog.port';
import { CoachingAddonRequiredError } from './coaching-addon-required.error';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import { DietAssignPolicy } from './diet-assign.policy';
import { toDietPlanDtoFromEntity, type DietPlanDto } from './coaching.dto';

export interface AssignDietPlanMealItemInput {
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
}

export interface AssignDietPlanMealInput {
  readonly mealSlot: MealSlot;
  readonly items: readonly AssignDietPlanMealItemInput[];
}

export interface AssignDietPlanCommand {
  readonly gymOrgId: GymOrgId;
  readonly clientUserId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly meals: readonly AssignDietPlanMealInput[];
}

export class AssignDietPlanUseCase {
  constructor(
    private readonly policy: DietAssignPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly catalog: SeedCatalogPort,
    private readonly plans: DietPlanRepository,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(actor: AuthenticatedActor, command: AssignDietPlanCommand): Promise<DietPlanDto> {
    const trainerId = await this.policy.requireAssigner(actor, command.gymOrgId);
    const clientUserId = toUserId(command.clientUserId);

    const membership = await this.entitlement.findActiveMembership(clientUserId, command.gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }
    if (actor.roleCode === 'TRAINER' && membership.assignedTrainerId !== trainerId) {
      throw new CoachingForbiddenError('Only the assigned trainer can author this diet plan');
    }

    const now = this.clock.now();
    const today = await this.gymClock.today(command.gymOrgId, now);
    if (!(await this.entitlement.hasInDateCoachingAddon(clientUserId, command.gymOrgId, today))) {
      throw new CoachingAddonRequiredError();
    }

    const meals = [];
    for (const [index, meal] of command.meals.entries()) {
      const items = [];
      for (const item of meal.items) {
        const foodItemId = toFoodItemId(item.foodItemId);
        const servingId = toFoodServingId(item.servingId);
        const exists = await this.catalog.hasLiveSeedServing(foodItemId, servingId);
        if (!exists) {
          throw new NotFoundError('Seed catalog food or serving not found');
        }
        items.push({
          id: toDietPlanMealItemId(this.ids.generate()),
          foodItemId,
          servingId,
          quantity: ServingQuantity.create(item.quantity),
        });
      }
      meals.push({
        id: toDietPlanMealId(this.ids.generate()),
        mealSlot: meal.mealSlot,
        sortOrder: index,
        items,
      });
    }

    if (meals.length === 0) {
      throw new InvalidDietPlanError('Diet plan must include at least one meal');
    }

    const plan = DietPlan.create({
      id: toDietPlanId(this.ids.generate()),
      clientUserId,
      trainerId,
      gymOrgId: command.gymOrgId,
      title: DietPlanTitle.create(command.title),
      notes: command.notes,
      meals,
      now,
    });
    await this.plans.assign(plan);

    return toDietPlanDtoFromEntity(plan, { writable: true, logDate: today.value });
  }
}
