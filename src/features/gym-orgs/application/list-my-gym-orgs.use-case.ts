import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgQueries } from '../domain/gym-org.queries';
import type { GymOrgSummaryDto } from './gym-org.dto';
import { toGymOrgSummaryDto } from './gym-org.dto';

export class ListMyGymOrgsUseCase {
  constructor(private readonly gymOrgQueries: GymOrgQueries) {}

  async execute(actor: AuthenticatedActor): Promise<readonly GymOrgSummaryDto[]> {
    const gymOrgs = await this.gymOrgQueries.listForUser(actor.userId);
    return gymOrgs.map(toGymOrgSummaryDto);
  }
}
