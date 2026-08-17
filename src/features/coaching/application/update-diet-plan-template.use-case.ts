import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import { toDietPlanTemplateId } from '../domain/diet-plan-template-id';
import type { DietPlanTemplateRepository } from '../domain/diet-plan-template.repository';
import { DietPlanTitle } from '../domain/diet-plan-title.value-object';
import type { SeedCatalogPort } from '../domain/seed-catalog.port';
import { assertLiveSeedMeals, type PrescribedMealInput } from './assert-live-seed-meals';
import { toDietPlanTemplateDto, type DietPlanTemplateDto } from './coaching.dto';
import type { DietTemplatePolicy } from './diet-template.policy';
import { mapTemplateMeals } from './map-template-meals';

export interface UpdateDietPlanTemplateCommand {
  readonly gymOrgId: GymOrgId;
  readonly templateId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly meals: readonly PrescribedMealInput[];
}

export class UpdateDietPlanTemplateUseCase {
  constructor(
    private readonly policy: DietTemplatePolicy,
    private readonly catalog: SeedCatalogPort,
    private readonly templates: DietPlanTemplateRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: UpdateDietPlanTemplateCommand,
  ): Promise<DietPlanTemplateDto> {
    const trainerId = await this.policy.requireAuthor(actor, command.gymOrgId);
    const template = await this.templates.findById(
      toDietPlanTemplateId(command.templateId),
      command.gymOrgId,
    );
    if (template === null) {
      throw new NotFoundError('Diet plan template not found');
    }
    this.policy.requireOwnerOrAdmin(actor, trainerId, template.trainerId);
    await assertLiveSeedMeals(this.catalog, command.meals);
    template.replaceDefinition({
      title: DietPlanTitle.create(command.title),
      notes: command.notes,
      meals: mapTemplateMeals(this.ids, command.meals),
      now: this.clock.now(),
    });
    await this.templates.replace(template);
    return toDietPlanTemplateDto(template);
  }
}
