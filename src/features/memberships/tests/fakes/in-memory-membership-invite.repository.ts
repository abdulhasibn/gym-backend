import { ConflictError } from '../../../../domain/errors/conflict.error';
import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';
import type { GrantChecklist } from '../../domain/grant-checklist';
import type { MembershipId } from '../../domain/membership-id';
import { toMembershipId } from '../../domain/membership-id';
import type { MembershipInvite } from '../../domain/membership-invite.entity';
import { MembershipInvite as MembershipInviteEntity } from '../../domain/membership-invite.entity';
import type { MembershipInviteId } from '../../domain/membership-invite-id';
import type {
  MembershipInviteGymSummary,
  MembershipInviteInboxItem,
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
  private readonly gymProfiles = new Map<string, MembershipInviteGymSummary>();
  private readonly activeMemberships = new Set<string>();
  private now: Date = new Date();
  private acceptCounter = 0;

  setNow(now: Date): void {
    this.now = now;
  }

  seedGymProfile(gym: MembershipInviteGymSummary): void {
    this.gymProfiles.set(gym.id, gym);
  }

  seedActiveMembership(clientUserId: UserId): void {
    this.activeMemberships.add(clientUserId);
  }

  async findById(inviteId: MembershipInviteId): Promise<MembershipInvite | null> {
    const invite = this.byId.get(inviteId);
    if (invite === undefined || invite.isDeleted) {
      return null;
    }
    return invite;
  }

  async save(invite: MembershipInvite): Promise<void> {
    this.byId.set(invite.id, invite);
  }

  async accept(
    inviteId: MembershipInviteId,
    actorUserId: UserId,
    _checklist: GrantChecklist,
  ): Promise<MembershipInvite> {
    const invite = await this.findById(inviteId);
    if (invite === null) {
      throw new ConflictError('Membership invite not found');
    }
    if (invite.status !== 'PENDING') {
      throw new ConflictError('Membership invite is not pending');
    }
    if (this.activeMemberships.has(actorUserId)) {
      throw new ConflictError('Client already has an ACTIVE membership');
    }

    this.acceptCounter += 1;
    const membershipId = toMembershipId(
      `ffffffff-ffff-4fff-8fff-${String(this.acceptCounter).padStart(12, '0')}`,
    );
    this.activeMemberships.add(actorUserId);

    const accepted = MembershipInviteEntity.reconstitute({
      id: invite.id,
      gymOrgId: invite.gymOrgId,
      invitedEmail: invite.invitedEmail,
      invitedUserId: invite.invitedUserId ?? actorUserId,
      inviteeName: invite.inviteeName,
      inviteePhone: invite.inviteePhone,
      basePlanId: invite.basePlanId,
      basePaymentStatus: invite.basePaymentStatus,
      addonPlanId: invite.addonPlanId,
      addonPaymentStatus: invite.addonPaymentStatus,
      status: 'ACCEPTED',
      expiresAt: invite.expiresAt,
      createdBy: invite.createdBy,
      acceptedAt: this.now,
      acceptedMembershipId: membershipId,
      deletedAt: invite.deletedAt,
      createdAt: invite.createdAt,
      updatedAt: this.now,
    });
    this.byId.set(accepted.id, accepted);
    return accepted;
  }

  async listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<MembershipInviteSummary>> {
    const items = [...this.byId.values()]
      .filter((invite) => invite.gymOrgId === gymOrgId && !invite.isDeleted)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((invite) => toSummary(invite, this.now));

    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }

  async listInboxForUser(
    userId: UserId,
    email: string,
    page: Pagination,
  ): Promise<Page<MembershipInviteInboxItem>> {
    const normalizedEmail = email.trim().toLowerCase();
    const items = [...this.byId.values()]
      .filter((invite) => {
        if (invite.isDeleted) {
          return false;
        }
        if (invite.invitedUserId !== null) {
          return invite.invitedUserId === userId;
        }
        return invite.invitedEmail.value === normalizedEmail;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((invite) => {
        const gym = this.gymProfiles.get(invite.gymOrgId);
        if (gym === undefined) {
          throw new Error(`Missing gym profile for ${invite.gymOrgId}`);
        }
        return { ...toSummary(invite, this.now), gym };
      });

    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }

  lastAcceptedMembershipId(): MembershipId | null {
    for (const invite of this.byId.values()) {
      if (invite.status === 'ACCEPTED' && invite.acceptedMembershipId !== null) {
        return invite.acceptedMembershipId;
      }
    }
    return null;
  }
}
