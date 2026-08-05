import { ConflictError } from '../../../domain/errors/conflict.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import {
  DEFAULT_STAFF_INVITE_TTL_DAYS,
  MAX_ADMINS_PER_ORG,
} from '../domain/staff-invite.constants';
import { StaffInvite } from '../domain/staff-invite.entity';
import { toStaffInviteId } from '../domain/staff-invite-id';
import type { StaffInviteRepository } from '../domain/staff-invite.repository';
import type { StaffInviteTargetRole } from '../domain/staff-invite-target-role';
import type { StaffCode } from '../domain/staff-code.value-object';
import type { StaffUserLookup } from '../domain/staff-user-lookup';
import type { GymOrgId } from '../domain/gym-org-id';
import type { GymOrgAdminPolicy } from './gym-org-admin.policy';
import type { StaffInviteDto } from './gym-org.dto';
import { InvalidStaffInviteeError } from './invalid-staff-invitee.error';
import { StaffAlreadyAffiliatedError } from './staff-already-affiliated.error';
import { StaffInviteAdminCapError } from './staff-invite-admin-cap.error';
import { toStaffInviteDto } from './staff-invite.dto';

export interface CreateStaffInviteCommand {
  readonly gymOrgId: GymOrgId;
  readonly staffCode: StaffCode;
  readonly targetRole: StaffInviteTargetRole;
  readonly expiresAt?: Date;
}

export class CreateStaffInviteUseCase {
  constructor(
    private readonly policy: GymOrgAdminPolicy,
    private readonly staffInvites: StaffInviteRepository,
    private readonly staffUsers: StaffUserLookup,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: CreateStaffInviteCommand,
  ): Promise<StaffInviteDto> {
    await this.policy.requireStaffInvite(actor, command.gymOrgId);

    const invitee = await this.staffUsers.findLiveByStaffCode(command.staffCode);
    if (invitee === null || invitee.lane !== 'STAFF') {
      throw new InvalidStaffInviteeError('No staff account found for that staff code');
    }
    if (invitee.userId === actor.userId) {
      throw new InvalidStaffInviteeError('You cannot invite yourself');
    }

    const alreadyAffiliated = await this.staffInvites.hasLiveStaffAffiliation(
      invitee.userId,
      command.gymOrgId,
    );
    if (alreadyAffiliated) {
      throw new StaffAlreadyAffiliatedError();
    }

    if (command.targetRole === 'ADMIN') {
      const [liveAdmins, pendingAdminInvites] = await Promise.all([
        this.staffInvites.countLiveAdmins(command.gymOrgId),
        this.staffInvites.countPendingAdminInvites(command.gymOrgId),
      ]);
      if (liveAdmins + pendingAdminInvites >= MAX_ADMINS_PER_ORG) {
        throw new StaffInviteAdminCapError();
      }
    }

    const now = this.clock.now();
    const expiresAt =
      command.expiresAt ??
      new Date(now.getTime() + DEFAULT_STAFF_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    if (expiresAt.getTime() <= now.getTime()) {
      throw new ConflictError('Invite expiry must be in the future');
    }

    const invite = StaffInvite.create({
      id: toStaffInviteId(this.ids.generate()),
      gymOrgId: command.gymOrgId,
      invitedUserId: invitee.userId,
      targetRole: command.targetRole,
      expiresAt,
      createdBy: actor.userId,
      now,
    });

    await this.staffInvites.save(invite);

    return toStaffInviteDto(invite);
  }
}
