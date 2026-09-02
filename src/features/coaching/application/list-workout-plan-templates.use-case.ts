import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { WorkoutPlanTemplateQueries } from '../domain/workout-plan-template.queries';
import {
  toWorkoutPlanTemplateDtoFromSummary,
  type WorkoutPlanTemplateDto,
} from './coaching.dto';
import type { WorkoutTemplatePolicy } from './workout-template.policy';

export class ListWorkoutPlanTemplatesUseCase {
  constructor(
    private readonly policy: WorkoutTemplatePolicy,
    private readonly queries: WorkoutPlanTemplateQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
  ): Promise<Page<WorkoutPlanTemplateDto>> {
    await this.policy.requireAuthor(actor, gymOrgId);
    const result = await this.queries.list({ gymOrgId }, page);
    return {
      items: result.items.map(toWorkoutPlanTemplateDtoFromSummary),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
