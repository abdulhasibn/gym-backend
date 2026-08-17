import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { DietPlanTemplateQueries } from '../domain/diet-plan-template.queries';
import { toDietPlanTemplateDtoFromSummary, type DietPlanTemplateDto } from './coaching.dto';
import type { DietTemplatePolicy } from './diet-template.policy';

export class ListDietPlanTemplatesUseCase {
  constructor(
    private readonly policy: DietTemplatePolicy,
    private readonly queries: DietPlanTemplateQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
  ): Promise<Page<DietPlanTemplateDto>> {
    const trainerId = await this.policy.requireAuthor(actor, gymOrgId);
    const result = await this.queries.list(
      {
        gymOrgId,
        trainerId: actor.roleCode === 'ADMIN' ? undefined : trainerId,
      },
      page,
    );
    return {
      items: result.items.map(toDietPlanTemplateDtoFromSummary),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
