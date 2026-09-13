import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { AttendanceQueries } from '../domain/attendance.queries';
import { AttendanceAccessPolicy } from './attendance-access.policy';
import { toAttendanceDtoFromSummary, type AttendanceDto } from './attendance.dto';

export class ListPresentAttendancesUseCase {
  constructor(
    private readonly policy: AttendanceAccessPolicy,
    private readonly queries: AttendanceQueries,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
  ): Promise<Page<AttendanceDto>> {
    await this.policy.requireAdmin(actor, gymOrgId);

    const now = this.clock.now();
    const result = await this.queries.listPresent({ gymOrgId }, page);

    return {
      items: result.items.map((summary) => toAttendanceDtoFromSummary(summary, { asOf: now })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
