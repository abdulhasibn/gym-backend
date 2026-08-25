import type { Express } from 'express';
import supertest from 'supertest';
import { expect } from 'vitest';

import {
  authHeader,
  createGymOrg,
  loadIntegrationApp,
  resetLocalDb,
  signupViaOtp,
  uniqueEmail,
  type IntegrationSession,
} from '../integration/harness';

export {
  authHeader,
  loadIntegrationApp,
  resetLocalDb,
  signupViaOtp,
  uniqueEmail,
  SEED_FOOD_IDLI_ID,
  SEED_FOOD_IDLI_PIECE_SERVING_ID,
  SEED_EXERCISE_BENCH_ID,
  type IntegrationSession,
} from '../integration/harness';

export const IRONCORE_NAME = 'IronCore Gym';
export const TITAN_NAME = 'Titan Fitness';

export const IRONCORE_BASE_PLAN = {
  name: 'IronCore Monthly',
  kind: 'BASE' as const,
  durationDays: 30,
  price: 1500,
};

export const IRONCORE_ADDON_PLAN = {
  name: 'Personal Training',
  kind: 'ADDON' as const,
  capability: 'TRAINER_COACHING' as const,
  durationDays: 30,
  price: 2000,
};

export interface GymWorld {
  readonly app: Express;
  readonly owner: IntegrationSession;
  readonly gymOrgId: string;
  readonly gymName: string;
  readonly basePlanId: string;
  readonly addonPlanId: string;
}

export interface TrainerAffiliation {
  readonly session: IntegrationSession;
  readonly trainerProfileId: string;
  readonly staffInviteId: string;
}

export interface MembershipInviteResult {
  readonly inviteId: string;
  readonly status: string;
}

export interface AcceptedMembership {
  readonly client: IntegrationSession;
  readonly inviteId: string;
  readonly membershipId: string;
}

export async function signupCharacter(
  app: Express,
  input: {
    readonly name: string;
    readonly lane: 'CLIENT' | 'STAFF';
    readonly email?: string;
  },
): Promise<IntegrationSession> {
  return signupViaOtp(app, {
    lane: input.lane,
    name: input.name,
    email: input.email,
  });
}

export async function createIronCorePlans(
  app: Express,
  accessToken: string,
  gymOrgId: string,
): Promise<{ readonly basePlanId: string; readonly addonPlanId: string }> {
  const header = authHeader(accessToken);

  const base = await supertest(app)
    .post(`/gym-orgs/${gymOrgId}/plans`)
    .set(header)
    .send(IRONCORE_BASE_PLAN);
  if (base.status !== 201) {
    throw new Error(`Create IronCore BASE plan failed (${base.status}): ${JSON.stringify(base.body)}`);
  }

  const addon = await supertest(app)
    .post(`/gym-orgs/${gymOrgId}/plans`)
    .set(header)
    .send(IRONCORE_ADDON_PLAN);
  if (addon.status !== 201) {
    throw new Error(
      `Create IronCore ADDON plan failed (${addon.status}): ${JSON.stringify(addon.body)}`,
    );
  }

  return {
    basePlanId: base.body.plan.id as string,
    addonPlanId: addon.body.plan.id as string,
  };
}

export async function provisionGym(
  app: Express,
  input: {
    readonly ownerName: string;
    readonly gymName: string;
  },
): Promise<GymWorld> {
  const owner = await signupCharacter(app, { lane: 'STAFF', name: input.ownerName });
  const gymOrgId = await createGymOrg(app, owner.accessToken, input.gymName);
  const plans = await createIronCorePlans(app, owner.accessToken, gymOrgId);
  return {
    app,
    owner,
    gymOrgId,
    gymName: input.gymName,
    basePlanId: plans.basePlanId,
    addonPlanId: plans.addonPlanId,
  };
}

export async function provisionIronCore(app: Express): Promise<GymWorld> {
  return provisionGym(app, { ownerName: 'Arif Khan', gymName: IRONCORE_NAME });
}

export async function provisionTitan(app: Express): Promise<GymWorld> {
  return provisionGym(app, { ownerName: 'Titan Owner', gymName: TITAN_NAME });
}

