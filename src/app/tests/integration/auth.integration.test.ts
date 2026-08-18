import type { Express } from 'express';
import supertest from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { loadIntegrationApp, resetLocalDb, signupViaOtp, uniqueEmail } from './harness';

describe('auth HTTP (local Supabase)', () => {
  let app: Express;

  beforeAll(() => {
    app = loadIntegrationApp().app;
  });

  beforeEach(async () => {
    await resetLocalDb();
  });

  it('sends an OTP for a new staff email', async () => {
    const response = await supertest(app)
      .post('/auth/otp/request')
      .send({ email: uniqueEmail('otp') });
    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({ status: 'OTP_SENT', isNewUser: true });
  });

  it('provisions a staff member via OTP then returns them from /auth/me', async () => {
    const email = uniqueEmail('staff');
    const session = await signupViaOtp(app, {
      lane: 'STAFF',
      name: 'Owner Admin',
      email,
    });

    expect(session.lane).toBe('STAFF');
    expect(session.roleCode).toBe('STAFF_UNASSIGNED');
    expect(session.staffCode).toEqual(expect.stringMatching(/^STF-/));

    const me = await supertest(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({
      id: session.userId,
      email,
      name: 'Owner Admin',
      lane: 'STAFF',
      roleCode: 'STAFF_UNASSIGNED',
    });
  });

  it('refreshes a session and uses the new access token', async () => {
    const session = await signupViaOtp(app, { lane: 'CLIENT', name: 'Alex Client' });

    const refreshed = await supertest(app)
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.session.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.session.refreshToken).toEqual(expect.any(String));
    expect(refreshed.body.session.accessToken).not.toBe(session.accessToken);

    const me = await supertest(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.session.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(session.userId);
  });

  it('rejects /auth/me without a Bearer token', async () => {
    const response = await supertest(app).get('/auth/me');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'AUTHENTICATION_FAILED' } });
  });

  it('rejects google complete without a Bearer token', async () => {
    const response = await supertest(app)
      .post('/auth/google/complete')
      .send({ lane: 'CLIENT', name: 'Google User' });
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'AUTHENTICATION_FAILED' } });
  });

  it('rejects an invalid refresh token', async () => {
    const response = await supertest(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-real-refresh-token' });
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'AUTHENTICATION_FAILED' } });
  });

  it('rejects an empty refresh body', async () => {
    const response = await supertest(app).post('/auth/refresh').send({});
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });
});
