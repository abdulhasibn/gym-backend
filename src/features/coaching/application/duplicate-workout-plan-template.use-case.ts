import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import { WorkoutPlanTemplate } from '../domain/workout-plan-template.entity';
import { toWorkoutPlanTemplateExerciseId } from '../domain/workout-plan-template-exercise-id';
import { toWorkoutPlanTemplateId } from '../domain/workout-plan-template-id';
import type { WorkoutPlanTemplateRepository } from '../domain/workout-plan-template.repository';
import { copyWorkoutPlanTitle } from './copy-workout-plan-title';
import { toWorkoutPlanTemplateDto, type WorkoutPlanTemplateDto } from './coaching.dto';
import type { WorkoutTemplatePolicy } from './workout-template.policy';

export class DuplicateWorkoutPlanTemplateUseCase {
  constructor(
    private readonly policy: WorkoutTemplatePolicy,
    private readonly templates: WorkoutPlanTemplateRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    templateId: string,
  ): Promise<WorkoutPlanTemplateDto> {
    const trainerId = await this.policy.requireAuthor(actor, gymOrgId);
    const source = await this.templates.findById(toWorkoutPlanTemplateId(templateId), gymOrgId);
    if (source === null) {
      throw new NotFoundError('Workout plan template not found');
    }

    const now = this.clock.now();
    const duplicate = WorkoutPlanTemplate.create({
      id: toWorkoutPlanTemplateId(this.ids.generate()),
      gymOrgId,
      trainerId,
      title: copyWorkoutPlanTitle(source.title),
      notes: source.notes,
      clonedFromId: source.id,
      exercises: source.exercises.map((exercise, index) => ({
        id: toWorkoutPlanTemplateExerciseId(this.ids.generate()),
        exerciseItemId: exercise.exerciseItemId,
        sets: exercise.sets,
        reps: exercise.reps,
        notes: exercise.notes,
        sortOrder: index,
      })),
      now,
    });
    await this.templates.save(duplicate);
    return toWorkoutPlanTemplateDto(duplicate);
  }
}
