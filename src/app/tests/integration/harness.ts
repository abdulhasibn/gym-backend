import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Express } from 'express';
import { Client } from 'pg';
import supertest from 'supertest';

import { loadEnvironment, type AppConfig } from '../../../config/environment';
import { createSupabaseInfraClient } from '../../../infrastructure/supabase/supabase-client';
import { composeApp } from '../../composition-root';

export interface IntegrationSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly lane: 'CLIENT' | 'STAFF';
  readonly roleCode: string;
  readonly staffCode: string | null;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export const SEED_FOOD_IDLI_ID = 'f00d0000-0000-4000-8000-000000000001';
export const SEED_FOOD_IDLI_PIECE_SERVING_ID = 'f00d5e04-0000-4000-8000-000000010003';
export const SEED_EXERCISE_BENCH_ID = 'e0e00000-0000-4000-8000-000000000001';

export function loadDotEnvIntegration(cwd = process.cwd()): void {
  const envPath = path.join(cwd, '.env.integration');
  let contents: string;
  try {
    contents = readFileSync(envPath, 'utf8');
  } catch {
    throw new Error(
      'Missing .env.integration. Copy .env.integration.example, run `supabase start`, then `pnpm test:integration`.',
    );
  }

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function assertLocalSupabase(source: NodeJS.ProcessEnv = process.env): void {
  const url = source.SUPABASE_URL;
  if (url === undefined || url.trim() === '') {
    throw new Error('SUPABASE_URL is required for integration tests');
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(`SUPABASE_URL is not a valid URL: ${url}`);
  }

  if (!LOOPBACK_HOSTS.has(hostname)) {
    throw new Error(
      `Integration tests refuse non-loopback SUPABASE_URL (${hostname}). Use local supabase start.`,
    );
  }

  const databaseUrl = source.INTEGRATION_DATABASE_URL;
  if (databaseUrl !== undefined && databaseUrl.trim() !== '') {
    const dbHost = new URL(databaseUrl).hostname;
    if (!LOOPBACK_HOSTS.has(dbHost)) {
      throw new Error(
        `Integration tests refuse non-loopback INTEGRATION_DATABASE_URL (${dbHost}).`,
      );
    }
  }
}

export function loadIntegrationConfig(): AppConfig {
  return loadEnvironment({
    ...process.env,
    NODE_ENV: 'test',
    PORT: process.env.PORT === '0' || process.env.PORT === undefined ? '3000' : process.env.PORT,
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'silent',
  });
}

export function loadIntegrationApp(): { app: Express; config: AppConfig } {
  const config = loadIntegrationConfig();
  const { app } = composeApp(config);
  return { app, config };
}

export function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}-${Math.random().toString(16).slice(2, 8)}@gym.test`;
}

export async function resetLocalDb(): Promise<void> {
  const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim() === '') {
    throw new Error('INTEGRATION_DATABASE_URL is required to reset the local database');
  }

  const sqlPath = path.join(process.cwd(), 'scripts/sql/reset-dev-data.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function signupViaOtp(
  app: Express,
  input: { readonly lane: 'CLIENT' | 'STAFF'; readonly name: string; readonly email?: string },
): Promise<IntegrationSession> {
  const email = input.email ?? uniqueEmail(input.lane.toLowerCase());
  const request = await supertest(app).post('/auth/otp/request').send({ email });
  if (request.status !== 202) {
    throw new Error(`OTP request failed (${request.status}): ${JSON.stringify(request.body)}`);
  }

  const token = await readOtpToken(email);
  const verify = await supertest(app).post('/auth/otp/verify').send({
    email,
    token,
    lane: input.lane,
    name: input.name,
  });
  if (verify.status !== 200) {
    throw new Error(`OTP verify failed (${verify.status}): ${JSON.stringify(verify.body)}`);
  }

  return {
    accessToken: verify.body.session.accessToken as string,
    refreshToken: verify.body.session.refreshToken as string,
    userId: verify.body.user.id as string,
    email: verify.body.user.email as string,
    name: verify.body.user.name as string,
    lane: verify.body.user.lane as 'CLIENT' | 'STAFF',
    roleCode: verify.body.user.roleCode as string,
    staffCode: (verify.body.user.staffCode as string | null) ?? null,
  };
}

async function readOtpToken(email: string): Promise<string> {
  const fromInbox = await pollMailboxOtp(email);
  if (fromInbox !== null) {
    return fromInbox;
  }

  return generateLinkOtp(email);
}

async function pollMailboxOtp(email: string): Promise<string | null> {
  const base = process.env.INBUCKET_URL ?? 'http://127.0.0.1:54324';
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    const mailpit = await readMailpitOtp(base, email);
    if (mailpit !== null) {
      return mailpit;
    }
    const inbucket = await readInbucketOtp(base, email);
    if (inbucket !== null) {
      return inbucket;
    }
    await sleep(250);
  }

  return null;
}

async function readMailpitOtp(base: string, email: string): Promise<string | null> {
  try {
    const listed = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(email)}`);
    if (!listed.ok) {
      return null;
    }
    const body = (await listed.json()) as {
      readonly messages?: ReadonlyArray<{ readonly ID?: string }>;
    };
    const latest = body.messages?.[0];
    if (latest?.ID === undefined) {
      return null;
    }
    const detail = await fetch(`${base}/api/v1/message/${latest.ID}`);
    if (!detail.ok) {
      return null;
    }
    const message = (await detail.json()) as { readonly Text?: string; readonly HTML?: string };
    return extractOtp(`${message.Text ?? ''}\n${message.HTML ?? ''}`);
  } catch {
    return null;
  }
}

