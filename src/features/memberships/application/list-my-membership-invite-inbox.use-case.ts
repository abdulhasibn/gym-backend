import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { MembershipInviteQueries } from '../domain/membership-invite.queries';
import type { MembershipInviteInboxItemDto } from './membership-invite.dto';
import { toMembershipInviteInboxItemDto } from './membership-invite.dto';
import { MembershipInviteForbiddenError } from './membership-invite-forbidden.error';

export class ListMyMembershipInviteInboxUseCase {
  constructor(private readonly inviteQueries: MembershipInviteQueries) {}

  async execute(
    actor: AuthenticatedActor,
    page: Pagination,
  ): Promise<Page<MembershipInviteInboxItemDto>> {
    if (actor.lane !== 'CLIENT') {
      throw new MembershipInviteForbiddenError(
        'Only client accounts have a membership invite inbox',
      );
    }

    const result = await this.inviteQueries.listInboxForUser(actor.userId, actor.email, page);
    return {
      ...result,
      items: result.items.map(toMembershipInviteInboxItemDto),
    };
  }
}
