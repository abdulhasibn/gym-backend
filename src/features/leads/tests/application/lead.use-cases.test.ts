import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { ChangeLeadStatusUseCase } from '../../application/change-lead-status.use-case';
import { ConvertLeadUseCase } from '../../application/convert-lead.use-case';
import { CreateLeadUseCase } from '../../application/create-lead.use-case';
import { GetLeadUseCase } from '../../application/get-lead.use-case';
import { LeadAdminPolicy } from '../../application/lead-admin.policy';
import { LeadEmailRequiredError } from '../../application/lead-email-required.error';
import { LeadForbiddenError } from '../../application/lead-forbidden.error';
import { ListDueFollowUpsUseCase } from '../../application/list-due-follow-ups.use-case';
import { ListLeadsUseCase } from '../../application/list-leads.use-case';
import { SoftDeleteLeadUseCase } from '../../application/soft-delete-lead.use-case';
import { UpdateLeadUseCase } from '../../application/update-lead.use-case';
import { LeadAlreadyConvertedError } from '../../domain/lead-already-converted.error';
import type {
  CreateMembershipInviteFromLead,
  CreateMembershipInviteFromLeadCommand,
  CreatedMembershipInviteFromLead,
} from '../../domain/create-membership-invite.port';
import { LeadEmail } from '../../domain/lead-email.value-object';
import { toLeadId } from '../../domain/lead-id';
import { LeadNotConvertibleError } from '../../domain/lead-not-convertible.error';
import { LeadName } from '../../domain/lead-name.value-object';
import { LeadPhone } from '../../domain/lead-phone.value-object';
import { FixedClock } from '../../../gym-orgs/tests/fakes/fixed-clock';
import { FixedLiveGymAdmin } from '../fakes/fixed-live-gym-admin';
import { InMemoryLeadStore } from '../fakes/in-memory-lead.repository';

const gymOrgId = toGymOrgId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const adminId = toUserId('11111111-1111-4111-8111-111111111111');

function adminActor(roleCode: AuthenticatedActor['roleCode'] = 'ADMIN'): AuthenticatedActor {
  return {
    userId: adminId,
    roleCode,
    lane: roleCode === 'CLIENT' ? 'CLIENT' : 'STAFF',
    email: 'admin@example.com',
    staffCode: 'STF-ADMIN',
  };
}

class FakeCreateMembershipInvite implements CreateMembershipInviteFromLead {
  readonly calls: CreateMembershipInviteFromLeadCommand[] = [];

  async execute(
    _actor: AuthenticatedActor,
    command: CreateMembershipInviteFromLeadCommand,
  ): Promise<CreatedMembershipInviteFromLead> {
    this.calls.push(command);
    const now = '2026-08-07T00:00:00.000Z';
    return {
      id: `invite-${this.calls.length}`,
      gymOrgId: command.gymOrgId,
      invitedEmail: command.invitedEmail,
      invitedUserId: null,
      inviteeName: command.inviteeName,
      inviteePhone: command.inviteePhone,
      basePlanId: command.basePlanId,
      basePaymentStatus: command.basePaymentStatus,
      addonPlanId: command.addonPlanId,
      addonPaymentStatus: command.addonPaymentStatus,
      status: 'PENDING',
      expiresAt: null,
      createdBy: adminId,
      acceptedAt: null,
      acceptedMembershipId: null,
      createdAt: now,
      updatedAt: now,
    };
  }
}

