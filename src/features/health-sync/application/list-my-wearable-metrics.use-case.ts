import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { WearableDailyMetricQueries } from '../domain/wearable-daily-metric.queries';
import type { WearableProviderCode } from '../domain/wearable-provider';
import { ClientSelfPolicy } from './client-self.policy';
import { toWearableDailyMetricDto, type WearableDailyMetricDto } from './health-sync.dto';

export interface ListWearableMetricsQuery {
  readonly provider?: string;
  readonly from?: string;
  readonly to?: string;
}

export class ListMyWearableMetricsUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly queries: WearableDailyMetricQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    query: ListWearableMetricsQuery,
    page: Pagination,
  ): Promise<Page<WearableDailyMetricDto>> {
    this.policy.requireClientSelf(actor);

    const result = await this.queries.listForClient(
      actor.userId,
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