export async function inviteAndAcceptTrainer(
  world: GymWorld,
  trainerName = 'Rizwan Ali',
): Promise<TrainerAffiliation> {
  const session = await signupCharacter(world.app, { lane: 'STAFF', name: trainerName });
  if (session.staffCode === null) {
    throw new Error(`Staff signup for ${trainerName} returned no staffCode`);
  }

  const created = await supertest(world.app)
    .post(`/gym-orgs/${world.gymOrgId}/staff-invites`)
    .set(authHeader(world.owner.accessToken))
    .send({ staffCode: session.staffCode, targetRole: 'TRAINER' });
  if (created.status !== 201) {
    throw new Error(
      `Create staff invite failed (${created.status}): ${JSON.stringify(created.body)}`,
    );
  }
  const staffInviteId = created.body.staffInvite.id as string;

  const accepted = await supertest(world.app)
    .post(`/gym-orgs/staff-invites/${staffInviteId}/accept`)
    .set(authHeader(session.accessToken));
  if (accepted.status !== 200) {
    throw new Error(
      `Accept staff invite failed (${accepted.status}): ${JSON.stringify(accepted.body)}`,
    );
  }

  const trainers = await supertest(world.app)
    .get(`/gym-orgs/${world.gymOrgId}/trainers`)
    .set(authHeader(world.owner.accessToken));
  if (trainers.status !== 200) {
    throw new Error(`List trainers failed (${trainers.status}): ${JSON.stringify(trainers.body)}`);
  }

  const profile = trainers.body.trainers.items.find(
    (row: { userId: string }) => row.userId === session.userId,
  ) as { trainerProfileId: string } | undefined;
  if (profile === undefined) {
    throw new Error(`Trainer ${trainerName} missing from gym trainer list after accept`);
  }

  return {
    session,
    trainerProfileId: profile.trainerProfileId,
    staffInviteId,
  };
}

export async function createMembershipInvite(
  world: GymWorld,
  input: {
    readonly client: IntegrationSession;
    readonly inviteeName?: string;
    readonly basePaymentStatus?: 'paid' | 'unpaid' | 'partial';
    readonly includeAddon?: boolean;
    readonly addonPaymentStatus?: 'paid' | 'unpaid' | 'partial';
  },
): Promise<MembershipInviteResult> {
  const body: Record<string, unknown> = {
    inviteeName: input.inviteeName ?? input.client.name,
    invitedEmail: input.client.email,
    basePlanId: world.basePlanId,
    basePaymentStatus: input.basePaymentStatus ?? 'paid',
  };
  if (input.includeAddon !== false) {
    body.addonPlanId = world.addonPlanId;
    body.addonPaymentStatus = input.addonPaymentStatus ?? 'paid';
  }

  const invite = await supertest(world.app)
    .post(`/gym-orgs/${world.gymOrgId}/membership-invites`)
    .set(authHeader(world.owner.accessToken))
    .send(body);
  if (invite.status !== 201) {
    throw new Error(
      `Create membership invite failed (${invite.status}): ${JSON.stringify(invite.body)}`,
    );
  }

  return {
    inviteId: invite.body.membershipInvite.id as string,
    status: invite.body.membershipInvite.status as string,
  };
}

export async function acceptInviteWithGrants(
  world: GymWorld,
  input: {
    readonly client: IntegrationSession;
    readonly inviteId: string;
    readonly optionalProfileAttributes?: readonly string[];
    readonly optionalClassGrants?: readonly string[];
  },
): Promise<{ readonly status: number; readonly body: unknown }> {
  const accepted = await supertest(world.app)
    .post(`/membership-invites/${input.inviteId}/accept`)
    .set(authHeader(input.client.accessToken))
    .send({
      optionalProfileAttributes: input.optionalProfileAttributes ?? [],
      optionalClassGrants: input.optionalClassGrants ?? [],
    });
  return { status: accepted.status, body: accepted.body };
}

