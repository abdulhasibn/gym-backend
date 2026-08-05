import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toUserId } from '../../../../domain/shared/user-id';
import { AcceptStaffInviteUseCase } from '../../application/accept-staff-invite.use-case';
import { CreateGymOrgPolicy } from '../../application/create-gym-org.policy';
import { CreateGymOrgUseCase } from '../../application/create-gym-org.use-case';
import { CreateStaffInviteUseCase } from '../../application/create-staff-invite.use-case';
import { GymOrgAdminPolicy } from '../../application/gym-org-admin.policy';
import { InvalidStaffInviteeError } from '../../application/invalid-staff-invitee.error';
import { ListMyStaffInviteInboxUseCase } from '../../application/list-my-staff-invite-inbox.use-case';
import { RevokeStaffInviteUseCase } from '../../application/revoke-staff-invite.use-case';
import { StaffAlreadyAffiliatedError } from '../../application/staff-already-affiliated.error';
import { StaffInviteAdminCapError } from '../../application/staff-invite-admin-cap.error';
import { StaffInviteExpiredError } from '../../application/staff-invite-expired.error';
import { toGymOrgId } from '../../domain/gym-org-id';
import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';
import { StaffCode } from '../../domain/staff-code.value-object';
import { MAX_ADMINS_PER_ORG } from '../../domain/staff-invite.constants';
import { FixedClock } from '../fakes/fixed-clock';
import { InMemoryGymOrgRepository } from '../fakes/in-memory-gym-org.repository';
import { InMemoryStaffInviteRepository } from '../fakes/in-memory-staff-invite.repository';
import { InMemoryStaffUserLookup } from '../fakes/in-memory-staff-user-lookup';

const owner: AuthenticatedActor = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  roleCode: 'ADMIN',
  lane: 'STAFF',
  email: 'owner@example.com',
  staffCode: 'STF-OWNER',
};

const inviteeId = toUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

