import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toWorkoutPlanTemplateId } from '../domain/workout-plan-template-id';
import type { WorkoutPlanTemplateQueries } from '../domain/workout-plan-template.queries';
import {
  toWorkoutPlanTemplateDtoFromSummary,
  type WorkoutPlanTemplateDto,
} from './coaching.dto';
import type { WorkoutTemplatePolicy } from './workout-template.policy';

export class GetWorkoutPlanTemplateUseCase {
  constructor(
    private readonly policy: WorkoutTemplatePolicy,
    private readonly queries: WorkoutPlanTemplateQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    templateId: string,
  ): Promise<WorkoutPlanTemplateDto> {
    await this.policy.requireAuthor(actor, gymOrgId);
    const summary = await this.queries.findById(toWorkoutPlanTemplateId(templateId), gymOrgId);
    if (summary === null) {
      throw new NotFoundError('Workout plan template not found');
    }
    return toWorkoutPlanTemplateDtoFromSummary(summary);
  }
}
