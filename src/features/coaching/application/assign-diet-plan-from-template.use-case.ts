import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import { DietPlan } from '../domain/diet-plan.entity';
import { toDietPlanId } from '../domain/diet-plan-id';
import type { DietPlanRepository } from '../domain/diet-plan.repository';
import { toDietPlanTemplateId } from '../domain/diet-plan-template-id';
import type { DietPlanTemplateRepository } from '../domain/diet-plan-template.repository';
import { DietPlanTitle } from '../domain/diet-plan-title.value-object';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { SeedCatalogPort } from '../domain/seed-catalog.port';
import { CoachingAddonRequiredError } from './coaching-addon-required.error';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import { toDietPlanDtoFromEntity, type DietPlanDto } from './coaching.dto';
import type { DietAssignPolicy } from './diet-assign.policy';
import type { DietTemplatePolicy } from './diet-template.policy';
import { copyTemplateMealsToPlan } from './map-template-meals';
import { assertLiveSeedMeals } from './assert-live-seed-meals';

export interface AssignDietPlanFromTemplateCommand {
  readonly gymOrgId: GymOrgId;
  readonly clientUserId: string;
  readonly templateId: string;
  readonly title?: string;
  readonly notes?: string | null;
}

export class AssignDietPlanFromTemplateUseCase {
  constructor(
    private readonly assignPolicy: DietAssignPolicy,
    private readonly templatePolicy: DietTemplatePolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly catalog: SeedCatalogPort,
    private readonly templates: DietPlanTemplateRepository,
    private readonly plans: DietPlanRepository,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: AssignDietPlanFromTemplateCommand,
  ): Promise<DietPlanDto> {
    const trainerId = await this.assignPolicy.requireAssigner(actor, command.gymOrgId);
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

    const template = await this.templates.findById(
      toDietPlanTemplateId(command.templateId),
      command.gymOrgId,
    );
    if (template === null) {
      throw new NotFoundError('Diet plan template not found');
    }
    this.templatePolicy.requireOwnerOrAdmin(actor, trainerId, template.trainerId);

    await assertLiveSeedMeals(
      this.catalog,
      template.meals.map((meal) => ({
        mealSlot: meal.mealSlot,
        items: meal.items.map((item) => ({
          foodItemId: item.foodItemId,
          servingId: item.servingId,
          quantity: item.quantity.value,
        })),
      })),
    );

    const plan = DietPlan.create({
      id: toDietPlanId(this.ids.generate()),
      clientUserId,
      trainerId,
      gymOrgId: command.gymOrgId,
      title: command.title === undefined ? template.title : DietPlanTitle.create(command.title),
      notes: command.notes === undefined ? template.notes : command.notes,
      meals: copyTemplateMealsToPlan(this.ids, template.meals),
      clonedFromTemplateId: template.id,
      now,
    });
    await this.plans.assign(plan);

    return toDietPlanDtoFromEntity(plan, { writable: true, logDate: today.value });
  }
}
