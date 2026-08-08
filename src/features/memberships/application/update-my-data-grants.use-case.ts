import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { ClientMembershipRepository } from '../domain/client-membership.repository';
import type { DataGrantRepository } from '../domain/data-grant.repository';
import type { GrantChecklist } from '../domain/grant-checklist';
import type { DataGrantsDto } from './data-grants.dto';
import { toDataGrantsDto } from './data-grants.dto';
import { DataGrantForbiddenError } from './data-grant-forbidden.error';

export class UpdateMyDataGrantsUseCase {
  constructor(
    private readonly memberships: ClientMembershipRepository,
    private readonly grants: DataGrantRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    checklist: GrantChecklist,
  ): Promise<DataGrantsDto> {
    if (actor.lane !== 'CLIENT') {
      throw new DataGrantForbiddenError('Only client accounts manage data grants');
    }

    const membership = await this.memberships.findActiveByClientAtGym(actor.userId, gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found at this gym');
    }

    const snapshot = await this.grants.replaceOptionalGrants(
      actor.userId,
      gymOrgId,
      checklist,
      this.clock.now(),
    );

    return toDataGrantsDto(snapshot);
  }
}
