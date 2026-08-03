import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { GymOrgCreationForbiddenError } from './gym-org-creation-forbidden.error';

export class CreateGymOrgPolicy {
  requireAuthorized(actor: AuthenticatedActor): void {
    if (actor.roleCode !== 'STAFF_UNASSIGNED' && actor.roleCode !== 'ADMIN') {
      throw new GymOrgCreationForbiddenError();
    }
  }
}
