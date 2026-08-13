import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { AttendanceQueries } from '../domain/attendance.queries';
import { AttendanceAccessPolicy } from './attendance-access.policy';
import { toAttendanceDtoFromSummary, type AttendanceDto } from './attendance.dto';

export class ListClientAttendancesUseCase {
  constructor(
    private readonly policy: AttendanceAccessPolicy,
    private readonly queries: AttendanceQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserId: string,
    page: Pagination,
  ): Promise<Page<AttendanceDto>> {
    await this.policy.requireStaffRead(actor, gymOrgId);

    const result = await this.queries.listForClient(
      { gymOrgId, clientUserId: toUserId(clientUserId) },
      page,
    );

    return {
      items: result.items.map(toAttendanceDtoFromSummary),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
