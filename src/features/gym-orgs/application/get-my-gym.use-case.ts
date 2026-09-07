import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgQueries } from '../domain/gym-org.queries';
import { GymOrgReadForbiddenError } from './gym-org-read-forbidden.error';
import type { GymOrgDto } from './gym-org.dto';

export class GetMyGymUseCase {
  constructor(private readonly gymOrgQueries: GymOrgQueries) {}

  async execute(actor: AuthenticatedActor): Promise<GymOrgDto & { isOwner: boolean }> {
    if (actor.lane !== 'CLIENT' || actor.roleCode !== 'CLIENT') {
      throw new GymOrgReadForbiddenError();
    }

    const detail = await this.gymOrgQueries.getCurrentForClient(actor.userId);
    if (detail === null) {
      throw new NotFoundError('Active membership gym not found');
    }

    return {
      id: detail.id,
      name: detail.name,
      address: detail.address,
      contactPhone: detail.contactPhone,
      contactEmail: detail.contactEmail,
      logoUrl: detail.logoUrl,
      timezone: detail.timezone,
      ownerUserId: detail.ownerUserId,
      isOwner: detail.isOwner,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  }
}
