import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toUserId } from '../../../../domain/shared/user-id';
import { CreateGymOrgPolicy } from '../../application/create-gym-org.policy';
import { CreateGymOrgUseCase } from '../../application/create-gym-org.use-case';
import { GymOrgCreationForbiddenError } from '../../application/gym-org-creation-forbidden.error';
import { ListMyGymOrgsUseCase } from '../../application/list-my-gym-orgs.use-case';
import { toGymOrgId } from '../../domain/gym-org-id';
import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';
import { InMemoryGymOrgRepository } from '../fakes/in-memory-gym-org.repository';

const staffActor: AuthenticatedActor = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  roleCode: 'STAFF_UNASSIGNED',
  lane: 'STAFF',
  email: 'owner@example.com',
  staffCode: 'STF-OWNER',
};

describe('CreateGymOrgUseCase', () => {
  it('creates a gym organization for an unassigned staff member', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const useCase = new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy());

    const gymOrg = await useCase.execute(staffActor, {
      name: GymOrgName.create('North Star Fitness'),
      address: null,
      contactPhone: null,
      contactEmail: 'hello@example.com',
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    });

    expect(gymOrg.name).toBe('North Star Fitness');
    expect(gymOrg.ownerUserId).toBe(staffActor.userId);

    const list = new ListMyGymOrgsUseCase(gymOrgs);
    await expect(list.execute(staffActor)).resolves.toEqual([
      {
        id: gymOrg.id,
        name: 'North Star Fitness',
        timezone: 'Asia/Kolkata',
        isOwner: true,
      },
    ]);
  });

  it('forbids CLIENT and TRAINER from creating organizations', async () => {
    const useCase = new CreateGymOrgUseCase(
      new InMemoryGymOrgRepository(),
      new CreateGymOrgPolicy(),
    );

    await expect(
      useCase.execute(
        { ...staffActor, roleCode: 'CLIENT', lane: 'CLIENT', staffCode: null },
        {
          name: GymOrgName.create('North Star Fitness'),
          address: null,
          contactPhone: null,
          contactEmail: null,
          logoUrl: null,
          timezone: IanaTimezone.create('Asia/Kolkata'),
        },
      ),
    ).rejects.toBeInstanceOf(GymOrgCreationForbiddenError);

    await expect(
      useCase.execute(
        { ...staffActor, roleCode: 'TRAINER' },
        {
          name: GymOrgName.create('North Star Fitness'),
          address: null,
          contactPhone: null,
          contactEmail: null,
          logoUrl: null,
          timezone: IanaTimezone.create('Asia/Kolkata'),
        },
      ),
    ).rejects.toBeInstanceOf(GymOrgCreationForbiddenError);
  });

  it('lists orgs for trainer affiliations as well as admins', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const created = await new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy()).execute(
      staffActor,
      {
        name: GymOrgName.create('North Star Fitness'),
        address: null,
        contactPhone: null,
        contactEmail: null,
        logoUrl: null,
        timezone: IanaTimezone.create('Asia/Kolkata'),
      },
    );

    const trainerId = toUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    gymOrgs.seedTrainerAffiliation(toGymOrgId(created.id), trainerId);

    const list = new ListMyGymOrgsUseCase(gymOrgs);
    await expect(
      list.execute({
        userId: trainerId,
        roleCode: 'TRAINER',
        lane: 'STAFF',
        email: 'trainer@example.com',
        staffCode: 'STF-TRAINER01',
      }),
    ).resolves.toEqual([
      {
        id: created.id,
        name: 'North Star Fitness',
        timezone: 'Asia/Kolkata',
        isOwner: false,
      },
    ]);
  });
});
