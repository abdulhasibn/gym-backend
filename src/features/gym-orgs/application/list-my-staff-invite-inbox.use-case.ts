import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { StaffInviteQueries } from '../domain/staff-invite.queries';
import type { StaffInviteInboxItemDto } from './gym-org.dto';
import { StaffInviteForbiddenError } from './staff-invite-forbidden.error';
import { toStaffInviteInboxItemDto } from './staff-invite.dto';

export class ListMyStaffInviteInboxUseCase {
  constructor(private readonly staffInviteQueries: StaffInviteQueries) {}

  async execute(
    actor: AuthenticatedActor,
    page: Pagination,
  ): Promise<Page<StaffInviteInboxItemDto>> {
    if (actor.lane !== 'STAFF') {
      throw new StaffInviteForbiddenError('Only staff accounts have a staff invite inbox');
    }

    const result = await this.staffInviteQueries.listInboxForUser(actor.userId, page);
    return {
      ...result,
      items: result.items.map(toStaffInviteInboxItemDto),
    };
  }
}
