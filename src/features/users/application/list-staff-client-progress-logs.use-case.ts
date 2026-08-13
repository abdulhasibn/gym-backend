import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { ClientDataGrantGate } from '../domain/client-data-grant.gate';
import type { ProgressLogQueries } from '../domain/progress-log.queries';
import { hasProgressGrant } from './filter-profile-by-grants';
import { StaffClientReadPolicy } from './staff-client-read.policy';
import { UsersForbiddenError } from './users-forbidden.error';
import { toProgressLogDto, type ProgressLogDto } from './users.dto';

export class ListStaffClientProgressLogsUseCase {
  constructor(
    private readonly policy: StaffClientReadPolicy,
    private readonly progressLogs: ProgressLogQueries,
    private readonly grants: ClientDataGrantGate,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserId: string,
    page: Pagination,
  ): Promise<Page<ProgressLogDto>> {
    await this.policy.requireStaffAtGym(actor, gymOrgId);

    const clientId = toUserId(clientUserId);
    const grantSnapshot = await this.grants.loadForActiveMembership(clientId, gymOrgId);
    if (grantSnapshot === null || !hasProgressGrant(grantSnapshot)) {
      throw new UsersForbiddenError('PROGRESS grant required to view client progress');
    }

    const result = await this.progressLogs.listForClient(clientId, page);
    return {
      items: result.items.map(toProgressLogDto),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
