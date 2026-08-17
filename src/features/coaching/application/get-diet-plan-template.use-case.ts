import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toDietPlanTemplateId } from '../domain/diet-plan-template-id';
import type { DietPlanTemplateQueries } from '../domain/diet-plan-template.queries';
import { toDietPlanTemplateDtoFromSummary, type DietPlanTemplateDto } from './coaching.dto';
import type { DietTemplatePolicy } from './diet-template.policy';

export class GetDietPlanTemplateUseCase {
  constructor(
    private readonly policy: DietTemplatePolicy,
    private readonly queries: DietPlanTemplateQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    templateId: string,
  ): Promise<DietPlanTemplateDto> {
    const trainerId = await this.policy.requireAuthor(actor, gymOrgId);
    const summary = await this.queries.findById(toDietPlanTemplateId(templateId), gymOrgId);
    if (summary === null) {
      throw new NotFoundError('Diet plan template not found');
    }
    this.policy.requireOwnerOrAdmin(actor, trainerId, summary.trainerId);
    return toDietPlanTemplateDtoFromSummary(summary);
  }
}
