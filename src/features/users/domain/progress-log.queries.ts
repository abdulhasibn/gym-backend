import type { UserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { ProgressLogId } from './progress-log-id';

export interface ProgressLogSummary {
  readonly id: ProgressLogId;
  readonly clientUserId: UserId;
  readonly logDate: string;
  readonly weightKg: number | null;
  readonly bmi: number | null;
  readonly notes: string | null;
  readonly createdAt: string;
}

export interface ProgressLogQueries {
  listForClient(clientUserId: UserId, page: Pagination): Promise<Page<ProgressLogSummary>>;
}