function setup() {
  const store = new InMemoryLeadStore();
  const admins = new FixedLiveGymAdmin();
  admins.seed(adminId, gymOrgId);
  const policy = new LeadAdminPolicy(admins);
  const clock = new FixedClock(new Date('2026-08-07T00:00:00.000Z'));
  const createInvite = new FakeCreateMembershipInvite();
  let n = 0;
  const ids = {
    generate: () => {
      n += 1;
      return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}`;
    },
  };

  return {
    store,
    createInvite,
    create: new CreateLeadUseCase(store, policy, clock, ids),
    list: new ListLeadsUseCase(store, policy),
    get: new GetLeadUseCase(store, policy),
    update: new UpdateLeadUseCase(store, policy, clock),
    changeStatus: new ChangeLeadStatusUseCase(store, policy, clock),
    convert: new ConvertLeadUseCase(store, policy, createInvite, clock),
    softDelete: new SoftDeleteLeadUseCase(store, policy, clock),
    due: new ListDueFollowUpsUseCase(store, policy),
  };
}

describe('lead use cases', () => {
  it('creates, lists, and gets a lead for a live admin', async () => {
    const { create, list, get } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Priya'),
      phone: LeadPhone.create('9876543210'),
      source: 'walk-in',
      interest: null,
      notes: null,
    });

    expect(created.lead.status).toBe('NEW');
    expect(created.lead.email).toBeNull();
    expect(created.lead.convertedMembershipInviteId).toBeNull();
    expect(created.warnings).toEqual([]);

    const listed = await list.execute(adminActor(), gymOrgId, { limit: 20, offset: 0 });
    expect(listed.total).toBe(1);
    expect(listed.items[0]?.name).toBe('Priya');

    const one = await get.execute(adminActor(), gymOrgId, toLeadId(created.lead.id));
    expect(one.phone).toBe('9876543210');
  });

  it('forbids non-admin and non-affiliated actors', async () => {
    const { create } = setup();
    await expect(
      create.execute(adminActor('TRAINER'), {
        gymOrgId,
        name: LeadName.create('X'),
        phone: LeadPhone.create('1'),
        source: null,
        interest: null,
        notes: null,
      }),
    ).rejects.toBeInstanceOf(LeadForbiddenError);

    const store = new InMemoryLeadStore();
    const policy = new LeadAdminPolicy(new FixedLiveGymAdmin());
    const createUnaffiliated = new CreateLeadUseCase(
      store,
      policy,
      new FixedClock(new Date('2026-08-07T00:00:00.000Z')),
      { generate: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' },
    );
    await expect(
      createUnaffiliated.execute(adminActor(), {
        gymOrgId,
        name: LeadName.create('X'),
        phone: LeadPhone.create('1'),
        source: null,
        interest: null,
        notes: null,
      }),
    ).rejects.toBeInstanceOf(LeadForbiddenError);
  });

  it('soft-warns on duplicate open phone and still saves', async () => {
    const { create } = setup();
    const first = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('One'),
      phone: LeadPhone.create('9000000001'),
      source: null,
      interest: null,
      notes: null,
    });
    const second = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Two'),
      phone: LeadPhone.create('9000000001'),
      source: null,
      interest: null,
      notes: null,
    });

    expect(second.warnings).toEqual([
      {
        code: 'DUPLICATE_OPEN_LEAD_PHONE',
        existingLeadIds: [first.lead.id],
      },
    ]);
    expect(second.lead.id).not.toBe(first.lead.id);
  });

  it('does not warn when only LOST leads share the phone', async () => {
    const { create, changeStatus } = setup();
    const first = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Lost'),
      phone: LeadPhone.create('9000000002'),
      source: null,
      interest: null,
      notes: null,
    });
    await changeStatus.execute(adminActor(), gymOrgId, toLeadId(first.lead.id), 'LOST');

    const second = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Reinquiry'),
      phone: LeadPhone.create('9000000002'),
      source: null,
      interest: null,
      notes: null,
    });
    expect(second.warnings).toEqual([]);
  });

  it('updates profile, clears follow-up, and lists due follow-ups', async () => {
    const { create, update, due } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Due'),
      phone: LeadPhone.create('9000000003'),
      source: null,
      interest: null,
      notes: null,
    });

    await update.execute(adminActor(), {
      gymOrgId,
      leadId: toLeadId(created.lead.id),
      name: LeadName.create('Due'),
      phone: LeadPhone.create('9000000003'),
      source: null,
      interest: null,
      notes: null,
      followUpDate: '2026-08-01',
    });

    const dueList = await due.execute(adminActor(), gymOrgId, '2026-08-07', {
      limit: 20,
      offset: 0,
    });
    expect(dueList.total).toBe(1);

    await update.execute(adminActor(), {
      gymOrgId,
      leadId: toLeadId(created.lead.id),
      name: LeadName.create('Due'),
      phone: LeadPhone.create('9000000003'),
      source: null,
      interest: null,
      notes: null,
      followUpDate: null,
    });

    const cleared = await due.execute(adminActor(), gymOrgId, '2026-08-07', {
      limit: 20,
      offset: 0,
    });
    expect(cleared.total).toBe(0);
  });

  it('soft-deletes then returns not found', async () => {
    const { create, softDelete, get } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Gone'),
      phone: LeadPhone.create('9000000004'),
      source: null,
      interest: null,
      notes: null,
    });

    await softDelete.execute(adminActor(), gymOrgId, toLeadId(created.lead.id));
    await expect(
      get.execute(adminActor(), gymOrgId, toLeadId(created.lead.id)),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('converts a lead with stored email without invitedEmail in the command', async () => {
    const { create, convert, createInvite } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Priya'),
      phone: LeadPhone.create('9876543210'),
      email: LeadEmail.create('priya@gym.test'),
      source: null,
      interest: null,
      notes: null,
    });

    const result = await convert.execute(adminActor(), {
      gymOrgId,
      leadId: toLeadId(created.lead.id),
      basePlanId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      basePaymentStatus: 'paid',
      addonPlanId: null,
      addonPaymentStatus: null,
    });

    expect(result.lead.status).toBe('CONVERTED');
    expect(result.lead.email).toBe('priya@gym.test');
    expect(result.lead.convertedMembershipInviteId).toBe('invite-1');
    expect(result.membershipInvite.inviteeName).toBe('Priya');
    expect(result.membershipInvite.inviteePhone).toBe('9876543210');
    expect(result.membershipInvite.invitedEmail).toBe('priya@gym.test');
    expect(createInvite.calls).toHaveLength(1);
  });

  it('persists body email when the lead has none then converts', async () => {
    const { create, convert } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Walk-in'),
      phone: LeadPhone.create('9000000005'),
      source: null,
      interest: null,
      notes: null,
    });

    const result = await convert.execute(adminActor(), {
      gymOrgId,
      leadId: toLeadId(created.lead.id),
      invitedEmail: LeadEmail.create('walkin@gym.test'),
      basePlanId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      basePaymentStatus: 'unpaid',
      addonPlanId: null,
      addonPaymentStatus: null,
    });

    expect(result.lead.email).toBe('walkin@gym.test');
    expect(result.lead.status).toBe('CONVERTED');
    expect(result.membershipInvite.invitedEmail).toBe('walkin@gym.test');
  });

  it('rejects convert when neither lead nor body has email', async () => {
    const { create, convert, createInvite } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('No Email'),
      phone: LeadPhone.create('9000000006'),
      source: null,
      interest: null,
      notes: null,
    });

    await expect(
      convert.execute(adminActor(), {
        gymOrgId,
        leadId: toLeadId(created.lead.id),
        basePlanId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        basePaymentStatus: 'paid',
        addonPlanId: null,
        addonPaymentStatus: null,
      }),
    ).rejects.toBeInstanceOf(LeadEmailRequiredError);
    expect(createInvite.calls).toHaveLength(0);
  });

  it('rejects a second convert', async () => {
    const { create, convert } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Priya'),
      phone: LeadPhone.create('9876543210'),
      email: LeadEmail.create('priya@gym.test'),
      source: null,
      interest: null,
      notes: null,
    });
    const command = {
      gymOrgId,
      leadId: toLeadId(created.lead.id),
      basePlanId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      basePaymentStatus: 'paid' as const,
      addonPlanId: null,
      addonPaymentStatus: null,
    };
    await convert.execute(adminActor(), command);
    await expect(convert.execute(adminActor(), command)).rejects.toBeInstanceOf(
      LeadAlreadyConvertedError,
    );
  });

  it('rejects converting a lost lead', async () => {
    const { create, changeStatus, convert } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Lost'),
      phone: LeadPhone.create('9000000007'),
      email: LeadEmail.create('lost@gym.test'),
      source: null,
      interest: null,
      notes: null,
    });
    await changeStatus.execute(adminActor(), gymOrgId, toLeadId(created.lead.id), 'LOST');
    await expect(
      convert.execute(adminActor(), {
        gymOrgId,
        leadId: toLeadId(created.lead.id),
        basePlanId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        basePaymentStatus: 'paid',
        addonPlanId: null,
        addonPaymentStatus: null,
      }),
    ).rejects.toBeInstanceOf(LeadNotConvertibleError);
  });

  it('forbids non-admin convert', async () => {
    const { create, convert } = setup();
    const created = await create.execute(adminActor(), {
      gymOrgId,
      name: LeadName.create('Priya'),
      phone: LeadPhone.create('9876543210'),
      email: LeadEmail.create('priya@gym.test'),
      source: null,
      interest: null,
      notes: null,
    });
    await expect(
      convert.execute(adminActor('TRAINER'), {
        gymOrgId,
        leadId: toLeadId(created.lead.id),
        basePlanId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        basePaymentStatus: 'paid',
        addonPlanId: null,
        addonPaymentStatus: null,
      }),
    ).rejects.toBeInstanceOf(LeadForbiddenError);
  });
});
