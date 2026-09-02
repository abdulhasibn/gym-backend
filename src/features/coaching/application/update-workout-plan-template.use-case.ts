import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { ExerciseCatalogRepository } from '../domain/exercise-catalog.repository';
import { toWorkoutPlanTemplateId } from '../domain/workout-plan-template-id';
import type { WorkoutPlanTemplateRepository } from '../domain/workout-plan-template.repository';
import { WorkoutPlanTitle } from '../domain/workout-plan-title.value-object';
import {
  assertLiveSeedExercises,
  type PrescribedWorkoutExerciseInput,
} from './assert-live-seed-exercises';
import { toWorkoutPlanTemplateDto, type WorkoutPlanTemplateDto } from './coaching.dto';
import { mapTemplateExercises } from './map-template-exercises';
import type { WorkoutTemplatePolicy } from './workout-template.policy';

export interface UpdateWorkoutPlanTemplateCommand {
  readonly gymOrgId: GymOrgId;
  readonly templateId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly exercises: readonly PrescribedWorkoutExerciseInput[];
}

export class UpdateWorkoutPlanTemplateUseCase {
  constructor(
    private readonly policy: WorkoutTemplatePolicy,
    private readonly catalog: ExerciseCatalogRepository,
    private readonly templates: WorkoutPlanTemplateRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: UpdateWorkoutPlanTemplateCommand,
  ): Promise<WorkoutPlanTemplateDto> {
    const trainerId = await this.policy.requireAuthor(actor, command.gymOrgId);
    const template = await this.templates.findById(
      toWorkoutPlanTemplateId(command.templateId),
      command.gymOrgId,
    );
    if (template === null) {
      throw new NotFoundError('Workout plan template not found');
    }
    this.policy.requireOwnerOrAdmin(actor, trainerId, template.trainerId);
    await assertLiveSeedExercises(this.catalog, command.exercises);
    template.replaceDefinition({
      title: WorkoutPlanTitle.create(command.title),
      notes: command.notes,
      exercises: mapTemplateExercises(this.ids, command.exercises),
      now: this.clock.now(),
    });
    await this.templates.replace(template);
    return toWorkoutPlanTemplateDto(template);
  }
}
