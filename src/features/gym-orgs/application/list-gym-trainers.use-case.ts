import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { GymOrgId } from '../domain/gym-org-id';
import type { TrainerProfileQueries } from '../domain/trainer-profile.queries';
import type { GymOrgAdminPolicy } from './gym-org-admin.policy';
import type { GymTrainerDto } from './gym-org.dto';
import { toGymTrainerDto } from './gym-org.dto';

export class ListGymTrainersUseCase {
  constructor(
    private readonly policy: GymOrgAdminPolicy,
    private readonly trainers: TrainerProfileQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
  ): Promise<Page<GymTrainerDto>> {
    await this.policy.requireAdmin(actor, gymOrgId);

    const result = await this.trainers.listForGym(gymOrgId, page);
    return {
      ...result,
      items: result.items.map(toGymTrainerDto),
    };
  }
}
