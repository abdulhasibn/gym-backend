import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { LiveGymAdminPort, LiveTrainerProfilePort } from '../domain/live-staff.port';
import type { TrainerProfileId } from '../domain/trainer-profile-id';
import { CoachingForbiddenError } from './coaching-forbidden.error';

export class DietAssignPolicy {
  constructor(
    private readonly admins: LiveGymAdminPort,
    private readonly trainers: LiveTrainerProfilePort,
  ) {}

  async requireAssigner(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<TrainerProfileId> {
    if (actor.lane !== 'STAFF') {
      throw new CoachingForbiddenError();
    }

    if (actor.roleCode !== 'ADMIN' && actor.roleCode !== 'TRAINER') {
      throw new CoachingForbiddenError();
    }

    if (actor.roleCode === 'ADMIN') {
      if (!(await this.admins.isLiveAdmin(actor.userId, gymOrgId))) {
        throw new CoachingForbiddenError();
      }
    }

    const profileId = await this.trainers.findLiveProfileId(actor.userId, gymOrgId);
    if (profileId === null) {
      throw new CoachingForbiddenError('Trainer profile is required at this gym');
    }

    return profileId;
  }

  async requireStaffReader(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
  ): Promise<TrainerProfileId> {
    return this.requireAssigner(actor, gymOrgId);
  }
}
