import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import { DietPlanTemplate } from '../domain/diet-plan-template.entity';
import { toDietPlanTemplateId } from '../domain/diet-plan-template-id';
import type { DietPlanTemplateRepository } from '../domain/diet-plan-template.repository';
import { copyDietPlanTitle } from './copy-diet-plan-title';
import { toDietPlanTemplateDto, type DietPlanTemplateDto } from './coaching.dto';
import type { DietTemplatePolicy } from './diet-template.policy';
import { toDietPlanTemplateMealId } from '../domain/diet-plan-template-meal-id';
import { toDietPlanTemplateMealItemId } from '../domain/diet-plan-template-meal-item-id';

export class DuplicateDietPlanTemplateUseCase {
  constructor(
    private readonly policy: DietTemplatePolicy,
    private readonly templates: DietPlanTemplateRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    templateId: string,
  ): Promise<DietPlanTemplateDto> {
    const trainerId = await this.policy.requireAuthor(actor, gymOrgId);
    const source = await this.templates.findById(toDietPlanTemplateId(templateId), gymOrgId);
    if (source === null) {
      throw new NotFoundError('Diet plan template not found');
    }
    this.policy.requireOwnerOrAdmin(actor, trainerId, source.trainerId);

    const now = this.clock.now();
    const duplicate = DietPlanTemplate.create({
      id: toDietPlanTemplateId(this.ids.generate()),
      gymOrgId,
      trainerId,
      title: copyDietPlanTitle(source.title),
      notes: source.notes,
      clonedFromId: source.id,
      meals: source.meals.map((meal, index) => ({
        id: toDietPlanTemplateMealId(this.ids.generate()),
        mealSlot: meal.mealSlot,
        sortOrder: index,
        items: meal.items.map((item) => ({
          id: toDietPlanTemplateMealItemId(this.ids.generate()),
          foodItemId: item.foodItemId,
          servingId: item.servingId,
          quantity: item.quantity,
        })),
      })),
      now,
    });
    await this.templates.save(duplicate);
    return toDietPlanTemplateDto(duplicate);
  }
}
