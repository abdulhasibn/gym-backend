import { describe, expect, it } from 'vitest';

import { toUserId } from '../../../../domain/shared/user-id';
import { CreateGymOrgPolicy } from '../../application/create-gym-org.policy';
import { CreateGymOrgUseCase } from '../../application/create-gym-org.use-case';
import { GymOrgCreationForbiddenError } from '../../application/gym-org-creation-forbidden.error';
import { ListMyGymOrgsUseCase } from '../../application/list-my-gym-orgs.use-case';
import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';
import { InMemoryGymOrgRepository } from '../fakes/in-memory-gym-org.repository';

const staffActor = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  roleCode: 'STAFF_UNASSIGNED' as const,
  lane: 'STAFF' as const,
  email: 'owner@example.com',
  staffCode: 'STF-OWNER',
};

describe('CreateGymOrgUseCase', () => {
  it('creates an owned gym organization for unassigned staff', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const useCase = new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy());

    const gymOrg = await useCase.execute(staffActor, {
      name: GymOrgName.create(' North Star Fitness '),
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    });

    expect(gymOrg).toMatchObject({
      id: 'gym-org-1',
      name: 'North Star Fitness',
      ownerUserId: staffActor.userId,
      timezone: 'Asia/Kolkata',
    });
  });

  it('rejects client and trainer actors', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const useCase = new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy());
    const command = {
      name: GymOrgName.create('North Star Fitness'),
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    };

    await expect(
      useCase.execute(
        { ...staffActor, roleCode: 'CLIENT', lane: 'CLIENT', staffCode: null },
        command,
      ),
    ).rejects.toBeInstanceOf(GymOrgCreationForbiddenError);
    await expect(
      useCase.execute({ ...staffActor, roleCode: 'TRAINER' }, command),
    ).rejects.toBeInstanceOf(GymOrgCreationForbiddenError);
  });
});

describe('ListMyGymOrgsUseCase', () => {
  it('lists only organizations affiliated with the authenticated actor', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
    const createGymOrg = new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy());
    await createGymOrg.execute(staffActor, {
      name: GymOrgName.create('North Star Fitness'),
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    });

    const result = await new ListMyGymOrgsUseCase(gymOrgs).execute(staffActor);

    expect(result).toEqual([
      { id: 'gym-org-1', name: 'North Star Fitness', timezone: 'Asia/Kolkata', isOwner: true },
    ]);
  });
});
