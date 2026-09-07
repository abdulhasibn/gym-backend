import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toUserId } from '../../../../domain/shared/user-id';
import { CreateGymOrgPolicy } from '../../application/create-gym-org.policy';
import { CreateGymOrgUseCase } from '../../application/create-gym-org.use-case';
import { GetGymOrgUseCase } from '../../application/get-gym-org.use-case';
import { GetMyGymUseCase } from '../../application/get-my-gym.use-case';
import { GymOrgReadForbiddenError } from '../../application/gym-org-read-forbidden.error';
import { ListMyGymOrgsUseCase } from '../../application/list-my-gym-orgs.use-case';
import { toGymOrgId } from '../../domain/gym-org-id';
import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';
import { InMemoryGymOrgRepository } from '../fakes/in-memory-gym-org.repository';

const owner: AuthenticatedActor = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  roleCode: 'ADMIN',
  lane: 'STAFF',
  email: 'owner@example.com',
  staffCode: 'STF-OWNER',
};

const client: AuthenticatedActor = {
  userId: toUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  roleCode: 'CLIENT',
  lane: 'CLIENT',
  email: 'member@example.com',
  staffCode: null,
};

async function seedGym(gymOrgs: InMemoryGymOrgRepository) {
  return new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy()).execute(
    { ...owner, roleCode: 'STAFF_UNASSIGNED' },
    {
      name: GymOrgName.create('Iron Temple'),
      address: '12 Lift St',
      contactPhone: '+15550001111',
      contactEmail: 'desk@irontemple.example',
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    },
  );
}

describe('ListMyGymOrgsUseCase / GetGymOrgUseCase client membership', () => {
  it('lists and gets the gym for a client with an ACTIVE membership', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const created = await seedGym(gymOrgs);
    gymOrgs.seedClientMembership(toGymOrgId(created.id), client.userId);

    const listed = await new ListMyGymOrgsUseCase(gymOrgs).execute(client);
    expect(listed).toEqual([
      {
        id: created.id,
        name: 'Iron Temple',
        timezone: 'Asia/Kolkata',
        isOwner: false,
      },
    ]);

    const detail = await new GetGymOrgUseCase(gymOrgs).execute(client, toGymOrgId(created.id));
    expect(detail).toMatchObject({
      id: created.id,
      name: 'Iron Temple',
      address: '12 Lift St',
      contactPhone: '+15550001111',
      contactEmail: 'desk@irontemple.example',
      timezone: 'Asia/Kolkata',
      isOwner: false,
    });
  });

  it('returns an empty list and 404 when the client has no ACTIVE membership', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const created = await seedGym(gymOrgs);

    const listed = await new ListMyGymOrgsUseCase(gymOrgs).execute(client);
    expect(listed).toEqual([]);

    await expect(
      new GetGymOrgUseCase(gymOrgs).execute(client, toGymOrgId(created.id)),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('does not list client-subscribed gyms on the staff affiliation path', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const created = await seedGym(gymOrgs);
    gymOrgs.seedClientMembership(toGymOrgId(created.id), owner.userId);

    const listed = await new ListMyGymOrgsUseCase(gymOrgs).execute({
      ...owner,
      userId: toUserId('99999999-9999-4999-8999-999999999999'),
      roleCode: 'TRAINER',
    });
    expect(listed).toEqual([]);
  });
});

describe('GetMyGymUseCase', () => {
  it('returns the ACTIVE membership gym for a CLIENT without a gymOrgId', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const created = await seedGym(gymOrgs);
    gymOrgs.seedClientMembership(toGymOrgId(created.id), client.userId);

    const detail = await new GetMyGymUseCase(gymOrgs).execute(client);
    expect(detail).toMatchObject({
      id: created.id,
      name: 'Iron Temple',
      address: '12 Lift St',
      isOwner: false,
    });
  });

  it('returns 404 when the CLIENT has no ACTIVE membership', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    await seedGym(gymOrgs);

    await expect(new GetMyGymUseCase(gymOrgs).execute(client)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('forbids staff actors', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();

    await expect(new GetMyGymUseCase(gymOrgs).execute(owner)).rejects.toBeInstanceOf(
      GymOrgReadForbiddenError,
    );
  });
});
