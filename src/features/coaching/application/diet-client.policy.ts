import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CoachingForbiddenError } from './coaching-forbidden.error';

export class DietClientPolicy {
  requireClientSelf(actor: AuthenticatedActor): void {
    if (actor.roleCode !== 'CLIENT' || actor.lane !== 'CLIENT') {
      throw new CoachingForbiddenError();
    }
  }
}
