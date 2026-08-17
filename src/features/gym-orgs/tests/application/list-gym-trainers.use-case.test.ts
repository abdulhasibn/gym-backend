import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toUserId } from '../../../../domain/shared/user-id';
import { CreateGymOrgPolicy } from '../../application/create-gym-org.policy';
import { CreateGymOrgUseCase } from '../../application/create-gym-org.use-case';
import { GymOrgAdminForbiddenError } from '../../application/gym-org-admin-forbidden.error';
import { GymOrgAdminPolicy } from '../../application/gym-org-admin.policy';
import { ListGymTrainersUseCase } from '../../application/list-gym-trainers.use-case';
import { toGymOrgId } from '../../domain/gym-org-id';
import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';
import { InMemoryGymOrgRepository } from '../fakes/in-memory-gym-org.repository';
import { InMemoryTrainerProfileQueries } from '../fakes/in-memory-trainer-profile.queries';

const owner: AuthenticatedActor = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  roleCode: 'ADMIN',
  lane: 'STAFF',
  email: 'owner@example.com',
  staffCode: 'STF-OWNER',
};

const trainerActor: AuthenticatedActor = {
  userId: toUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  roleCode: 'TRAINER',
  lane: 'STAFF',
  email: 'trainer@example.com',
  staffCode: 'STF-TRAINER01',
};

describe('ListGymTrainersUseCase', () => {
  async function setup() {
    const gymOrgs = new InMemoryGymOrgRepository();
    const trainers = new InMemoryTrainerProfileQueries();
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
    const useCase = new ListGymTrainersUseCase(new GymOrgAdminPolicy(gymOrgs), trainers);
    return { gymOrgs, trainers, created, useCase };
  }

  it('lists live trainers at the gym including Admin-as-Trainer', async () => {
    const { trainers, created, useCase } = await setup();
    trainers.seed({
      trainerProfileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: owner.userId,
      gymOrgId: toGymOrgId(created.id),
      name: 'Owner Admin',
      email: 'owner@example.com',
      staffCode: 'STF-OWNER',
      bio: null,
      isAdmin: true,
      createdAt: '2026-08-04T00:00:00.000Z',
    });
    trainers.seed({
      trainerProfileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: trainerActor.userId,
      gymOrgId: toGymOrgId(created.id),
      name: 'Ada Trainer',
      email: 'trainer@example.com',
      staffCode: 'STF-TRAINER01',
      bio: 'PT',
      isAdmin: false,
      createdAt: '2026-08-05T00:00:00.000Z',
    });
    trainers.seed({
      trainerProfileId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      userId: toUserId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      gymOrgId: toGymOrgId('22222222-2222-4222-8222-222222222222'),
      name: 'Other Gym',
      email: 'other@example.com',
      staffCode: 'STF-OTHER',
      bio: null,
      isAdmin: false,
      createdAt: '2026-08-05T00:00:00.000Z',
    });

    const result = await useCase.execute(owner, toGymOrgId(created.id), { limit: 20, offset: 0 });

    expect(result.total).toBe(2);
    expect(result.items.map((row) => row.trainerProfileId)).toEqual([
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    ]);
    expect(result.items[0]).toMatchObject({
      userId: owner.userId,
      name: 'Owner Admin',
      isAdmin: true,
    });
    expect(result.items[1]).toMatchObject({
      name: 'Ada Trainer',
      bio: 'PT',
      isAdmin: false,
    });
  });

  it('paginates the gym trainer list', async () => {
    const { trainers, created, useCase } = await setup();
    trainers.seed({
      trainerProfileId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: owner.userId,
      gymOrgId: toGymOrgId(created.id),
      name: 'Owner Admin',
      email: 'owner@example.com',
      staffCode: 'STF-OWNER',
      bio: null,
      isAdmin: true,
      createdAt: '2026-08-04T00:00:00.000Z',
    });
    trainers.seed({
      trainerProfileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: trainerActor.userId,
      gymOrgId: toGymOrgId(created.id),
      name: 'Ada Trainer',
      email: 'trainer@example.com',
      staffCode: 'STF-TRAINER01',
      bio: null,
      isAdmin: false,
      createdAt: '2026-08-05T00:00:00.000Z',
    });

    const page = await useCase.execute(owner, toGymOrgId(created.id), { limit: 1, offset: 1 });

    expect(page).toMatchObject({ total: 2, limit: 1, offset: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.trainerProfileId).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });

  it('forbids trainers and admins without a live affiliation', async () => {
    const { created, useCase } = await setup();

    await expect(
      useCase.execute(trainerActor, toGymOrgId(created.id), { limit: 20, offset: 0 }),
    ).rejects.toBeInstanceOf(GymOrgAdminForbiddenError);

    const outsider: AuthenticatedActor = {
      ...owner,
      userId: toUserId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
    };
    await expect(
      useCase.execute(outsider, toGymOrgId(created.id), { limit: 20, offset: 0 }),
    ).rejects.toBeInstanceOf(GymOrgAdminForbiddenError);
  });
});
