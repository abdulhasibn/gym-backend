#!/usr/bin/env node
/**
 * Add Roster top-level folder to gym-backend-postman export (Stint 1.6).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const collectionPath = resolve(
  __dir,
  '../../../../../gym-backend-postman/Gym-Backend-API.postman_collection.json',
);

if (!existsSync(collectionPath)) {
  console.error('Collection not found', collectionPath);
  process.exit(1);
}

const c = JSON.parse(readFileSync(collectionPath, 'utf8'));
const HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
];
const ACCEPT_ONLY = [{ key: 'Accept', value: 'application/json' }];

function url(raw, parts, query) {
  const out = { raw, host: ['{{baseUrl}}'], path: parts };
  if (query) out.query = query;
  return out;
}

function example(name, code, status, bodyObj, method, urlObj, body) {
  const orig = {
    method,
    header: body !== undefined ? HEADERS : ACCEPT_ONLY,
    url: urlObj,
  };
  if (body !== undefined) {
    orig.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  return {
    name,
    originalRequest: orig,
    status,
    code,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    cookie: [],
    body: JSON.stringify(bodyObj, null, 2),
  };
}

const err = (code, message) => ({ error: { code, message } });

const member = {
  membershipId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  clientUserId: '22222222-2222-4222-8222-222222222222',
  gymOrgId: '33333333-3333-4333-8333-333333333333',
  status: 'ACTIVE',
  checkInBlocked: false,
  assignedTrainerId: null,
  clientName: 'Ada Client',
  clientEmail: 'ada@example.com',
  clientPhone: null,
  joinedAt: '2026-08-08T12:00:00.000Z',
  leftAt: null,
  basePaymentStatus: 'unpaid',
  baseAmountPaid: 0,
  basePriceAmount: 999,
};

const membershipMut = {
  membershipId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  clientUserId: '22222222-2222-4222-8222-222222222222',
  gymOrgId: '33333333-3333-4333-8333-333333333333',
  status: 'ACTIVE',
  checkInBlocked: false,
  assignedTrainerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  joinedAt: '2026-08-08T12:00:00.000Z',
  leftAt: null,
  updatedAt: '2026-08-11T12:00:00.000Z',
};

const memberFields = `**\`member\` fields:**
- \`membershipId\` (uuid) — Membership id (same as \`{{membershipId}}\`).
- \`clientUserId\` (uuid) — Client user.
- \`gymOrgId\` (uuid) — Tenancy.
- \`status\` (enum) — Values: \`ACTIVE\`, \`INACTIVE\`.
- \`checkInBlocked\` (boolean) — Manual Admin safety valve.
- \`assignedTrainerId\` (uuid or null) — \`trainer_profiles.id\`.
- \`clientName\` / \`clientEmail\` (string) — From \`users\`.
- \`clientPhone\` (string or null) — Optional contact.
- \`joinedAt\` (string, ISO) — Accept time.
- \`leftAt\` (string ISO or null) — Set on offboard.
- \`basePaymentStatus\` (enum or null) — Values: \`paid\`, \`unpaid\`, \`partial\`, or \`null\`.
- \`baseAmountPaid\` / \`basePriceAmount\` (number or null) — BASE line badge.

**\`membership\` (mutation) fields:**
- \`membershipId\`, \`clientUserId\`, \`gymOrgId\` (uuid)
- \`status\` (enum) — Values: \`ACTIVE\`, \`INACTIVE\`.
- \`checkInBlocked\` (boolean)
- \`assignedTrainerId\` (uuid or null)
- \`joinedAt\` / \`leftAt\` / \`updatedAt\` (ISO; \`leftAt\` nullable)`;

if (c.item.some((i) => i.name === 'Roster')) {
  c.item = c.item.filter((i) => i.name !== 'Roster');
}

const folder = {
  name: 'Roster',
  description:
    'Admin/Trainer roster, assign trainer, offboard, check-in block (Stint 1.6). Guide: gym-backend `docs/roster.md`.',
  item: [],
};

const listQuery = [
  {
    key: 'status',
    value: 'ACTIVE',
    description: 'Filter. Values: ACTIVE, INACTIVE. Default ACTIVE for Admin list.',
  },
  {
    key: 'q',
    value: '',
    disabled: true,
    description: 'Optional search on name / email / phone.',
  },
];

const uList = url(
  '{{baseUrl}}/gym-orgs/{{gymOrgId}}/members?status=ACTIVE',
  ['gym-orgs', '{{gymOrgId}}', 'members'],
  listQuery,
);
folder.item.push({
  name: 'List Gym Members',
  event: [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          "if (pm.response.code === 200) {",
          "  const body = pm.response.json();",
          "  const first = body.members && body.members[0];",
          "  if (first && first.membershipId) {",
          "    pm.collectionVariables.set('membershipId', first.membershipId);",
          "  }",
          "}",
        ],
      },
    },
  ],
  request: {
    method: 'GET',
    header: ACCEPT_ONLY,
    url: uList,
    description: `GET /gym-orgs/:gymOrgId/members — Admin full gym roster.

**Auth:** Bearer ADMIN at gym  
**Path:**
- \`gymOrgId\` (uuid) — Gym. Example: \`{{gymOrgId}}\`.

**Query:**
- \`status\` (optional, enum) — Values: \`ACTIVE\`, \`INACTIVE\`. Default: \`ACTIVE\`.
- \`q\` (optional, string) — Search name / email / phone.

**Success \`200\`:** \`{ members: [ member, ... ] }\`

${memberFields}

**Errors:** \`403\` PLAN_FORBIDDEN

Guide: gym-backend \`docs/roster.md\`.`,
  },
  response: [
    example('200 OK — ACTIVE roster', 200, 'OK', { members: [member] }, 'GET', uList),
    example(
      '403 — PLAN_FORBIDDEN',
      403,
      'Forbidden',
      err('PLAN_FORBIDDEN', 'Not allowed to manage membership plans for this gym'),
      'GET',
      uList,
    ),
  ],
});

const uAssigned = url(
  '{{baseUrl}}/gym-orgs/{{gymOrgId}}/my-assigned-members',
  ['gym-orgs', '{{gymOrgId}}', 'my-assigned-members'],
  [
    {
      key: 'status',
      value: 'ACTIVE',
      disabled: true,
      description: 'Optional filter. Values: ACTIVE, INACTIVE. Omit = all.',
    },
    {
      key: 'q',
      value: '',
      disabled: true,
      description: 'Optional search on name / email / phone.',
    },
  ],
);
folder.item.push({
  name: 'List My Assigned Members',
  request: {
    method: 'GET',
    header: ACCEPT_ONLY,
    url: uAssigned,
    description: `GET /gym-orgs/:gymOrgId/my-assigned-members — Trainer (or Admin-as-Trainer) assigned roster.

**Auth:** Bearer with live \`trainer_profiles\` at gym  
**Path:**
- \`gymOrgId\` (uuid) — Gym. Example: \`{{gymOrgId}}\`.

**Query:**
- \`status\` (optional, enum) — Values: \`ACTIVE\`, \`INACTIVE\`. Omit = all statuses.
- \`q\` (optional, string) — Search name / email / phone.

**Success \`200\`:** \`{ members: [ member, ... ] }\` scoped to actor's trainer profile.

${memberFields}

**Errors:** \`403\` ROSTER_FORBIDDEN

Guide: gym-backend \`docs/roster.md\`.`,
  },
  response: [
    example(
      '200 OK — assigned',
      200,
      'OK',
      {
        members: [
          {
            ...member,
            assignedTrainerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          },
        ],
      },
      'GET',
      uAssigned,
    ),
    example(
      '403 — ROSTER_FORBIDDEN',
      403,
      'Forbidden',
      err('ROSTER_FORBIDDEN', 'Not allowed to access gym roster'),
      'GET',
      uAssigned,
    ),
  ],
});

const assignBody = { trainerProfileId: '{{trainerProfileId}}' };
const uAssign = url(
  '{{baseUrl}}/gym-orgs/{{gymOrgId}}/members/{{membershipId}}/assign-trainer',
  ['gym-orgs', '{{gymOrgId}}', 'members', '{{membershipId}}', 'assign-trainer'],
);
folder.item.push({
  name: 'Assign Trainer',
  request: {
    method: 'POST',
    header: HEADERS,
    body: {
      mode: 'raw',
      raw: JSON.stringify(assignBody, null, 2),
      options: { raw: { language: 'json' } },
    },
    url: uAssign,
    description: `POST /gym-orgs/:gymOrgId/members/:membershipId/assign-trainer — Admin assign/reassign.

**Auth:** Bearer ADMIN at gym  
**Path:**
- \`gymOrgId\` (uuid) — Gym.
- \`membershipId\` (uuid) — ACTIVE membership. Example: \`{{membershipId}}\`.

**Request body (JSON):**
- \`trainerProfileId\` (required, uuid) — Live \`trainer_profiles.id\` at this gym (Admin may use self). Example: \`{{trainerProfileId}}\`.

Requires in-date \`TRAINER_COACHING\` ADDON on the membership (payment ignored).

**Success \`200\`:** \`{ membership }\`

${memberFields}

**Errors:** \`404\` membership/trainer · \`422\` COACHING_ADDON_REQUIRED · CLIENT_MEMBERSHIP_INVALID_TRANSITION

Guide: gym-backend \`docs/roster.md\`.`,
  },
  response: [
    example(
      '200 OK — assigned',
      200,
      'OK',
      { membership: membershipMut },
      'POST',
      uAssign,
      assignBody,
    ),
    example(
      '422 — COACHING_ADDON_REQUIRED',
      422,
      'Unprocessable Entity',
      err(
        'COACHING_ADDON_REQUIRED',
        'An in-date TRAINER_COACHING addon is required to assign a trainer',
      ),
      'POST',
      uAssign,
      assignBody,
    ),
  ],
});

const uOffboard = url(
  '{{baseUrl}}/gym-orgs/{{gymOrgId}}/members/{{membershipId}}/offboard',
  ['gym-orgs', '{{gymOrgId}}', 'members', '{{membershipId}}', 'offboard'],
);
folder.item.push({
  name: 'Offboard Member',
  request: {
    method: 'POST',
    header: ACCEPT_ONLY,
    url: uOffboard,
    description: `POST /gym-orgs/:gymOrgId/members/:membershipId/offboard — set INACTIVE + clear all DataGrants.

**Auth:** Bearer ADMIN at gym  
**Path:**
- \`gymOrgId\` (uuid) — Gym.
- \`membershipId\` (uuid) — ACTIVE membership.

Atomic RPC: membership → \`INACTIVE\`, \`left_at\` set; all profile + class grants for (client, gym) soft-deleted. Attendance/subscriptions retained; assigned trainer kept for history.

**Success \`200\`:** \`{ membership }\` with \`status: INACTIVE\`

**Errors:** \`404\` · \`409\` already inactive

Guide: gym-backend \`docs/roster.md\`.`,
  },
  response: [
    example(
      '200 OK — inactive',
      200,
      'OK',
      {
        membership: {
          ...membershipMut,
          status: 'INACTIVE',
          leftAt: '2026-08-11T12:00:00.000Z',
        },
      },
      'POST',
      uOffboard,
    ),
    example(
      '404 — not found',
      404,
      'Not Found',
      err('NOT_FOUND', 'Active membership not found'),
      'POST',
      uOffboard,
    ),
  ],
});

const blockBody = { blocked: true };
const uBlock = url(
  '{{baseUrl}}/gym-orgs/{{gymOrgId}}/members/{{membershipId}}/check-in-block',
  ['gym-orgs', '{{gymOrgId}}', 'members', '{{membershipId}}', 'check-in-block'],
);
folder.item.push({
  name: 'Set Check-in Block',
  request: {
    method: 'PATCH',
    header: HEADERS,
    body: {
      mode: 'raw',
      raw: JSON.stringify(blockBody, null, 2),
      options: { raw: { language: 'json' } },
    },
    url: uBlock,
    description: `PATCH /gym-orgs/:gymOrgId/members/:membershipId/check-in-block — Admin block/unblock check-in.

**Auth:** Bearer ADMIN at gym  
**Path:**
- \`gymOrgId\` (uuid) — Gym.
- \`membershipId\` (uuid) — ACTIVE membership.

**Request body (JSON):**
- \`blocked\` (required, boolean) — \`true\` to block, \`false\` to unblock. Example: \`true\`.

Manual safety valve — not tied to payment. Attendance enforcement is Stint 2.

**Success \`200\`:** \`{ membership }\`

**Errors:** \`404\` · \`422\` inactive membership

Guide: gym-backend \`docs/roster.md\`.`,
  },
  response: [
    example(
      '200 OK — blocked',
      200,
      'OK',
      { membership: { ...membershipMut, checkInBlocked: true } },
      'PATCH',
      uBlock,
      blockBody,
    ),
    example(
      '422 — CLIENT_MEMBERSHIP_INVALID_TRANSITION',
      422,
      'Unprocessable Entity',
      err('CLIENT_MEMBERSHIP_INVALID_TRANSITION', 'Cannot block check-in an inactive membership'),
      'PATCH',
      uBlock,
      blockBody,
    ),
  ],
});

c.item.push(folder);

if (!c.variable.some((v) => v.key === 'trainerProfileId')) {
  c.variable.push({
    key: 'trainerProfileId',
    value: '',
    type: 'default',
    description: 'Live trainer_profiles.id at gym (from DB / Admin self profile)',
  });
}

c.info.description =
  'Gym Backend Express API — Auth, Gym Orgs, Staff Invites, Leads, Plans, Membership Invites + DataGrants, Subscriptions, Roster.\n\nEach request documents **every property** (body / query / response) with types, full enums, and examples. Open **Examples** for concrete JSON.\n\nMarkdown guides in gym-backend: `docs/api.md`, `docs/client-auth.md`, `docs/plans.md`, `docs/membership-invites.md`, `docs/subscriptions.md`, `docs/roster.md`, `docs/leads.md`.\n\nShared error envelope: `{ "error": { "code": string, "message": string } }`\nPagination: `limit` default 20 max 100; `offset` default 0; page `{ items, total, limit, offset }`.';

writeFileSync(collectionPath, `${JSON.stringify(c, null, 2)}\n`);
console.log('Roster folder written with', folder.item.length, 'requests');
