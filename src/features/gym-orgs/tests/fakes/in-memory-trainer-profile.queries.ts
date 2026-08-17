import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';
import type { GymOrgId } from '../../domain/gym-org-id';
import type {
  GymTrainerSummary,
  TrainerProfileQueries,
} from '../../domain/trainer-profile.queries';

export class InMemoryTrainerProfileQueries implements TrainerProfileQueries {
  private readonly rows: GymTrainerSummary[] = [];

  seed(row: GymTrainerSummary): void {
    this.rows.push(row);
  }

  async listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<GymTrainerSummary>> {
    const matching = this.rows
      .filter((row) => row.gymOrgId === gymOrgId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const slice = matching.slice(page.offset, page.offset + page.limit);
    return toPage(slice, matching.length, page);
  }
}
