import supertest from 'supertest';
import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/environment';
import { composeApp } from '../composition-root';

function testConfig(): AppConfig {
  return {
    nodeEnv: 'test',
    port: 0,
    logLevel: 'silent',
    supabase: {
      url: 'https://test-project.supabase.co',
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-role-key',
    },
  };
}

describe('GET /health', () => {
  it('returns 200 with an ok status', async () => {
    const { app } = composeApp(testConfig());

    const response = await supertest(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(typeof response.body.timestamp).toBe('string');
  });
});

describe('unmatched routes', () => {
  it('returns a 404 with a stable error shape', async () => {
    const { app } = composeApp(testConfig());

    const response = await supertest(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});
