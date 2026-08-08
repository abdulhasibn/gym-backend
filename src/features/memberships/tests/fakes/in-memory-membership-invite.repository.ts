import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';
import type { MembershipInvite } from '../../domain/membership-invite.entity';
import type { MembershipInviteId } from '../../domain/membership-invite-id';
import type {
  MembershipInviteQueries,
  MembershipInviteSummary,
} from '../../domain/membership-invite.queries';
import type { MembershipInviteRepository } from '../../domain/membership-invite.repository';
import type { MembershipInviteStatus } from '../../domain/membership-invite-status';

function toSummary(invite: MembershipInvite, now: Date): MembershipInviteSummary {
  let status: MembershipInviteStatus = invite.status;
  if (
    status === 'PENDING' &&
    invite.expiresAt !== null &&
    invite.expiresAt.getTime() <= now.getTime()
  ) {
    status = 'EXPIRED';
  }

  return {
    id: invite.id,
    gymOrgId: invite.gymOrgId,
    invitedEmail: invite.invitedEmail.value,
    invitedUserId: invite.invitedUserId,
    inviteeName: invite.inviteeName.value,
    inviteePhone: invite.inviteePhone?.value ?? null,
    basePlanId: invite.basePlanId,
    basePaymentStatus: invite.basePaymentStatus,
    addonPlanId: invite.addonPlanId,
    addonPaymentStatus: invite.addonPaymentStatus,
    status,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdBy: invite.createdBy,
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    acceptedMembershipId: invite.acceptedMembershipId,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
  };
}

export class InMemoryMembershipInviteStore
  implements MembershipInviteRepository, MembershipInviteQueries
{
  private readonly byId = new Map<string, MembershipInvite>();
  private now: Date = new Date();

  setNow(now: Date): void {
    this.now = now;
  }

  async findById(
    gymOrgId: GymOrgId,
    inviteId: MembershipInviteId,
  ): Promise<MembershipInvite | null> {
    const invite = this.byId.get(inviteId);
    if (invite === undefined || invite.gymOrgId !== gymOrgId || invite.isDeleted) {
      return null;
    }
    return invite;
  }

  async save(invite: MembershipInvite): Promise<void> {
    this.byId.set(invite.id, invite);
  }

  async listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<MembershipInviteSummary>> {
    const items = [...this.byId.values()]
      .filter((invite) => invite.gymOrgId === gymOrgId && !invite.isDeleted)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((invite) => toSummary(invite, this.now));

    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }
}
