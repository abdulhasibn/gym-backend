import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { DataGrantQueries } from '../domain/data-grant.queries';
import type { DataGrantsDto } from './data-grants.dto';
import { toDataGrantsDto } from './data-grants.dto';
import { DataGrantForbiddenError } from './data-grant-forbidden.error';

export class GetMyDataGrantsUseCase {
  constructor(private readonly grantQueries: DataGrantQueries) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<DataGrantsDto> {
    if (actor.lane !== 'CLIENT') {
      throw new DataGrantForbiddenError('Only client accounts manage data grants');
    }

    const snapshot = await this.grantQueries.listForActiveMembership(actor.userId, gymOrgId);
    if (snapshot === null) {
      throw new NotFoundError('Active membership not found at this gym');
    }

    return toDataGrantsDto(snapshot);
  }
}
