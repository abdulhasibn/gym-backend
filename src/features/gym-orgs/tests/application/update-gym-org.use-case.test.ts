import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toUserId } from '../../../../domain/shared/user-id';
import { CreateGymOrgPolicy } from '../../application/create-gym-org.policy';
import { CreateGymOrgUseCase } from '../../application/create-gym-org.use-case';
import { GetGymOrgUseCase } from '../../application/get-gym-org.use-case';
import { GymOrgAdminPolicy } from '../../application/gym-org-admin.policy';
import { GymOrgWriteForbiddenError } from '../../application/gym-org-write-forbidden.error';
import { UpdateGymOrgUseCase } from '../../application/update-gym-org.use-case';
import { toGymOrgId } from '../../domain/gym-org-id';
import { GymOrgName } from '../../domain/gym-org-name.value-object';
import { IanaTimezone } from '../../domain/iana-timezone.value-object';
import { FixedClock } from '../fakes/fixed-clock';
import { InMemoryGymOrgRepository } from '../fakes/in-memory-gym-org.repository';

const owner: AuthenticatedActor = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  roleCode: 'ADMIN',
  lane: 'STAFF',
  email: 'owner@example.com',
  staffCode: 'STF-OWNER',
};

describe('UpdateGymOrgUseCase', () => {
  it('updates an organization for a live admin', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
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

    const useCase = new UpdateGymOrgUseCase(
      gymOrgs,
      new GymOrgAdminPolicy(gymOrgs),
      new FixedClock(new Date('2026-08-04T12:00:00.000Z')),
    );

    const updated = await useCase.execute(owner, {
      gymOrgId: toGymOrgId(created.id),
      name: GymOrgName.create('North Star HQ'),
      address: '12 Main',
      contactPhone: null,
      contactEmail: 'desk@example.com',
      logoUrl: null,
      timezone: IanaTimezone.create('Asia/Kolkata'),
    });

    expect(updated.name).toBe('North Star HQ');
    expect(updated.address).toBe('12 Main');
    expect(updated.updatedAt).toBe('2026-08-04T12:00:00.000Z');

    const detail = await new GetGymOrgUseCase(gymOrgs).execute(owner, toGymOrgId(created.id));
    expect(detail.name).toBe('North Star HQ');
    expect(detail.isOwner).toBe(true);
  });

  it('forbids non-admins and non-affiliated admins', async () => {
    const gymOrgs = new InMemoryGymOrgRepository();
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

    const useCase = new UpdateGymOrgUseCase(
      gymOrgs,
      new GymOrgAdminPolicy(gymOrgs),
      new FixedClock(new Date('2026-08-04T12:00:00.000Z')),
    );

    await expect(
      useCase.execute(
        { ...owner, roleCode: 'TRAINER' },
        {
          gymOrgId: toGymOrgId(created.id),
          name: GymOrgName.create('X'),
          address: null,
          contactPhone: null,
          contactEmail: null,
          logoUrl: null,
          timezone: IanaTimezone.create('Asia/Kolkata'),
        },
      ),
    ).rejects.toBeInstanceOf(GymOrgWriteForbiddenError);

    await expect(
      useCase.execute(
        {
          ...owner,
          userId: toUserId('99999999-9999-4999-8999-999999999999'),
        },
        {
          gymOrgId: toGymOrgId(created.id),
          name: GymOrgName.create('X'),
          address: null,
          contactPhone: null,
          contactEmail: null,
          logoUrl: null,
          timezone: IanaTimezone.create('Asia/Kolkata'),
        },
      ),
    ).rejects.toBeInstanceOf(GymOrgWriteForbiddenError);

    await expect(
      new GetGymOrgUseCase(gymOrgs).execute(
        owner,
        toGymOrgId('00000000-0000-4000-8000-000000000099'),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
