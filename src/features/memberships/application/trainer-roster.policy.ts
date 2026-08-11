import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { LiveTrainerProfilePort } from '../domain/live-trainer-profile.port';
import type { TrainerProfileId } from '../domain/trainer-profile-id';
import { RosterForbiddenError } from './roster-forbidden.error';

export class TrainerRosterPolicy {
  constructor(private readonly trainers: LiveTrainerProfilePort) {}

  async requireAssignedRosterAccess(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
  ): Promise<TrainerProfileId> {
    if (actor.lane !== 'STAFF') {
      throw new RosterForbiddenError();
    }

    const profileId = await this.trainers.findLiveProfileId(actor.userId, gymOrgId);
    if (profileId === null) {
      throw new RosterForbiddenError();
    }

    return profileId;
  }
}
