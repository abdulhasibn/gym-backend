import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { ProgressLogQueries } from '../domain/progress-log.queries';
import { ClientSelfPolicy } from './client-self.policy';
import { toProgressLogDto, type ProgressLogDto } from './users.dto';

export class ListMyProgressLogsUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly queries: ProgressLogQueries,
  ) {}

  async execute(actor: AuthenticatedActor, page: Pagination): Promise<Page<ProgressLogDto>> {
    this.policy.requireClientSelf(actor);
    const result = await this.queries.listForClient(actor.userId, page);
    return {
      items: result.items.map(toProgressLogDto),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
