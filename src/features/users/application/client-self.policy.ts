import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { UsersForbiddenError } from './users-forbidden.error';

export class ClientSelfPolicy {
  requireClientSelf(actor: AuthenticatedActor): void {
    if (actor.roleCode !== 'CLIENT' || actor.lane !== 'CLIENT') {
      throw new UsersForbiddenError();
    }
  }
}
