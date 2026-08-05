import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../domain/gym-org-id';
import type { GymOrgQueries } from '../domain/gym-org.queries';
import type { GymOrgDto } from './gym-org.dto';

export class GetGymOrgUseCase {
  constructor(private readonly gymOrgQueries: GymOrgQueries) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<GymOrgDto & { isOwner: boolean }> {
    const detail = await this.gymOrgQueries.getForUser(actor.userId, gymOrgId);
    if (detail === null) {
      throw new NotFoundError('Gym organization not found');
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