describe('Staff invite use cases', () => {
  async function setup() {
    const gymOrgs = new InMemoryGymOrgRepository();
    const staffInvites = new InMemoryStaffInviteRepository();
    const staffUsers = new InMemoryStaffUserLookup();
    const clock = new FixedClock(new Date('2026-08-04T00:00:00.000Z'));
    staffInvites.setNow(clock.now());

    const created = await new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy()).execute(
      { ...owner, roleCode: 'STAFF_UNASSIGNED' },
      {
        name: GymOrgName.create('North Star'),
        address: null,
        contactPhone: null,
        contactEmail: null,
        logoUrl: null,
        timezone: IanaTimezone.create('Asia/Kolkata'),
      },
    );
    staffInvites.seedAdmin(toGymOrgId(created.id), owner.userId);

    staffUsers.seed('STF-OWNER', {
      userId: owner.userId,
      roleCode: 'ADMIN',
      lane: 'STAFF',
    });
    staffUsers.seed('STF-TRAINER01', {
      userId: inviteeId,
      roleCode: 'STAFF_UNASSIGNED',
      lane: 'STAFF',
    });
    staffUsers.seed('STF-CLIENT', {
      userId: toUserId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
      roleCode: 'CLIENT',
      lane: 'CLIENT',
    });

    const policy = new GymOrgAdminPolicy(gymOrgs);
    let idCounter = 0;
    const ids = {
      generate: () => {
        idCounter += 1;
        return `cccccccc-cccc-4ccc-8ccc-${String(idCounter).padStart(12, '0')}`;
      },
    };
    const createInvite = new CreateStaffInviteUseCase(policy, staffInvites, staffUsers, clock, ids);

    return { gymOrgs, staffInvites, staffUsers, clock, created, policy, createInvite };
  }

  it('creates a trainer invite and accepts it', async () => {
    const { createInvite, staffInvites, clock, created } = await setup();

    const invite = await createInvite.execute(owner, {
      gymOrgId: toGymOrgId(created.id),
      staffCode: StaffCode.create('STF-TRAINER01'),
      targetRole: 'TRAINER',
    });

    expect(invite.status).toBe('PENDING');
    expect(invite.invitedUserId).toBe(inviteeId);

    const accepted = await new AcceptStaffInviteUseCase(staffInvites, clock).execute(
      {
        userId: inviteeId,
        roleCode: 'STAFF_UNASSIGNED',
        lane: 'STAFF',
        email: 'trainer@example.com',
        staffCode: 'STF-TRAINER01',
      },
      invite.id as never,
    );

    expect(accepted.status).toBe('ACCEPTED');
    await expect(
      staffInvites.hasLiveStaffAffiliation(inviteeId, toGymOrgId(created.id)),
    ).resolves.toBe(true);
  });

  it('rejects CLIENT invitees, self-invites, and already affiliated staff', async () => {
    const { createInvite, staffInvites, created } = await setup();

    await expect(
      createInvite.execute(owner, {
        gymOrgId: toGymOrgId(created.id),
        staffCode: StaffCode.create('STF-CLIENT'),
        targetRole: 'TRAINER',
      }),
    ).rejects.toBeInstanceOf(InvalidStaffInviteeError);

    await expect(
      createInvite.execute(owner, {
        gymOrgId: toGymOrgId(created.id),
        staffCode: StaffCode.create('STF-OWNER'),
        targetRole: 'TRAINER',
      }),
    ).rejects.toBeInstanceOf(InvalidStaffInviteeError);

    staffInvites.seedTrainer(toGymOrgId(created.id), inviteeId);
    await expect(
      createInvite.execute(owner, {
        gymOrgId: toGymOrgId(created.id),
        staffCode: StaffCode.create('STF-TRAINER01'),
        targetRole: 'TRAINER',
      }),
    ).rejects.toBeInstanceOf(StaffAlreadyAffiliatedError);
  });

  it('enforces the admin cap including pending admin invites', async () => {
    const { createInvite, staffInvites, staffUsers, created } = await setup();
    // owner already counts as 1 live admin
    for (let i = 0; i < MAX_ADMINS_PER_ORG - 1; i += 1) {
      const code = `STF-ADMIN${i}`;
      const userId = toUserId(`dddddddd-dddd-4ddd-8ddd-ddddddddddd${i}`);
      staffUsers.seed(code, { userId, roleCode: 'STAFF_UNASSIGNED', lane: 'STAFF' });
      await createInvite.execute(owner, {
        gymOrgId: toGymOrgId(created.id),
        staffCode: StaffCode.create(code),
        targetRole: 'ADMIN',
      });
    }

    staffUsers.seed('STF-EXTRA', {
      userId: toUserId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
      roleCode: 'STAFF_UNASSIGNED',
      lane: 'STAFF',
    });

    await expect(
      createInvite.execute(owner, {
        gymOrgId: toGymOrgId(created.id),
        staffCode: StaffCode.create('STF-EXTRA'),
        targetRole: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(StaffInviteAdminCapError);

    expect(await staffInvites.countPendingAdminInvites(toGymOrgId(created.id))).toBe(
      MAX_ADMINS_PER_ORG - 1,
    );
  });

  it('marks expired invites on accept and computes EXPIRED in inbox without saving', async () => {
    const { createInvite, staffInvites, clock, created } = await setup();
    const invite = await createInvite.execute(owner, {
      gymOrgId: toGymOrgId(created.id),
      staffCode: StaffCode.create('STF-TRAINER01'),
      targetRole: 'TRAINER',
      expiresAt: new Date('2026-08-05T00:00:00.000Z'),
    });

    clock.set(new Date('2026-08-06T00:00:00.000Z'));
    staffInvites.setNow(clock.now());

    const inboxBefore = await new ListMyStaffInviteInboxUseCase(staffInvites).execute(
      {
        userId: inviteeId,
        roleCode: 'STAFF_UNASSIGNED',
        lane: 'STAFF',
        email: 'trainer@example.com',
        staffCode: 'STF-TRAINER01',
      },
      { limit: 20, offset: 0 },
    );
    expect(inboxBefore.items[0]?.status).toBe('EXPIRED');
    expect((await staffInvites.findById(invite.id as never))?.status).toBe('PENDING');

    await expect(
      new AcceptStaffInviteUseCase(staffInvites, clock).execute(
        {
          userId: inviteeId,
          roleCode: 'STAFF_UNASSIGNED',
          lane: 'STAFF',
          email: 'trainer@example.com',
          staffCode: 'STF-TRAINER01',
        },
        invite.id as never,
      ),
    ).rejects.toBeInstanceOf(StaffInviteExpiredError);

    expect((await staffInvites.findById(invite.id as never))?.status).toBe('EXPIRED');
  });

  it('revokes a pending invite', async () => {
    const { createInvite, staffInvites, clock, policy, created } = await setup();
    const invite = await createInvite.execute(owner, {
      gymOrgId: toGymOrgId(created.id),
      staffCode: StaffCode.create('STF-TRAINER01'),
      targetRole: 'TRAINER',
    });

    const revoked = await new RevokeStaffInviteUseCase(policy, staffInvites, clock).execute(
      owner,
      invite.id as never,
    );
    expect(revoked.status).toBe('REVOKED');
  });
});
