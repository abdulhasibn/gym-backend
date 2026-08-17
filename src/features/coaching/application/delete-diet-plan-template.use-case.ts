import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import { toDietPlanTemplateId } from '../domain/diet-plan-template-id';
import type { DietPlanTemplateRepository } from '../domain/diet-plan-template.repository';
import type { DietTemplatePolicy } from './diet-template.policy';

export class DeleteDietPlanTemplateUseCase {
  constructor(
    private readonly policy: DietTemplatePolicy,
    private readonly templates: DietPlanTemplateRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId, templateId: string): Promise<void> {
    const trainerId = await this.policy.requireAuthor(actor, gymOrgId);
    const template = await this.templates.findById(toDietPlanTemplateId(templateId), gymOrgId);
    if (template === null) {
      throw new NotFoundError('Diet plan template not found');
    }
    this.policy.requireOwnerOrAdmin(actor, trainerId, template.trainerId);
    template.softDelete(this.clock.now());
    await this.templates.replace(template);
  }
}