export async function onboardClient(
  world: GymWorld,
  input: {
    readonly name: string;
    readonly basePaymentStatus?: 'paid' | 'unpaid' | 'partial';
    readonly includeAddon?: boolean;
    readonly addonPaymentStatus?: 'paid' | 'unpaid' | 'partial';
    readonly optionalProfileAttributes?: readonly string[];
    readonly optionalClassGrants?: readonly string[];
  },
): Promise<AcceptedMembership> {
  const client = await signupCharacter(world.app, { lane: 'CLIENT', name: input.name });
  const invite = await createMembershipInvite(world, {
    client,
    inviteeName: input.name,
    basePaymentStatus: input.basePaymentStatus,
    includeAddon: input.includeAddon,
    addonPaymentStatus: input.addonPaymentStatus,
  });
  const accepted = await acceptInviteWithGrants(world, {
    client,
    inviteId: invite.inviteId,
    optionalProfileAttributes: input.optionalProfileAttributes,
    optionalClassGrants: input.optionalClassGrants,
  });
  if (accepted.status !== 200) {
    throw new Error(
      `Accept membership invite failed (${accepted.status}): ${JSON.stringify(accepted.body)}`,
    );
  }

  const membershipId = await findMembershipId(world, client.userId);
  return { client, inviteId: invite.inviteId, membershipId };
}

export async function findMembershipId(world: GymWorld, clientUserId: string): Promise<string> {
  const members = await listMembers(world);
  const row = members.find((item) => item.clientUserId === clientUserId);
  if (row === undefined) {
    throw new Error(`No membership found for client ${clientUserId} at ${world.gymName}`);
  }
  return row.membershipId;
}

export async function listMembers(
  world: GymWorld,
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
): Promise<
  ReadonlyArray<{
    readonly membershipId: string;
    readonly clientUserId: string;
    readonly status: string;
    readonly checkInBlocked?: boolean;
  }>
