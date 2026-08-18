import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { ClientDataGrantGate } from '../domain/client-data-grant.gate';
import type { WearableDailyMetricQueries } from '../domain/wearable-daily-metric.queries';
import type { WearableProviderCode } from '../domain/wearable-provider';
import {
  hasWearablesGrant,
  toWearableDailyMetricDto,
  type WearableDailyMetricDto,
} from './health-sync.dto';
import { HealthSyncForbiddenError } from './health-sync-forbidden.error';
import type { ListWearableMetricsQuery } from './list-my-wearable-metrics.use-case';
import { StaffWearableReadPolicy } from './staff-wearable-read.policy';

export class ListStaffClientWearableMetricsUseCase {
  constructor(
    private readonly policy: StaffWearableReadPolicy,
    private readonly queries: WearableDailyMetricQueries,
    private readonly grants: ClientDataGrantGate,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserId: string,
    query: ListWearableMetricsQuery,
    page: Pagination,
  ): Promise<Page<WearableDailyMetricDto>> {
    await this.policy.requireStaffAtGym(actor, gymOrgId);

    const clientId = toUserId(clientUserId);
    const grantSnapshot = await this.grants.loadForActiveMembership(clientId, gymOrgId);
    if (grantSnapshot === null || !hasWearablesGrant(grantSnapshot.classGrants)) {
      throw new HealthSyncForbiddenError(
        'WEARABLES grant required to view client wearable metrics',
      );
    }

    const result = await this.queries.listForClient(
      clientId,
      {
        provider: query.provider as WearableProviderCode | undefined,
        from: query.from === undefined ? undefined : CalendarDate.create(query.from),
        to: query.to === undefined ? undefined : CalendarDate.create(query.to),
      },
      page,
    );

    return {
      items: result.items.map(toWearableDailyMetricDto),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