async function readInbucketOtp(base: string, email: string): Promise<string | null> {
  try {
    const mailbox = encodeURIComponent(email);
    const listed = await fetch(`${base}/api/v1/mailbox/${mailbox}`);
    if (!listed.ok) {
      return null;
    }
    const messages = (await listed.json()) as ReadonlyArray<{ readonly id?: string }>;
    const latest = messages[messages.length - 1];
    if (latest?.id === undefined) {
      return null;
    }
    const detail = await fetch(`${base}/api/v1/mailbox/${mailbox}/${latest.id}`);
    if (!detail.ok) {
      return null;
    }
    const body = (await detail.json()) as {
      readonly body?: { readonly text?: string; readonly html?: string };
    };
    return extractOtp(`${body.body?.text ?? ''}\n${body.body?.html ?? ''}`);
  } catch {
    return null;
  }
}

function extractOtp(text: string): string | null {
  const match = text.match(/\b(\d{6,10})\b/);
  return match?.[1] ?? null;
}

async function generateLinkOtp(email: string): Promise<string> {
  const client = createSupabaseInfraClient(loadIntegrationConfig());
  const { data, error } = await client.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error !== null) {
    throw new Error(`generateLink failed for ${email}: ${error.message}`);
  }
  const otp = data.properties.email_otp;
  if (otp === undefined || otp.trim() === '') {
    throw new Error(`generateLink returned no email_otp for ${email}`);
  }
  return otp;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function createGymOrg(
  app: Express,
  accessToken: string,
  name = 'North Star Fitness',
): Promise<string> {
  const created = await supertest(app)
    .post('/gym-orgs')
    .set(authHeader(accessToken))
    .send({ name, timezone: 'Asia/Kolkata' });
  if (created.status !== 201) {
    throw new Error(`Create gym failed (${created.status}): ${JSON.stringify(created.body)}`);
  }
  return created.body.gymOrg.id as string;
}

export async function createBaseAndAddonPlans(
  app: Express,
  accessToken: string,
  gymOrgId: string,
): Promise<{ readonly basePlanId: string; readonly addonPlanId: string }> {
  const base = await supertest(app)
    .post(`/gym-orgs/${gymOrgId}/plans`)
    .set(authHeader(accessToken))
    .send({ name: 'Monthly', kind: 'BASE', durationDays: 30, price: 999 });
  if (base.status !== 201) {
    throw new Error(`Create BASE plan failed (${base.status}): ${JSON.stringify(base.body)}`);
  }

  const addon = await supertest(app)
    .post(`/gym-orgs/${gymOrgId}/plans`)
    .set(authHeader(accessToken))
    .send({
      name: 'PT Addon',
      kind: 'ADDON',
      capability: 'TRAINER_COACHING',
      durationDays: 30,
      price: 1500,
    });
  if (addon.status !== 201) {
    throw new Error(`Create ADDON plan failed (${addon.status}): ${JSON.stringify(addon.body)}`);
  }

  return {
    basePlanId: base.body.plan.id as string,
    addonPlanId: addon.body.plan.id as string,
  };
}

export async function inviteAndAcceptClient(input: {
  readonly app: Express;
  readonly adminToken: string;
  readonly gymOrgId: string;
  readonly basePlanId: string;
  readonly addonPlanId?: string;
  readonly classGrants?: readonly string[];
  readonly profileAttributes?: readonly string[];
}): Promise<IntegrationSession> {
  const client = await signupViaOtp(input.app, { lane: 'CLIENT', name: 'Alex Client' });
  const body: Record<string, unknown> = {
    inviteeName: 'Alex Client',
    invitedEmail: client.email,
    basePlanId: input.basePlanId,
    basePaymentStatus: 'paid',
  };
  if (input.addonPlanId !== undefined) {
    body.addonPlanId = input.addonPlanId;
    body.addonPaymentStatus = 'paid';
  }

  const invite = await supertest(input.app)
    .post(`/gym-orgs/${input.gymOrgId}/membership-invites`)
    .set(authHeader(input.adminToken))
    .send(body);
  if (invite.status !== 201) {
    throw new Error(
      `Create membership invite failed (${invite.status}): ${JSON.stringify(invite.body)}`,
    );
  }

  const accepted = await supertest(input.app)
    .post(`/membership-invites/${invite.body.membershipInvite.id}/accept`)
    .set(authHeader(client.accessToken))
    .send({
      optionalProfileAttributes: input.profileAttributes ?? [],
      optionalClassGrants: input.classGrants ?? [],
    });
  if (accepted.status !== 200) {
    throw new Error(
      `Accept membership invite failed (${accepted.status}): ${JSON.stringify(accepted.body)}`,
    );
  }

  return client;
}
