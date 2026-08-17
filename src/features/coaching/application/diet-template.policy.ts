import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { DietAssignPolicy } from './diet-assign.policy';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import type { TrainerProfileId } from '../domain/trainer-profile-id';

export class DietTemplatePolicy {
  constructor(private readonly assign: DietAssignPolicy) {}

  async requireAuthor(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<TrainerProfileId> {
    return this.assign.requireAssigner(actor, gymOrgId);
  }

  requireOwnerOrAdmin(
    actor: AuthenticatedActor,
    actorTrainerId: TrainerProfileId,
    ownerTrainerId: TrainerProfileId,
  ): void {
    if (actor.roleCode === 'ADMIN') {
      return;
    }
    if (actorTrainerId !== ownerTrainerId) {
      throw new CoachingForbiddenError('Only the template owner can do this');
    }
  }
}
