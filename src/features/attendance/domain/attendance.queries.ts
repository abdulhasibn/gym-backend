import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { AttendanceId } from './attendance-id';
import type { AttendanceRecorder } from './attendance-recorder';

export interface AttendanceSummary {
  readonly id: AttendanceId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly occurredAt: string;
  readonly recordedBy: AttendanceRecorder;
  readonly recorderUserId: UserId;
  readonly createdAt: string;
}

export interface ListGymDayAttendancesCriteria {
  readonly gymOrgId: GymOrgId;
  /** Inclusive UTC lower bound for gym-local day. */
  readonly occurredAtFrom: Date;
  /** Exclusive UTC upper bound for gym-local day. */
  readonly occurredAtTo: Date;
}

export interface ListClientAttendancesCriteria {
  readonly gymOrgId: GymOrgId;
  readonly clientUserId: UserId;
}

export interface AttendanceQueries {
  listForGymDay(
    criteria: ListGymDayAttendancesCriteria,
    page: Pagination,
  ): Promise<Page<AttendanceSummary>>;

  listForClient(
    criteria: ListClientAttendancesCriteria,
    page: Pagination,
  ): Promise<Page<AttendanceSummary>>;
}
