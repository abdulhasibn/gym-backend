import express, { type RequestHandler } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { CreateGymOrgPolicy } from '../../application/create-gym-org.policy';
import { CreateGymOrgUseCase } from '../../application/create-gym-org.use-case';
import { ListMyGymOrgsUseCase } from '../../application/list-my-gym-orgs.use-case';
import { GymOrgController } from '../../presentation/gym-org.controller';
import { mapGymOrgError } from '../../presentation/gym-org.error-mapper';
import { createGymOrgRouter } from '../../presentation/gym-org.routes';
import { InMemoryGymOrgRepository } from '../fakes/in-memory-gym-org.repository';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

function createTestApp(roleCode: 'STAFF_UNASSIGNED' | 'CLIENT' = 'STAFF_UNASSIGNED') {
  const gymOrgs = new InMemoryGymOrgRepository();
  const controller = new GymOrgController(
    new CreateGymOrgUseCase(gymOrgs, new CreateGymOrgPolicy()),
    new ListMyGymOrgsUseCase(gymOrgs),
  );
  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, {
      userId: toUserId('11111111-1111-4111-8111-111111111111'),
      roleCode,
      lane: roleCode === 'CLIENT' ? 'CLIENT' : 'STAFF',
      email: 'owner@example.com',
      staffCode: roleCode === 'CLIENT' ? null : 'STF-OWNER',
    });
    next();
  };
  const app = express();
  app.use(express.json());
  app.use('/gym-orgs', createGymOrgRouter(controller, authenticate));
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapGymOrgError]));
  return app;
}

describe('gym-org routes', () => {
  it('creates and lists the authenticated staff member’s organization', async () => {
    const app = createTestApp();

    const create = await supertest(app)
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness', contactEmail: 'hello@example.com' })
      .expect(201);

    expect(create.body.gymOrg).toMatchObject({
      id: 'gym-org-1',
      name: 'North Star Fitness',
      contactEmail: 'hello@example.com',
      timezone: 'Asia/Kolkata',
    });

    const list = await supertest(app).get('/gym-orgs').expect(200);
    expect(list.body.gymOrgs).toEqual([
      { id: 'gym-org-1', name: 'North Star Fitness', timezone: 'Asia/Kolkata', isOwner: true },
    ]);
  });

  it('accepts explicit nulls for optional create fields', async () => {
    const create = await supertest(createTestApp())
      .post('/gym-orgs')
      .send({
        name: 'North Star Fitness',
        address: null,
        contactPhone: null,
        contactEmail: null,
        logoUrl: null,
        timezone: 'Asia/Kolkata',
      })
      .expect(201);

    expect(create.body.gymOrg).toMatchObject({
      name: 'North Star Fitness',
      address: null,
      contactPhone: null,
      contactEmail: null,
      logoUrl: null,
      timezone: 'Asia/Kolkata',
    });
  });

  it('rejects organization creation by clients', async () => {
    const response = await supertest(createTestApp('CLIENT'))
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness' })
      .expect(403);

    expect(response.body.error.code).toBe('GYM_ORG_CREATION_FORBIDDEN');
  });

  it('returns validation errors for an invalid timezone', async () => {
    const response = await supertest(createTestApp())
      .post('/gym-orgs')
      .send({ name: 'North Star Fitness', timezone: 'Not/A-Timezone' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns validation errors for a blank organization name', async () => {
    const response = await supertest(createTestApp())
      .post('/gym-orgs')
      .send({ name: '   ' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
