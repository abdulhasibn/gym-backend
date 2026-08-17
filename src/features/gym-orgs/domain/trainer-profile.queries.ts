import type { UserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { GymOrgId } from './gym-org-id';

export interface GymTrainerSummary {
  readonly trainerProfileId: string;
  readonly userId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly name: string;
  readonly email: string;
  readonly staffCode: string | null;
  readonly bio: string | null;
  readonly isAdmin: boolean;
  readonly createdAt: string;
}

export interface TrainerProfileQueries {
  listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<GymTrainerSummary>>;
}