> {
  const response = await supertest(world.app)
    .get(`/gym-orgs/${world.gymOrgId}/members`)
    .query({ status })
    .set(authHeader(world.owner.accessToken));
  if (response.status !== 200) {
    throw new Error(`List members failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.members as ReadonlyArray<{
    membershipId: string;
    clientUserId: string;
    status: string;
    checkInBlocked?: boolean;
  }>;
}

export async function listMySubscriptions(
  world: GymWorld,
  client: IntegrationSession,
): Promise<
  ReadonlyArray<{
    readonly id: string;
    readonly kind: string;
    readonly paymentStatus: string;
    readonly priceAmount: number;
    readonly durationDays: number;
  }>
> {
  const response = await supertest(world.app)
    .get(`/gym-orgs/${world.gymOrgId}/my-subscriptions`)
    .set(authHeader(client.accessToken));
  if (response.status !== 200) {
    throw new Error(
      `List my-subscriptions failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }
  return response.body.subscriptions as ReadonlyArray<{
    id: string;
    kind: string;
    paymentStatus: string;
    priceAmount: number;
    durationDays: number;
  }>;
}

export async function listClientSubscriptions(
  world: GymWorld,
  clientUserId: string,
): Promise<
  ReadonlyArray<{
    readonly id: string;
    readonly kind: string;
    readonly paymentStatus: string;
    readonly priceAmount: number;
  }>
> {
  const response = await supertest(world.app)
    .get(`/gym-orgs/${world.gymOrgId}/clients/${clientUserId}/subscriptions`)
    .set(authHeader(world.owner.accessToken));
  if (response.status !== 200) {
    throw new Error(
      `List client subscriptions failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }
  return response.body.subscriptions as ReadonlyArray<{
    id: string;
    kind: string;
    paymentStatus: string;
    priceAmount: number;
  }>;
}

export async function getMyDataGrants(
  world: GymWorld,
  client: IntegrationSession,
): Promise<{
  readonly profileAttributes: readonly string[];
  readonly classGrants: readonly string[];
}> {
  const response = await supertest(world.app)
    .get(`/gym-orgs/${world.gymOrgId}/my-data-grants`)
    .set(authHeader(client.accessToken));
  if (response.status !== 200) {
    throw new Error(`Get data grants failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return {
    profileAttributes: response.body.dataGrants.profileAttributes as string[],
    classGrants: response.body.dataGrants.classGrants as string[],
  };
}

export async function expectActiveMembership(
  world: GymWorld,
  client: IntegrationSession,
  options: {
    readonly expectAddon?: boolean;
    readonly basePrice?: number;
    readonly addonPrice?: number;
    readonly flowId?: string;
  } = {},
): Promise<{ readonly membershipId: string }> {
  const label = options.flowId ?? 'MEMBER';
  const members = await listMembers(world);
  const active = members.filter(
    (row) => row.clientUserId === client.userId && row.status === 'ACTIVE',
  );
  expect(active, `${label}: expected exactly one ACTIVE membership`).toHaveLength(1);

  const subscriptions = await listMySubscriptions(world, client);
  const base = subscriptions.find((row) => row.kind === 'BASE');
  expect(base, `${label}: BASE subscription missing`).toBeDefined();
  expect(base!.priceAmount).toBe(options.basePrice ?? IRONCORE_BASE_PLAN.price);
  expect(base!.durationDays).toBe(IRONCORE_BASE_PLAN.durationDays);

  if (options.expectAddon !== false) {
    const addon = subscriptions.find((row) => row.kind === 'ADDON');
    expect(addon, `${label}: ADDON subscription missing`).toBeDefined();
    expect(addon!.priceAmount).toBe(options.addonPrice ?? IRONCORE_ADDON_PLAN.price);
  }

  const grants = await getMyDataGrants(world, client);
  expect(grants.profileAttributes).toEqual(
    expect.arrayContaining(['DOB', 'HEIGHT', 'WEIGHT']),
  );

  return { membershipId: active[0]!.membershipId };
}

export async function setCheckInBlock(
  world: GymWorld,
  membershipId: string,
  blocked: boolean,
): Promise<void> {
  const response = await supertest(world.app)
    .patch(`/gym-orgs/${world.gymOrgId}/members/${membershipId}/check-in-block`)
    .set(authHeader(world.owner.accessToken))
    .send({ blocked });
  if (response.status !== 200) {
    throw new Error(
      `Check-in block failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }
}

export async function offboardMember(world: GymWorld, membershipId: string): Promise<void> {
  const response = await supertest(world.app)
    .post(`/gym-orgs/${world.gymOrgId}/members/${membershipId}/offboard`)
    .set(authHeader(world.owner.accessToken));
  if (response.status !== 200) {
    throw new Error(`Offboard failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  expect(response.body.membership.status).toBe('INACTIVE');
}

export async function clientCheckIn(
  world: GymWorld,
  client: IntegrationSession,
): Promise<{ readonly status: number; readonly body: unknown }> {
  const response = await supertest(world.app)
    .post(`/gym-orgs/${world.gymOrgId}/attendances/check-in`)
    .set(authHeader(client.accessToken));
  return { status: response.status, body: response.body };
}

export async function markSubscriptionPayment(
  world: GymWorld,
  subscriptionId: string,
  paymentStatus: 'paid' | 'unpaid' | 'partial',
  amountPaid?: number,
): Promise<void> {
  const body: Record<string, unknown> = { paymentStatus };
  if (amountPaid !== undefined) {
    body.amountPaid = amountPaid;
  }
  const response = await supertest(world.app)
    .patch(`/gym-orgs/${world.gymOrgId}/subscriptions/${subscriptionId}/payment`)
    .set(authHeader(world.owner.accessToken))
    .send(body);
  if (response.status !== 200) {
    throw new Error(
      `Mark payment failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }
}

export async function assignTrainerToMember(
  world: GymWorld,
  membershipId: string,
  trainerProfileId: string,
): Promise<void> {
  const response = await supertest(world.app)
    .post(`/gym-orgs/${world.gymOrgId}/members/${membershipId}/assign-trainer`)
    .set(authHeader(world.owner.accessToken))
    .send({ trainerProfileId });
  if (response.status !== 200) {
    throw new Error(
      `Assign trainer failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }
}
