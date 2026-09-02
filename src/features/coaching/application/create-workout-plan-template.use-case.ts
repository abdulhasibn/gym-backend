import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { ExerciseCatalogRepository } from '../domain/exercise-catalog.repository';
import { WorkoutPlanTemplate } from '../domain/workout-plan-template.entity';
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

export interface CreateWorkoutPlanTemplateCommand {
  readonly gymOrgId: GymOrgId;
  readonly title: string;
  readonly notes: string | null;
  readonly exercises: readonly PrescribedWorkoutExerciseInput[];
}

export class CreateWorkoutPlanTemplateUseCase {
  constructor(
    private readonly policy: WorkoutTemplatePolicy,
    private readonly catalog: ExerciseCatalogRepository,
    private readonly templates: WorkoutPlanTemplateRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: CreateWorkoutPlanTemplateCommand,
  ): Promise<WorkoutPlanTemplateDto> {
    const trainerId = await this.policy.requireAuthor(actor, command.gymOrgId);
    await assertLiveSeedExercises(this.catalog, command.exercises);
    const now = this.clock.now();
    const template = WorkoutPlanTemplate.create({
      id: toWorkoutPlanTemplateId(this.ids.generate()),
      gymOrgId: command.gymOrgId,
      trainerId,
      title: WorkoutPlanTitle.create(command.title),
      notes: command.notes,
      clonedFromId: null,
      exercises: mapTemplateExercises(this.ids, command.exercises),
      now,
    });
    await this.templates.save(template);
    return toWorkoutPlanTemplateDto(template);
  }
}
