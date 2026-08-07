import { UniqueViolationError } from '../../../../domain/errors/unique-violation.error';
import type { UserId } from '../../../../domain/shared/user-id';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';
import type { GymOrgId } from '../../domain/gym-org-id';
import type { StaffInvite } from '../../domain/staff-invite.entity';
import type { StaffInviteId } from '../../domain/staff-invite-id';
import type {
  StaffInviteGymSummary,
  StaffInviteInboxItem,
  StaffInviteQueries,
  StaffInviteSummary,
} from '../../domain/staff-invite.queries';
import type { StaffInviteRepository } from '../../domain/staff-invite.repository';
import type { StaffInviteStatus } from '../../domain/staff-invite-status';

export class InMemoryStaffInviteRepository implements StaffInviteRepository, StaffInviteQueries {
  private readonly invites = new Map<string, StaffInvite>();
  private readonly gymProfiles = new Map<string, StaffInviteGymSummary>();
  private readonly liveAdmins = new Map<string, Set<UserId>>();
  private readonly liveTrainers = new Map<string, Set<UserId>>();
  private now = new Date('2026-08-04T00:00:00.000Z');

  setNow(value: Date): void {
    this.now = value;
  }

  seedGymProfile(gym: StaffInviteGymSummary): void {
    this.gymProfiles.set(gym.id, gym);
  }

  seedAdmin(gymOrgId: GymOrgId, userId: UserId): void {
    const set = this.liveAdmins.get(gymOrgId) ?? new Set<UserId>();
    set.add(userId);
    this.liveAdmins.set(gymOrgId, set);
  }

  seedTrainer(gymOrgId: GymOrgId, userId: UserId): void {
    const set = this.liveTrainers.get(gymOrgId) ?? new Set<UserId>();
    set.add(userId);
    this.liveTrainers.set(gymOrgId, set);
  }

  async findById(id: StaffInviteId): Promise<StaffInvite | null> {
    return this.invites.get(id) ?? null;
  }

  async save(invite: StaffInvite): Promise<void> {
    if (invite.status === 'PENDING') {
      for (const existing of this.invites.values()) {
        if (
          existing.id !== invite.id &&
          existing.gymOrgId === invite.gymOrgId &&
          existing.invitedUserId === invite.invitedUserId &&
          existing.status === 'PENDING'
        ) {
          throw new UniqueViolationError('A pending staff invite already exists for this user');
        }
      }
    }
    this.invites.set(invite.id, invite);
  }

  async countPendingAdminInvites(gymOrgId: GymOrgId): Promise<number> {
    return [...this.invites.values()].filter(
      (invite) =>
        invite.gymOrgId === gymOrgId &&
        invite.targetRole === 'ADMIN' &&
        invite.status === 'PENDING',
    ).length;
  }

  async hasLiveStaffAffiliation(userId: UserId, gymOrgId: GymOrgId): Promise<boolean> {
    return (
      (this.liveAdmins.get(gymOrgId)?.has(userId) ?? false) ||
      (this.liveTrainers.get(gymOrgId)?.has(userId) ?? false)
    );
  }

  async countLiveAdmins(gymOrgId: GymOrgId): Promise<number> {
    return this.liveAdmins.get(gymOrgId)?.size ?? 0;
  }

  async accept(inviteId: StaffInviteId, actorUserId: UserId): Promise<StaffInvite> {
    const invite = this.invites.get(inviteId);
    if (invite === undefined) {
      throw new Error('missing invite');
    }
    invite.assertAcceptableBy(actorUserId, this.now);
    invite.markAccepted(this.now);
    this.invites.set(inviteId, invite);

    if (invite.targetRole === 'ADMIN') {
      this.seedAdmin(invite.gymOrgId, actorUserId);
    }
    this.seedTrainer(invite.gymOrgId, actorUserId);

    return invite;
  }

  async listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<StaffInviteSummary>> {
    const items = [...this.invites.values()]
      .filter((invite) => invite.gymOrgId === gymOrgId)
      .map((invite) => this.toSummary(invite));
    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }

  async listInboxForUser(userId: UserId, page: Pagination): Promise<Page<StaffInviteInboxItem>> {
    const items = [...this.invites.values()]
      .filter((invite) => invite.invitedUserId === userId)
      .map((invite) => this.toInboxItem(invite))
      .filter((item): item is StaffInviteInboxItem => item !== null);
    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }

  private toSummary(invite: StaffInvite): StaffInviteSummary {
    let status: StaffInviteStatus = invite.status;
    if (invite.status === 'PENDING' && invite.isExpiredAt(this.now)) {
      status = 'EXPIRED';
    }

    return {
      id: invite.id,
      gymOrgId: invite.gymOrgId,
      invitedUserId: invite.invitedUserId,
      targetRole: invite.targetRole,
      status,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      createdBy: invite.createdBy,
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
      updatedAt: invite.updatedAt.toISOString(),
    };
  }

  private toInboxItem(invite: StaffInvite): StaffInviteInboxItem | null {
    const gym = this.gymProfiles.get(invite.gymOrgId);
    if (gym === undefined) {
      return null;
    }
    return {
      ...this.toSummary(invite),
      gym,
    };
  }
}
