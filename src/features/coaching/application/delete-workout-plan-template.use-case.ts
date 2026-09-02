import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import { toWorkoutPlanTemplateId } from '../domain/workout-plan-template-id';
import type { WorkoutPlanTemplateRepository } from '../domain/workout-plan-template.repository';
import type { WorkoutTemplatePolicy } from './workout-template.policy';

export class DeleteWorkoutPlanTemplateUseCase {
  constructor(
    private readonly policy: WorkoutTemplatePolicy,
    private readonly templates: WorkoutPlanTemplateRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId, templateId: string): Promise<void> {
    const trainerId = await this.policy.requireAuthor(actor, gymOrgId);
    const template = await this.templates.findById(toWorkoutPlanTemplateId(templateId), gymOrgId);
    if (template === null) {
      throw new NotFoundError('Workout plan template not found');
    }
    this.policy.requireOwnerOrAdmin(actor, trainerId, template.trainerId);
    template.softDelete(this.clock.now());
    await this.templates.replace(template);
  }
}
