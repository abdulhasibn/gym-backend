import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { AttendanceQueries } from '../domain/attendance.queries';
import { AttendanceAccessPolicy } from './attendance-access.policy';
import { toAttendanceDtoFromSummary, type AttendanceDto } from './attendance.dto';

export class ListMyAttendancesUseCase {
  constructor(
    private readonly policy: AttendanceAccessPolicy,
    private readonly queries: AttendanceQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    page: Pagination,
  ): Promise<Page<AttendanceDto>> {
    this.policy.requireClientSelf(actor);

    const result = await this.queries.listForClient({ gymOrgId, clientUserId: actor.userId }, page);

    return {
      items: result.items.map(toAttendanceDtoFromSummary),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
